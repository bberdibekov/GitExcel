// src/taskpane/features/comparison/components/dialog/DialogComparisonView.tsx

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { IDiffResult, ISummaryResult, ICombinedChange } from "../../../../types/types";
import { Spinner } from "@fluentui/react-components";
import { generateSummary } from "../../services/summary.service";
import { crossWindowMessageBus } from "../../../../core/dialog/CrossWindowMessageBus";
import { MessageType, GridSelectionChangedPayload } from "../../../../types/messaging.types";
import { loggingService } from "../../../../core/services/LoggingService";

// Import the child components that this orchestrator manages.
import ComparisonActionBar, { ViewFilter, RestoreAction } from "./ComparisonActionBar";
// CORRECT: Ensure we are importing ComparisonReport, NOT DiffViewer.
import ComparisonReport from "./ComparisonReport";

interface DialogComparisonViewProps {
  result: IDiffResult | null;
  licenseTier: 'free' | 'pro';
}

const DialogComparisonView: React.FC<DialogComparisonViewProps> = ({ result, licenseTier }) => {
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [activeViewFilter, setActiveViewFilter] = useState<ViewFilter>('all');
  const [activeComparisonSettings, setActiveComparisonSettings] = useState<Set<string>>(new Set());

  const summary: ISummaryResult | null = useMemo(() => {
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
    return { ...summary, modifiedCells: summary.modifiedCells.filter(filterPredicate) };
  }, [summary, activeViewFilter]);

  const handleViewFilterChange = (filter: ViewFilter) => {
    setActiveViewFilter(filter);
  };

  const handleComparisonSettingChange = (changedSettings: Record<string, string[]>) => {
    const newSettingsArray = changedSettings['comparison-settings'];
    if (newSettingsArray) {
        const newSettings = new Set(newSettingsArray);
        setActiveComparisonSettings(newSettings);
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
  
  useEffect(() => {
    const unsubscribe = crossWindowMessageBus.listen(
      MessageType.GRID_SELECTION_CHANGED,
      (payload: GridSelectionChangedPayload) => {
        const elementId = `change-${payload.sheet}-${payload.address}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    );
    return unsubscribe;
  }, []);

  const handleNavigate = (sheet: string, address: string) => {
    crossWindowMessageBus.broadcast({
      type: MessageType.NAVIGATE_TO_CELL,
      payload: { sheet, address },
    });
  };

  if (!result || !summary) {
    return <Spinner label="Loading comparison data..." />;
  }
      
  // --- ADDED FOR DIAGNOSTICS ---
  // Log the exact data being passed to the report component. This will let us inspect
  // the 'history' array for any problematic cells like A4.
  console.log("[DialogComparisonView] Data being passed to ComparisonReport:", JSON.stringify(filteredSummary, null, 2));

  
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