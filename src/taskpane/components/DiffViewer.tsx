// src/taskpane/components/DiffViewer.tsx

import * as React from "react";
import { IChange, ISummaryResult } from "../types/types";
import CellChangeView from "./CellChangeView";
import { Calculator16Filled, NumberSymbol16Filled } from "@fluentui/react-icons";
import { useSharedStyles } from "./sharedStyles";

interface DiffViewerProps {
  summary: ISummaryResult;
}

/**
 * The main component responsible for rendering the entire diff report,
 * broken down into sections for high-level summaries, modified cells,
 * added rows, and deleted rows. It uses a shared style hook for a
 * consistent and maintainable look and feel.
 */
const DiffViewer: React.FC<DiffViewerProps> = ({ summary }) => {
  // Call the shared style hook to get the generated class names.
  const styles = useSharedStyles();

  /**
   * Renders details for a simple IChange object. This is now defined inside
   * the component so it has access to the `styles` object from the hook's closure.
   */
  const renderLegacyChangeDetails = (change: IChange) => {
    const showValue = change.changeType === 'value' || change.changeType === 'both';
    const showFormula = change.changeType === 'formula' || change.changeType === 'both';
    const valueExists = (val: any) => val !== "" && val !== undefined && val !== null;

    return (
      <>
        {showValue && (
          <div style={{ display: "flex", alignItems: "flex-start", marginTop: "4px" }}>
            <NumberSymbol16Filled className={styles.icon} />
            <div>
              {valueExists(change.oldValue) && <><span style={{ color: "red" }}>- {String(change.oldValue)}</span><br /></>}
              {valueExists(change.newValue) && <span style={{ color: "green" }}>+ {String(change.newValue)}</span>}
            </div>
          </div>
        )}
        {showFormula && (
          <div style={{ display: "flex", alignItems: "flex-start", marginTop: "4px" }}>
            <Calculator16Filled className={styles.icon} />
            <div>
              {valueExists(change.oldFormula) && <><span style={{ color: "red", fontFamily: "monospace" }}>- {String(change.oldFormula)}</span><br /></>}
              {valueExists(change.newFormula) && <span style={{ color: "green", fontFamily: "monospace" }}>+ {String(change.newFormula)}</span>}
            </div>
          </div>
        )}
      </>
    );
  };

  const totalChanges = summary.highLevelChanges.length + summary.modifiedCells.length + summary.addedRows.length + summary.deletedRows.length;

  return (
    <div style={{ marginTop: "10px" }}>
      <h4>All Changes ({totalChanges})</h4>
      
      {totalChanges === 0 ? <p>No differences found.</p> :
        <div>
          {/* Section for High-Level Summary */}
          {summary.highLevelChanges.length > 0 && (
            <>
              <h5>Summary</h5>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {summary.highLevelChanges.map((change, index) => (
                  <li
                    key={`summary-${index}`}
                    className={`${styles.listItem} ${styles.listItem_summary}`}
                  >
                    <strong>{change.sheet}!</strong> {change.description}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Section for Modified Cells (Delegates to CellChangeView) */}
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

          {/* Section for Added Rows */}
          {summary.addedRows.length > 0 && (
            <>
              <h5>Added Rows ({summary.addedRows.length})</h5>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {summary.addedRows.map((rowChange, index) => (
                  <li
                    key={`add-${index}`}
                    className={`${styles.listItem} ${styles.listItem_added}`}
                  >
                    <strong>{rowChange.sheet}!{rowChange.rowIndex + 1}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Section for Deleted Rows */}
          {summary.deletedRows.length > 0 && (
            <>
              <h5>Deleted Rows ({summary.deletedRows.length})</h5>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {summary.deletedRows.map((rowChange, index) => (
                  <li
                    key={`del-${index}`}
                    className={`${styles.listItem} ${styles.listItem_deleted}`}
                  >
                    <strong>{rowChange.sheet}!{rowChange.rowIndex + 1}</strong>
                    
                    {rowChange.containedChanges && rowChange.containedChanges.length > 0 && (
                      <div className={`${styles.detailBlock} ${styles.detailBlock_deleted}`}>
                        <strong className={styles.detailBlock_title}>Changes within this row before deletion:</strong>
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