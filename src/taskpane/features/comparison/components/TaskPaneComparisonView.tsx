// src/taskpane/features/comparison/components/TaskPaneComparisonView.tsx

import * as React from "react";
import { useState, useEffect } from "react";
import { IChange, IDiffResult, ISummaryResult, ICombinedChange, IInteractionChange } from "../../../types/types";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { Window20Filled } from "@fluentui/react-icons";
import { 
  showChangesOnSheet, 
  clearChangesFromSheet, 
  setupSelectionListener, 
  removeSelectionListener,
  navigateToCell
} from "../../../core/excel/excel.interaction.service";
import { generateSummary } from "../../../features/comparison/services/summary.service";
import SelectionDetailViewer from "./SelectionDetailViewer";
import DiffViewer from "./DiffViewer";
import { useSharedStyles } from "../../../shared/styles/sharedStyles";
import DiffFilterOptions from "./DiffFilterOptions";
import LockOverlay from '../../../shared/paywall/LockOverlay';
import { crossWindowMessageBus } from "../../../core/dialog/CrossWindowMessageBus";
import { MessageType } from "../../../types/messaging.types";
import { useAppStore } from "../../../state/appStore";
import { useDialogStore } from "../../../state/dialogStore";


function toSimpleChange(combinedChange: ICombinedChange): IInteractionChange {
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

// --- FIX: The onOpenInWindow prop is no longer needed. ---
interface TaskPaneComparisonViewProps {
  // onOpenInWindow: (result: IDiffResult) => void; // This is now handled by the workflow service
}

const TaskPaneComparisonView: React.FC<TaskPaneComparisonViewProps> = (/* --- props removed --- */) => {
  
  const result = useAppStore((state) => state.diffResult);
  const activeFilters = useAppStore((state) => state.activeFilters);
  const onFilterChange = useAppStore((state) => state.handleFilterChange);
  
  const isDialogOpen = useDialogStore((state) => state.activeDialog !== null);

  const styles = useSharedStyles();
  const [showOnSheet, setShowOnSheet] = useState(false);
  const [selectedChange, setSelectedChange] = useState<IChange | null>(null);
  const [summary, setSummary] = useState<ISummaryResult | null>(null);
  
  if (!result) {
    return <Spinner label="Loading comparison data..." />;
  }

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

  // --- REMOVED: The handleViewInWindow function is no longer needed. ---

  const isPartialResult = result.isPartialResult ?? false;
  const hiddenChangeCount = result.hiddenChangeCount ?? 0;
  const visibleChangeCount = result.modifiedCells.length;
  
  // This placeholder component correctly reacts to the global state.
  if (isDialogOpen) {
    return (
      <div style={{ marginTop: '20px', padding: '30px 10px', textAlign: 'center', border: '1px dashed #ccc', borderRadius: '4px' }}>
        <Window20Filled style={{ fontSize: '32px', color: '#666' }} />
        <Text block weight="semibold" style={{ marginTop: '10px' }}>Comparison Active</Text>
        <Text block className={styles.textSubtle}>
          The detailed comparison view is open in a separate window.
        </Text>
      </div>
    );
  }

  // This part of the component will now likely never be seen, as `isDialogOpen` will be true
  // whenever `diffResult` is populated. However, we keep it for logical completeness.
  return (
    <div style={{ marginTop: "20px" }}>
      <DiffFilterOptions 
        activeFilters={activeFilters}
        onFilterChange={onFilterChange}
      />
      
      {/* --- FIX: Removed the "View in Window" button --- */}
      <div className={styles.buttonGroup}>
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