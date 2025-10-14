// src/taskpane/components/ComparisonView.tsx

import * as React from "react";
import { useState, useEffect } from "react";
import { IChange, IDiffResult, ISummaryResult } from "../types/types";
import { Button } from "@fluentui/react-components";
import { showChangesOnSheet, clearChangesFromSheet, setupSelectionListener, removeSelectionListener } from "../services/excel.interaction.service";
import { generateSummary } from "../services/summary.service";
import SelectionDetailViewer from "./SelectionDetailViewer";
import DiffViewer from "./DiffViewer";

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

  // This effect hook manages the event listeners. It now depends on the summary.
  useEffect(() => {
    // CRITICAL FIX: The selection listener must know about the FILTERED list of cells.
    if (showOnSheet && summary) {
      setupSelectionListener(summary.modifiedCells, setSelectedChange);
    }
    return () => {
      removeSelectionListener();
    };
  }, [showOnSheet, summary]); // Dependency changed from 'result' to 'summary'

  const handleShowOnSheet = () => {
    // CRITICAL FIX: Use the filtered list from the summary to highlight cells.
    if (summary) {
      showChangesOnSheet(summary.modifiedCells);
      setShowOnSheet(true);
    }
  };

  const handleClearFromSheet = () => {
    // CRITICAL FIX: Use the filtered list from the summary to clear cells.
    if (summary) {
      removeSelectionListener();
      clearChangesFromSheet(summary.modifiedCells);
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