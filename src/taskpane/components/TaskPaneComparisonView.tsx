// src/taskpane/components/TaskPaneComparisonView.tsx

import * as React from "react";
import { useState, useEffect } from "react";
import { IChange, IDiffResult, ISummaryResult, ICombinedChange } from "../types/types";
import { Button, Spinner } from "@fluentui/react-components";
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
import { crossWindowMessageBus } from "../services/dialog/CrossWindowMessageBus";
import { MessageType } from "../types/messaging.types";

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

interface TaskPaneComparisonViewProps {
  result: IDiffResult | null;
  activeFilters: Set<string>;
  onFilterChange: (filterId: string) => void;
  onOpenInWindow: (result: IDiffResult) => void;
}

const TaskPaneComparisonView: React.FC<TaskPaneComparisonViewProps> = ({ result, activeFilters, onFilterChange, onOpenInWindow }) => {
  if (!result) {
    return <Spinner label="Loading comparison data..." />;
  }

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
      
      const selectionCallback = (change: IChange | null) => {
          setSelectedChange(change);
          if (change) {
              crossWindowMessageBus.broadcast({
                  type: MessageType.GRID_SELECTION_CHANGED,
                  payload: { sheet: change.sheet, address: change.address }
              });
          }
      };
      
      setupSelectionListener(simpleChanges, selectionCallback);
    }
    return () => {
      removeSelectionListener();
    };
  }, [showOnSheet, summary]);

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

  const handleViewInWindow = () => {
    onOpenInWindow(result);
  };

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
        <Button onClick={handleViewInWindow}>View in Window</Button>
        <Button onClick={handleShowOnSheet} disabled={showOnSheet}>Show on Sheet</Button>
        <Button onClick={handleClearFromSheet} disabled={!showOnSheet}>Clear from Sheet</Button>
      </div>
      
      {showOnSheet && <SelectionDetailViewer change={selectedChange} />}
      
      <div style={{ position: 'relative' }}>
        {summary && <DiffViewer summary={summary} onNavigate={handleNavigate} />}

        {isPartialResult && (
          <LockOverlay 
            title="Unlock Full Comparison"
            message={`Showing ${visibleChangeCount} of ${visibleChangeCount + hiddenChangeCount} changes. Upgrade to Pro to see all results.`}
            onUpgradeClick={() => { console.log("Upgrade action triggered!"); }}
          />
        )}
      </div>
    </div>
  );
};

export default TaskPaneComparisonView;