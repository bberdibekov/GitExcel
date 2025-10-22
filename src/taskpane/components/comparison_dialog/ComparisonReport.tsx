// src/taskpane/components/comparison_dialog/ComparisonReport.tsx

import * as React from "react";
import { ISummaryResult } from "../../types/types";
import { useSharedStyles } from "../sharedStyles";
import ComparisonRow from "./ComparisonRow";

interface ComparisonReportProps {
  summary: ISummaryResult | null;
  selectedChanges: Set<string>;
  onSelectionChange: (changeId: string, isSelected: boolean) => void;
  onNavigate: (sheet: string, address: string) => void;
}

/**
 * [REFACTORED] Renders the entire diff report, including a static header
 * and the list of modified/added/deleted items. It acts as a list manager,
 * delegating the rendering of each individual change to the ComparisonRow component.
 */
const ComparisonReport: React.FC<ComparisonReportProps> = (props) => {
  const { summary, selectedChanges, onSelectionChange, onNavigate } = props;
  const styles = useSharedStyles();

  if (!summary) {
    return <p style={{ padding: '0 16px' }}>Loading comparison...</p>;
  }

  // --- MODIFIED (BUGFIX): Calculate total changes based on the new authoritative sources.
  const totalChanges =
    summary.modifiedCells.length +
    summary.highLevelChanges.length;

  if (totalChanges === 0) {
    return <p style={{ padding: '0 16px' }}>No differences found between these versions.</p>;
  }

  return (
    <div style={{ marginTop: "10px", padding: '0 8px' }}>
      {/* Section for Modified Cells (Unchanged) */}
      {summary.modifiedCells.length > 0 && (
        <section>
          <h5>Modified Cells ({summary.modifiedCells.length})</h5>

          <div className={styles.comparisonHeader}>
            <div className={styles.columnCheckbox}></div>
            <div className={styles.columnSheet}>Sheet</div>
            <div className={styles.columnCell}>Cell</div>
            <div className={styles.columnValue}>Δ Value / Formula</div>
            <div className={styles.columnAction}>Diff</div>
          </div>
          
          <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
            {summary.modifiedCells.map((change) => {
              const changeId = `${change.sheet}!${change.address}`;
              return (
                <ComparisonRow
                  key={changeId}
                  changeId={changeId}
                  change={change}
                  isSelected={selectedChanges.has(changeId)}
                  onSelectionChange={onSelectionChange}
                  onNavigate={onNavigate}
                />
              );
            })}
          </ul>
        </section>
      )}

      {/* --- REFACTORED: Single section for all high-level structural changes --- */}
      {summary.highLevelChanges.length > 0 && (
        <section style={{ marginTop: "16px" }}>
          <h5>Structural Changes ({summary.highLevelChanges.length})</h5>
          <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
            {summary.highLevelChanges.map((change, index) => {
                // Determine the correct styling based on the change description
                const isAdded = change.description.toLowerCase().includes("added");
                const isDeleted = change.description.toLowerCase().includes("deleted");
                const itemStyle = isAdded 
                    ? `${styles.listItem} ${styles.listItem_added}`
                    : isDeleted 
                    ? `${styles.listItem} ${styles.listItem_deleted}`
                    : styles.listItem;

                return (
                    <li key={`hlc-${index}`} className={itemStyle}>
                        <strong>{change.sheet}!</strong> {change.description}
                    </li>
                );
            })}
          </ul>
        </section>
      )}

      {/* --- REMOVED: Redundant sections for Added Rows and Deleted Rows --- */}

    </div>
  );
};

export default ComparisonReport;