// src/taskpane/components/ComparisonView.tsx

import * as React from "react";
import { useState, useEffect } from "react";
import { IChange, IDiffResult, ISummaryResult, ICombinedChange } from "../types/types";
import { Button } from "@fluentui/react-components";
import { 
  showChangesOnSheet, 
  clearChangesFromSheet, 
  setupSelectionListener, 
  removeSelectionListener,
  navigateToCell 
} from "../services/excel.interaction.service";
import { generateSummary } from "../services/summary.service";
import SelectionDetailViewer from "./SelectionDetailViewer";
import DiffViewer from "./DiffViewer";
import { useSharedStyles } from "./sharedStyles";

/**
 * Helper function to transform the rich ICombinedChange back into the simple IChange
 * that the excel.interaction.service and SelectionDetailViewer expect.
 */
function toSimpleChange(combinedChange: ICombinedChange): IChange {
  return {
    sheet: combinedChange.sheet,
    address: combinedChange.address,
    changeType: combinedChange.changeType,
    oldValue: combinedChange.startValue,
    newValue: combinedChange.endValue,
    oldFormula: combinedChange.startFormula,
    newFormula: combinedChange.endFormula,
  };
}

interface ComparisonViewProps {
  result: IDiffResult;
}

/**
 * The main view for displaying a comparison result. It orchestrates
 * on-sheet highlighting, selection listening, and navigation, and
 * renders the detailed diff report.
 */
const ComparisonView: React.FC<ComparisonViewProps> = ({ result }) => {
  // Call the shared style hook to get the generated class names.
  const styles = useSharedStyles();
  const [showOnSheet, setShowOnSheet] = useState(false);
  const [selectedChange, setSelectedChange] = useState<IChange | null>(null);
  const [summary, setSummary] = useState<ISummaryResult | null>(null);

  // Effect to generate a human-readable summary whenever a new diff result is provided.
  useEffect(() => {
    if (result) {
      const generatedSummary = generateSummary(result);
      setSummary(generatedSummary);
    }
  }, [result]);

  // Effect to manage the Excel grid selection listener.
  useEffect(() => {
    if (showOnSheet && summary) {
      const simpleChanges = summary.modifiedCells.map(toSimpleChange);
      setupSelectionListener(simpleChanges, setSelectedChange);
    }
    return () => {
      removeSelectionListener();
    };
  }, [showOnSheet, summary]);

  /**
   * Handles the "Show on Sheet" button click, highlighting all changes.
   */
  const handleShowOnSheet = () => {
    if (summary) {
      const simpleChanges = summary.modifiedCells.map(toSimpleChange);
      showChangesOnSheet(simpleChanges);
      setShowOnSheet(true);
    }
  };

  /**
   * Handles the "Clear from Sheet" button click, removing all highlights.
   */
  const handleClearFromSheet = () => {
    if (summary) {
      removeSelectionListener();
      const simpleChanges = summary.modifiedCells.map(toSimpleChange);
      clearChangesFromSheet(simpleChanges);
      setShowOnSheet(false);
      setSelectedChange(null);
    }
  };

  /**
   * Handles the navigation event when a user clicks a cell in the diff report.
   */
  const handleNavigate = (sheet: string, address: string) => {
    try {
      navigateToCell(sheet, address);
    } catch (error) {
      console.error("Failed to navigate:", error);
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <div className={styles.buttonGroup}>
        <Button onClick={handleShowOnSheet} disabled={showOnSheet}>Show on Sheet</Button>
        <Button onClick={handleClearFromSheet} disabled={!showOnSheet}>Clear from Sheet</Button>
      </div>
      
      {showOnSheet && <SelectionDetailViewer change={selectedChange} />}
      
      {summary && <DiffViewer summary={summary} onNavigate={handleNavigate} />}
    </div>
  );
};

export default ComparisonView;