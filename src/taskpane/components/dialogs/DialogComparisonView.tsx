// src/taskpane/components/dialogs/DialogComparisonView.tsx

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { IDiffResult, ISummaryResult, ICombinedChange } from "../../types/types";
import { Spinner } from "@fluentui/react-components";
import { generateSummary } from "../../services/summary.service";
import { crossWindowMessageBus } from "../../services/dialog/CrossWindowMessageBus";
import { MessageType, GridSelectionChangedPayload } from "../../types/messaging.types";
import { loggingService } from "../../services/LoggingService";

// Import the child components that this orchestrator manages.
import ComparisonActionBar, { ViewFilter, RestoreAction } from "../comparison_dialog/ComparisonActionBar";
import ComparisonReport from "../comparison_dialog/ComparisonReport";

interface DialogComparisonViewProps {
  result: IDiffResult | null;
  licenseTier: 'free' | 'pro';
}

const DialogComparisonView: React.FC<DialogComparisonViewProps> = ({ result, licenseTier }) => {
  // ... (State definitions and other handlers are correct and remain unchanged) ...
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [activeViewFilter, setActiveViewFilter] = useState<ViewFilter>('all');
  const [activeComparisonSettings, setActiveComparisonSettings] = useState<Set<string>>(new Set());

  const summary: ISummaryResult | null = useMemo(() => {
    loggingService.log("[DialogComparisonView] Generating summary from result...");
    return result ? generateSummary(result) : null;
  }, [result]);

  const filteredSummary: ISummaryResult | null = useMemo(() => {
    if (!summary) return null;
    if (activeViewFilter === 'all') return summary;
    const filterPredicate = (change: ICombinedChange) => {
      if (activeViewFilter === 'values') return change.changeType === 'value' || change.changeType === 'both';
      if (activeViewFilter === 'formulas') return change.changeType === 'formula' || change.changeType === 'both';
      return true;
    };
    loggingService.log(`[DialogComparisonView] Applying view filter: ${activeViewFilter}`);
    return { ...summary, modifiedCells: summary.modifiedCells.filter(filterPredicate) };
  }, [summary, activeViewFilter]);

  const handleViewFilterChange = (filter: ViewFilter) => {
    loggingService.log(`[DialogComparisonView] View filter changed to: ${filter}`);
    setActiveViewFilter(filter);
  };

  const handleComparisonSettingChange = (changedSettings: Record<string, string[]>) => {
    const newSettingsArray = changedSettings['comparison-settings'];
    if (newSettingsArray) {
      const newSettings = new Set(newSettingsArray);
      setActiveComparisonSettings(newSettings);
      loggingService.log(`[DialogComparisonView] Broadcasting RUN_COMPARISON_WITH_FILTERS`, { filterIds: Array.from(newSettings) });
      crossWindowMessageBus.broadcast({
        type: MessageType.RUN_COMPARISON_WITH_FILTERS,
        payload: { filterIds: Array.from(newSettings) }
      });
    }
  };

  const handleRestore = (action: RestoreAction) => {
    loggingService.log(`[DialogComparisonView] Restore action triggered:`, { action, selected: Array.from(selectedChanges) });
  };

  const handleSelectionChange = (changeId: string, isSelected: boolean) => {
    const newSelection = new Set(selectedChanges);
    if (isSelected) { newSelection.add(changeId); } else { newSelection.delete(changeId); }
    setSelectedChanges(newSelection);
  };

  // [CORRECTION STARTS HERE]
  // This effect now correctly handles communication FROM the Excel grid TO this dialog.
  useEffect(() => {
    loggingService.log("[DialogComparisonView] Setting up message bus listener for GRID_SELECTION_CHANGED.");

    // CORRECT: Call listen() with the specific message type and a callback that accepts the payload.
    const unsubscribe = crossWindowMessageBus.listen(
      MessageType.GRID_SELECTION_CHANGED,
      (payload: GridSelectionChangedPayload) => {
        loggingService.log(`[DialogComparisonView] Received GRID_SELECTION_CHANGED. Scrolling to element...`, payload);

        // The rest of the logic is the same, but it's now inside a correctly registered listener.
        const elementId = `change-${payload.sheet}-${payload.address}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          loggingService.warn(`[DialogComparisonView] Could not find element with ID: ${elementId}`);
        }
      }
    );

    // The unsubscribe function returned by listen() will be called when the component unmounts.
    return unsubscribe;
  }, []); // Empty dependency array ensures this runs only once.
  // [CORRECTION ENDS HERE]

  const handleNavigate = (sheet: string, address: string) => {
    loggingService.log(`[DialogComparisonView] Broadcasting NAVIGATE_TO_CELL to task pane...`, { sheet, address });
    crossWindowMessageBus.broadcast({
      type: MessageType.NAVIGATE_TO_CELL,
      payload: { sheet, address },
    });
  };

  if (!result || !summary) {
    loggingService.warn("[DialogComparisonView] 'result' prop is null or undefined. Rendering loading spinner.");
    return <Spinner label="Loading comparison data..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ComparisonActionBar
        licenseTier={licenseTier}
        selectedChangeCount={selectedChanges.size}
        activeViewFilter={activeViewFilter}
        activeComparisonSettings={activeComparisonSettings}
        onViewFilterChange={handleViewFilterChange}
        onComparisonSettingChange={handleComparisonSettingChange}
        onRestore={handleRestore}
      />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <ComparisonReport
          summary={filteredSummary}
          selectedChanges={selectedChanges}
          onSelectionChange={handleSelectionChange}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
};

export default DialogComparisonView;