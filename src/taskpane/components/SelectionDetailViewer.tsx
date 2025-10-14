// src/taskpane/components/SelectionDetailViewer.tsx

import * as React from "react";
import { IChange } from "../types/types";

interface SelectionDetailViewerProps {
  change: IChange | null;
}

// This helper function renders the old vs. new details.
// It's included here to make the component self-contained.
const renderChangeDetails = (change: IChange) => {
  const showValue = change.changeType === 'value' || change.changeType === 'both';
  const showFormula = change.changeType === 'formula' || change.changeType === 'both';

  return (
    <>
      {showValue && (
        <div>
          <strong>Value:</strong><br />
          <span style={{ color: "red" }}>- {String(change.oldValue)}</span><br />
          <span style={{ color: "green" }}>+ {String(change.newValue)}</span>
        </div>
      )}
      {showFormula && (
        <div style={{ marginTop: showValue ? '5px' : '0' }}>
          <strong>Formula:</strong><br />
          <span style={{ color: "red", fontFamily: "monospace" }}>- {String(change.oldFormula)}</span><br />
          <span style={{ color: "green", fontFamily: "monospace" }}>+ {String(change.newFormula)}</span>
        </div>
      )}
    </>
  );
};

const SelectionDetailViewer: React.FC<SelectionDetailViewerProps> = ({ change }) => {
  if (!change) {
    return (
      <div style={{ padding: "10px", border: "1px solid #ddd", background: "#f9f9f9", marginBottom: "15px" }}>
        <p style={{ margin: 0, fontStyle: "italic", color: "#666" }}>
          Select a highlighted cell on the sheet to see its details here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "10px", border: "1px solid #0078d4", background: "#e5f1fb", marginBottom: "15px" }}>
      <h4>Details for {change.sheet}!{change.address}</h4>
      {renderChangeDetails(change)}
    </div>
  );
};

export default SelectionDetailViewer;