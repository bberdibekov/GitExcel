// src/taskpane/components/CellChangeView.tsx

import * as React from "react";
import { useState } from "react";
import { ICombinedChange, IChange } from "../../../types/types";
import { Calculator16Filled, NumberSymbol16Filled } from "@fluentui/react-icons";
import { useSharedStyles } from '../../../shared/styles/sharedStyles';

interface CellChangeViewProps {
  change: ICombinedChange;
  // A prop to handle the navigation event, passed down from the parent.
  onNavigate: (sheet: string, address: string) => void;
}

/**
 * A self-contained component to display a single cell's modification.
 * It manages its own expanded/collapsed state and handles both navigation
 * and history expansion clicks.
 */
const CellChangeView: React.FC<CellChangeViewProps> = ({ change, onNavigate }) => {
  const styles = useSharedStyles();
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandable = change.history.length > 1;

  /**
   * Renders the details of a change (old vs. new) in a compact, icon-driven format.
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
    <li
      className={`${styles.listItem} ${styles.listItem_modified}`}
      // The entire list item is clickable for navigation.
      onClick={() => onNavigate(change.sheet, change.address)}
      style={{ cursor: 'pointer' }}
    >
      <div 
        style={{ display: "flex", alignItems: "center" }}
        // If the item is expandable, we attach a separate onClick here.
        onClick={(e) => {
          if (isExpandable) {
            // This is critical: it prevents the parent li's onClick (navigation)
            // from firing when the user only intended to expand/collapse.
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <span style={{ 
          marginRight: "8px", 
          fontFamily: "monospace", 
          color: "#0078d4", 
          userSelect: "none",
          visibility: isExpandable ? "visible" : "hidden",
          // The cursor on the expander should also be a pointer if it's clickable.
          cursor: isExpandable ? "pointer" : "default"
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