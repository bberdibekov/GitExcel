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
import DiffFilterOptions from "./DiffFilterOptions";
import LockOverlay from './paywall/LockOverlay';

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
  activeFilters: Set<string>;
  onFilterChange: (filterId: string) => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ result, activeFilters, onFilterChange }) => {
  const styles = useSharedStyles();
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
      const simpleChanges = summary.modifiedCells.map(toSimpleChange);
      setupSelectionListener(simpleChanges, setSelectedChange);
    }
    return () => {
      removeSelectionListener();
    };
  }, [showOnSheet, summary]);


  // ... (handleShowOnSheet, handleClearFromSheet, handleNavigate are unchanged) ...
    const handleShowOnSheet = () => {
    if (summary) {
      const simpleChanges = summary.modifiedCells.map(toSimpleChange);
      showChangesOnSheet(simpleChanges);
      setShowOnSheet(true);
    }
  };

  const handleClearFromSheet = () => {
    if (summary) {
      removeSelectionListener();
      const simpleChanges = summary.modifiedCells.map(toSimpleChange);
      clearChangesFromSheet(simpleChanges);
      setShowOnSheet(false);
      setSelectedChange(null);
    }
  };

  const handleNavigate = (sheet: string, address: string) => {
    try {
      navigateToCell(sheet, address);
    } catch (error) {
      console.error("Failed to navigate:", error);
    }
  };

  // 2. Prepare dynamic props for the LockOverlay.
  const isPartialResult = result.isPartialResult ?? false;
  const hiddenChangeCount = result.hiddenChangeCount ?? 0;
  const visibleChangeCount = result.modifiedCells.length;

  return (
    <div style={{ marginTop: "20px" }}>
      <DiffFilterOptions 
        activeFilters={activeFilters}
        onFilterChange={onFilterChange}
      />
      
      <div className={styles.buttonGroup}>
        <Button onClick={handleShowOnSheet} disabled={showOnSheet}>Show on Sheet</Button>
        <Button onClick={handleClearFromSheet} disabled={!showOnSheet}>Clear from Sheet</Button>
      </div>
      
      {showOnSheet && <SelectionDetailViewer change={selectedChange} />}
      
      {/* 3. Wrap the results viewer in a relative container and conditionally render the LockOverlay. */}
      <div style={{ position: 'relative' }}>
        {summary && <DiffViewer summary={summary} onNavigate={handleNavigate} />}

        {isPartialResult && (
          <LockOverlay 
            title="Unlock Full Comparison"
            message={`Showing ${visibleChangeCount} of ${visibleChangeCount + hiddenChangeCount} changes. Upgrade to Pro to see all results.`}
            onUpgradeClick={() => {
              // In a real app, this would open a subscription page.
              console.log("Upgrade action triggered!"); 
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ComparisonView;