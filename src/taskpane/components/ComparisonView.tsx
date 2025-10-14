// src/taskpane/components/ComparisonView.tsx

import * as React from "react";
import { useState, useEffect } from "react";
import { IChange, IDiffResult, ISummaryResult, ICombinedChange } from "../types/types";
import { Button } from "@fluentui/react-components";
import { showChangesOnSheet, clearChangesFromSheet, setupSelectionListener, removeSelectionListener } from "../services/excel.interaction.service";
import { generateSummary } from "../services/summary.service";
import SelectionDetailViewer from "./SelectionDetailViewer";
import DiffViewer from "./DiffViewer";

/**
 * Helper function to transform the rich ICombinedChange back into the simple IChange
 * that the excel.interaction.service and SelectionDetailViewer expect.
 */
function toSimpleChange(combinedChange: ICombinedChange): IChange {
  return {
    sheet: combinedChange.sheet,
    address: combinedChange.address,
    changeType: combinedChange.changeType,
    // We use the start/end state for the on-sheet comments and selection viewer
    oldValue: combinedChange.startValue,
    newValue: combinedChange.endValue,
    oldFormula: combinedChange.startFormula,
    newFormula: combinedChange.endFormula,
  };
}


interface ComparisonViewProps {
  result: IDiffResult;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ result }) => {
  const [showOnSheet, setShowOnSheet] = useState(false);
  const [selectedChange, setSelectedChange] = useState<IChange | null>(null);
  const [summary, setSummary] = useState<ISummaryResult | null>(null);

  useEffect(() => {
    if (result) {
      const generatedSummary = generateSummary(result);
      setSummary(generatedSummary);
    }
  }, [result]);

  useEffect(() => {
    if (showOnSheet && summary) {
      // Transform the data before passing it to the listener
      const simpleChanges = summary.modifiedCells.map(toSimpleChange);
      setupSelectionListener(simpleChanges, setSelectedChange);
    }
    return () => {
      removeSelectionListener();
    };
  }, [showOnSheet, summary]);

  const handleShowOnSheet = () => {
    if (summary) {
      // Transform the data before passing it to the highlighter
      const simpleChanges = summary.modifiedCells.map(toSimpleChange);
      showChangesOnSheet(simpleChanges);
      setShowOnSheet(true);
    }
  };

  const handleClearFromSheet = () => {
    if (summary) {
      removeSelectionListener();
      // Transform the data before passing it to the clearer
      const simpleChanges = summary.modifiedCells.map(toSimpleChange);
      clearChangesFromSheet(simpleChanges);
      setShowOnSheet(false);
      setSelectedChange(null);
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
        <Button onClick={handleShowOnSheet} disabled={showOnSheet}>Show on Sheet</Button>
        <Button onClick={handleClearFromSheet} disabled={!showOnSheet}>Clear from Sheet</Button>
      </div>
      
      {showOnSheet && <SelectionDetailViewer change={selectedChange} />}
      
      {summary && <DiffViewer summary={summary} />}
    </div>
  );
};

export default ComparisonView;