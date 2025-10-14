// src/taskpane/components/DiffViewer.tsx

import * as React from "react";
import { IChange, ISummaryResult } from "../types/types";
import CellChangeView from "./CellChangeView";

interface DiffViewerProps {
  summary: ISummaryResult;
}

// UPDATED: This helper gets the same intelligent rendering logic for consistency.
const renderLegacyChangeDetails = (change: IChange) => {
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

const DiffViewer: React.FC<DiffViewerProps> = ({ summary }) => {
  const totalChanges = summary.highLevelChanges.length + summary.modifiedCells.length + summary.addedRows.length + summary.deletedRows.length;

  return (
    <div style={{ marginTop: "10px" }}>
      <h4>All Changes ({totalChanges})</h4>
      
      {totalChanges === 0 ? <p>No differences found.</p> :
        <div>
          {summary.highLevelChanges.length > 0 && (
            <>
              <h5>Summary</h5>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {summary.highLevelChanges.map((change, index) => (
                  <li
                    key={`summary-${index}`}
                    style={{ background: "#e5f1fb", padding: "8px", marginBottom: "5px", borderLeft: "3px solid #0078d4" }}
                  >
                    <strong>{change.sheet}!</strong> {change.description}
                  </li>
                ))}
              </ul>
            </>
          )}

          {summary.modifiedCells.length > 0 && (
            <>
              <h5>Modified Cells ({summary.modifiedCells.length})</h5>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {summary.modifiedCells.map((change, index) => (
                  <CellChangeView key={index} change={change} />
                ))}
              </ul>
            </>
          )}

          {summary.addedRows.length > 0 && (
            <>
              <h5>Added Rows ({summary.addedRows.length})</h5>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {summary.addedRows.map((rowChange, index) => (
                  <li
                    key={`add-${index}`}
                    style={{ background: "#dff0d8", padding: "8px", marginBottom: "5px", borderLeft: "3px solid #5cb85c" }}
                  >
                    <strong>{rowChange.sheet}!{rowChange.rowIndex + 1}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}

          {summary.deletedRows.length > 0 && (
            <>
              <h5>Deleted Rows ({summary.deletedRows.length})</h5>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {summary.deletedRows.map((rowChange, index) => (
                  <li
                    key={`del-${index}`}
                    style={{ background: "#f2dede", padding: "8px", marginBottom: "5px", borderLeft: "3px solid #d9534f" }}
                  >
                    <strong>{rowChange.sheet}!{rowChange.rowIndex + 1}</strong>
                    
                    {rowChange.containedChanges && rowChange.containedChanges.length > 0 && (
                      <div style={{ marginTop: '8px', paddingLeft: '15px', borderLeft: '2px solid #b92c28', marginLeft: '5px' }}>
                        <strong style={{fontSize: '12px', color: '#a94442'}}>Changes within this row before deletion:</strong>
                        {rowChange.containedChanges.map((change, cIndex) => (
                          <div key={`contained-${cIndex}`} style={{paddingTop: '5px'}}>
                            <strong>{change.address}:</strong>
                            {renderLegacyChangeDetails(change)}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      }
    </div>
  );
};

export default DiffViewer;