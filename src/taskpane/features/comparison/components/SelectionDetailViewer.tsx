// src/taskpane/components/SelectionDetailViewer.tsx

import * as React from "react";
import { IChange } from "../../../types/types";
import { Calculator16Filled, NumberSymbol16Filled } from "@fluentui/react-icons";

interface SelectionDetailViewerProps {
  change: IChange | null;
}

/**
 * Renders the details of a change (old vs. new) in a compact, icon-driven format.
 * This is used for the pop-up view when a user selects a highlighted cell on the sheet.
 */
const renderChangeDetails = (change: IChange) => {
  const showValue = change.changeType === 'value' || change.changeType === 'both';
  const showFormula = change.changeType === 'formula' || change.changeType === 'both';
  const valueExists = (val: any) => val !== "" && val !== undefined && val !== null;

  const iconStyle = { color: "#b4b4b4ff", marginRight: "8px", flexShrink: 0, marginTop: "2px" };

  return (
    <>
      {showValue && (
        <div style={{ display: "flex", alignItems: "flex-start", marginTop: "4px" }}>
          <NumberSymbol16Filled style={iconStyle} />
          <div>
            {valueExists(change.oldValue) && <><span style={{ color: "red" }}>- {String(change.oldValue)}</span><br /></>}
            {valueExists(change.newValue) && <span style={{ color: "green" }}>+ {String(change.newValue)}</span>}
          </div>
        </div>
      )}
      {showFormula && (
        <div style={{ display: "flex", alignItems: "flex-start", marginTop: "4px" }}>
          <Calculator16Filled style={iconStyle} />
          <div>
            {valueExists(change.oldFormula) && <><span style={{ color: "red", fontFamily: "monospace" }}>- {String(change.oldFormula)}</span><br /></>}
            {valueExists(change.newFormula) && <span style={{ color: "green", fontFamily: "monospace" }}>+ {String(change.newFormula)}</span>}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * A component that displays the details of a selected cell.
 * When a user clicks on a highlighted cell in the Excel grid, this component
 * shows the before-and-after values and formulas for that specific cell.
 */
const SelectionDetailViewer: React.FC<SelectionDetailViewerProps> = ({ change }) => {
  // Renders a placeholder message if no cell is currently selected.
  if (!change) {
    return (
      <div style={{ padding: "10px", border: "1px solid #ddd", background: "#f9f9f9", marginBottom: "15px" }}>
        <p style={{ margin: 0, fontStyle: "italic", color: "#666" }}>
          Select a highlighted cell on the sheet to see its details here.
        </p>
      </div>
    );
  }

  // Renders the detailed view for the selected cell.
  return (
    <div style={{ padding: "10px", border: "1px solid #0078d4", background: "#e5f1fb", marginBottom: "15px" }}>
      <h4>Details for {change.sheet}!{change.address}</h4>
      {renderChangeDetails(change)}
    </div>
  );
};

export default SelectionDetailViewer;