// src/taskpane/components/DiffViewer.tsx

import * as React from "react";
import { IChange, ISummaryResult } from "../../../types/types";
import CellChangeView from "./CellChangeView";
import { Calculator16Filled, NumberSymbol16Filled } from "@fluentui/react-icons";
import { useSharedStyles } from "../../../shared/styles/sharedStyles";

interface DiffViewerProps {
  summary: ISummaryResult;
  // A prop to handle the navigation event, passed down from the parent.
  onNavigate: (sheet: string, address: string) => void;
}

/**
 * The main component responsible for rendering the entire diff report,
 * broken down into sections for high-level summaries, modified cells,
 * added rows, and deleted rows. It uses a shared style hook for a
 * consistent and maintainable look and feel.
 */
const DiffViewer: React.FC<DiffViewerProps> = ({ summary, onNavigate }) => {
  // Call the shared style hook to get the generated class names.
  const styles = useSharedStyles();

  /**
   * Renders details for a simple IChange object. This is used specifically
   * for displaying the history of cells that existed within rows that were
   * ultimately deleted. It maintains a consistent icon-driven UI.
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

  // --- Calculate total based on the new authoritative structure.
  const totalChanges = summary.highLevelChanges.length + summary.modifiedCells.length;

  return (
    <div style={{ marginTop: "10px" }}>
      <h4>All Changes ({totalChanges})</h4>
      
      {totalChanges === 0 ? <p>No differences found.</p> :
        <div>
          {summary.highLevelChanges.length > 0 && (
            <>
              <h5>Structural Changes ({summary.highLevelChanges.length})</h5>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {summary.highLevelChanges.map((change, index) => {
                  const isDeleted = change.description.toLowerCase().includes("deleted");
                  const itemStyle = isDeleted 
                      ? `${styles.listItem} ${styles.listItem_deleted}`
                      : `${styles.listItem} ${styles.listItem_added}`;
                      
                  return (
                    <li key={`hlc-${index}`} className={itemStyle}>
                      <strong>{change.sheet}!</strong> {change.description}

                      {isDeleted && change.involvedRows?.map((rowChange, rIndex) => (
                        rowChange.containedChanges && rowChange.containedChanges.length > 0 && (
                          <div key={`row-detail-${rIndex}`} className={`${styles.detailBlock} ${styles.detailBlock_deleted}`}>
                            <strong className={styles.detailBlock_title}>Changes within this row before deletion:</strong>
                            {rowChange.containedChanges.map((contained, cIndex) => (
                              <div key={`contained-${cIndex}`} style={{paddingTop: '5px'}}>
                                <strong>{contained.address}:</strong>
                                {renderLegacyChangeDetails(contained)}
                              </div>
                            ))}
                          </div>
                        )
                      ))}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Section for Modified Cells (Delegates to CellChangeView) */}
          {summary.modifiedCells.length > 0 && (
            <>
              <h5>Modified Cells ({summary.modifiedCells.length})</h5>
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {summary.modifiedCells.map((change, index) => (
                  <CellChangeView 
                    key={index} 
                    change={change} 
                    onNavigate={onNavigate} 
                  />
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