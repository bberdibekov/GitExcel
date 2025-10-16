// src/taskpane/components/comparison_dialog/ComparisonReport.tsx

import * as React from "react";
import { ISummaryResult } from "../../types/types";
import { useSharedStyles } from "../sharedStyles";
import ComparisonRow from "./ComparisonRow";

/**
 * Defines the props required by the ComparisonReport component.
 * It needs the data to display, the current selection state, and callback
 * functions to handle user interactions like selection and navigation.
 */
interface ComparisonReportProps {
  summary: ISummaryResult | null;
  selectedChanges: Set<string>;
  onSelectionChange: (changeId: string, isSelected: boolean) => void;
  onNavigate: (sheet: string, address: string) => void;
}

/**
 * The main component responsible for rendering the entire diff report,
 * broken down into sections for modified cells, added rows, and deleted rows.
 * It acts as a list manager, delegating the rendering of each individual
 * change to the ComparisonRow component.
 */
const ComparisonReport: React.FC<ComparisonReportProps> = (props) => {
  const { summary, selectedChanges, onSelectionChange, onNavigate } = props;
  const styles = useSharedStyles();

  // Gracefully handle the case where the summary data is not yet available.
  if (!summary) {
    return <p style={{ padding: '0 16px' }}>Loading comparison...</p>;
  }

  const totalChanges =
    summary.modifiedCells.length +
    summary.addedRows.length +
    summary.deletedRows.length +
    summary.highLevelChanges.length;

  // Display a message if no differences were found.
  if (totalChanges === 0) {
    return <p style={{ padding: '0 16px' }}>No differences found between these versions.</p>;
  }

  return (
    <div style={{ marginTop: "10px", padding: '0 8px' }}>
      {/* Section for Modified Cells */}
      {summary.modifiedCells.length > 0 && (
        <>
          <h5>Modified Cells ({summary.modifiedCells.length})</h5>
          <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
            {summary.modifiedCells.map((change) => {
              // Create a unique, stable ID for each change to manage its selection state.
              const changeId = `${change.sheet}!${change.address}`;
              return (
                <ComparisonRow
                  key={changeId}
                  changeId={changeId}
                  change={change}
                  // Pass the selection state and event handlers down to the row component.
                  isSelected={selectedChanges.has(changeId)}
                  onSelectionChange={onSelectionChange}
                  onNavigate={onNavigate}
                />
              );
            })}
          </ul>
        </>
      )}

      {/* Section for Added Rows */}
      {summary.addedRows.length > 0 && (
        <>
          <h5 style={{ marginTop: "16px" }}>Added Rows ({summary.addedRows.length})</h5>
          <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
            {summary.addedRows.map((rowChange, index) => (
              <li key={`add-${index}`} className={`${styles.listItem} ${styles.listItem_added}`}>
                <strong>{rowChange.sheet}!{rowChange.rowIndex + 1}</strong>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Section for Deleted Rows */}
      {summary.deletedRows.length > 0 && (
        <>
          <h5 style={{ marginTop: "16px" }}>Deleted Rows ({summary.deletedRows.length})</h5>
          <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
            {summary.deletedRows.map((rowChange, index) => (
              <li key={`del-${index}`} className={`${styles.listItem} ${styles.listItem_deleted}`}>
                <strong>{rowChange.sheet}!{rowChange.rowIndex + 1}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default ComparisonReport;