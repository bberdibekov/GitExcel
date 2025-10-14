// src/taskpane/components/CellChangeView.tsx

import * as React from "react";
import { useState } from "react";
import { ICombinedChange, IChange } from "../types/types";
import { Calculator16Filled, NumberSymbol16Filled } from "@fluentui/react-icons";
import { useSharedStyles } from "./sharedStyles";

interface CellChangeViewProps {
  change: ICombinedChange;
}

/**
 * A self-contained component to display a single cell's modification.
 * It manages its own expanded/collapsed state to show a summary view by default
 * and a detailed step-by-step history on demand.
 */
const CellChangeView: React.FC<CellChangeViewProps> = ({ change }) => {
  // Call the shared style hook to get the generated class names.
  const styles = useSharedStyles();
  const [isExpanded, setIsExpanded] = useState(false);

  // An item is only expandable if there is an intermediate history.
  const isExpandable = change.history.length > 1;

  /**
   * Renders the details of a change (old vs. new) in a compact, icon-driven format.
   * Defined inside the component to have access to the `styles` hook's closure.
   */
  const renderChangeDetails = (details: {
    changeType: 'value' | 'formula' | 'both',
    oldValue: any, newValue: any,
    oldFormula: any, newFormula: any
  }) => {
    const showValue = details.changeType === 'value' || details.changeType === 'both';
    const showFormula = details.changeType === 'formula' || details.changeType === 'both';
    const valueExists = (val: any) => val !== "" && val !== undefined && val !== null;

    return (
      <>
        {showValue && (
          <div style={{ display: "flex", alignItems: "flex-start", marginTop: "4px" }}>
            <NumberSymbol16Filled className={styles.icon} />
            <div>
              {valueExists(details.oldValue) && <><span style={{ color: "red" }}>- {String(details.oldValue)}</span><br /></>}
              {valueExists(details.newValue) && <span style={{ color: "green" }}>+ {String(details.newValue)}</span>}
            </div>
          </div>
        )}
        {showFormula && (
          <div style={{ display: "flex", alignItems: "flex-start", marginTop: "4px" }}>
            <Calculator16Filled className={styles.icon} />
            <div>
              {valueExists(details.oldFormula) && <><span style={{ color: "red", fontFamily: "monospace" }}>- {String(details.oldFormula)}</span><br /></>}
              {valueExists(details.newFormula) && <span style={{ color: "green", fontFamily: "monospace" }}>+ {String(details.newFormula)}</span>}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    // Use the shared styles for the list item container
    <li className={`${styles.listItem} ${styles.listItem_modified}`}>
      <div 
        style={{ display: "flex", alignItems: "center", cursor: isExpandable ? "pointer" : "default" }} 
        onClick={isExpandable ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <span style={{ 
          marginRight: "8px", 
          fontFamily: "monospace", 
          color: "#0078d4", 
          userSelect: "none",
          visibility: isExpandable ? "visible" : "hidden"
        }}>
          {isExpanded ? "[-]" : "[+]"}
        </span>
        <strong>{change.sheet}!{change.address}</strong>
      </div>

      <div style={{ paddingLeft: "28px" }}>
        {renderChangeDetails({
          changeType: change.changeType,
          oldValue: change.startValue,
          newValue: change.endValue,
          oldFormula: change.startFormula,
          newFormula: change.endFormula,
        })}
      </div>

      {isExpanded && (
        <div className={styles.detailBlock}>
          <strong className={styles.detailBlock_title}>Change History:</strong>
          {change.history.map((step, index) => (
            <div key={index} style={{ paddingTop: '8px', borderTop: index > 0 ? '1px dashed #ddd' : 'none', marginTop: '5px' }}>
              {renderChangeDetails(step)}
            </div>
          ))}
        </div>
      )}
    </li>
  );
};

export default CellChangeView;