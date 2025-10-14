// src/taskpane/components/CellChangeView.tsx

import * as React from "react";
import { useState } from "react";
import { ICombinedChange, IChange } from "../types/types";

// This helper function remains unchanged.
const renderChangeDetails = (change: {
  changeType: 'value' | 'formula' | 'both',
  oldValue: any, newValue: any,
  oldFormula: any, newFormula: any
}) => {
  const showValue = change.changeType === 'value' || change.changeType === 'both';
  const showFormula = change.changeType === 'formula' || change.changeType === 'both';
  const valueExists = (val: any) => val !== "" && val !== undefined && val !== null;

  return (
    <>
      {showValue && (
        <div>
          <strong>Value:</strong><br />
          {valueExists(change.oldValue) && <><span style={{ color: "red" }}>- {String(change.oldValue)}</span><br /></>}
          {valueExists(change.newValue) && <span style={{ color: "green" }}>+ {String(change.newValue)}</span>}
        </div>
      )}
      {showFormula && (
        <div style={{ marginTop: showValue ? '5px' : '0' }}>
          <strong>Formula:</strong><br />
          {valueExists(change.oldFormula) && <><span style={{ color: "red", fontFamily: "monospace" }}>- {String(change.oldFormula)}</span><br /></>}
          {valueExists(change.newFormula) && <span style={{ color: "green", fontFamily: "monospace" }}>+ {String(change.newFormula)}</span>}
        </div>
      )}
    </>
  );
};

interface CellChangeViewProps {
  change: ICombinedChange;
}

const CellChangeView: React.FC<CellChangeViewProps> = ({ change }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // An item is only expandable if there is an intermediate history.
  // If history has 1 or 0 items, the summary view already shows all available information.
  const isExpandable = change.history.length > 1;

  return (
    <li style={{ background: "#f5f5f5", padding: "8px", marginBottom: "5px", borderLeft: "3px solid #f0ad4e" }}>
      {/* --- Header & Summary View --- */}
      <div 
        style={{ display: "flex", alignItems: "center", cursor: isExpandable ? "pointer" : "default" }} 
        // Only attach the click handler if it's expandable
        onClick={isExpandable ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <span style={{ 
          marginRight: "8px", 
          fontFamily: "monospace", 
          color: "#0078d4", 
          userSelect: "none",
          // The expand icon is a fixed width but invisible if not expandable,
          // which keeps all cell titles perfectly aligned.
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

      {/* --- Expanded History View --- */}
      {/* This logic remains the same. It will only render if isExpanded can be set to true, 
          which only happens for expandable items. */}
      {isExpanded && (
        <div style={{ marginTop: '10px', marginLeft: '15px', paddingLeft: '15px', borderLeft: '2px solid #ccc' }}>
          <strong style={{ fontSize: '12px', color: '#666' }}>Change History:</strong>
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