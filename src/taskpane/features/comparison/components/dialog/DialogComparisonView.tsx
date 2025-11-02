// src/taskpane/features/comparison/components/dialog/DialogComparisonView.tsx

import * as React from "react";
import { useState, useMemo } from "react";
import { IDiffResult, IWorkbookSnapshot } from "../../../../types/types";
import { Spinner } from "@fluentui/react-components";
import { crossWindowMessageBus } from "../../../../core/dialog/CrossWindowMessageBus";
import { MessageType } from "../../../../types/messaging.types";
import { loggingService } from "../../../../core/services/LoggingService";

import ComparisonActionBar, { ViewFilter } from "./ComparisonActionBar";
import SideBySideDiffViewer from "./SideBySideDiffViewer";

interface DialogComparisonViewProps {
  result: IDiffResult | null;
  startSnapshot: IWorkbookSnapshot;
  endSnapshot: IWorkbookSnapshot;
  licenseTier: 'free' | 'pro';
}

const DialogComparisonView: React.FC<DialogComparisonViewProps> = ({ result, startSnapshot, endSnapshot, licenseTier }) => {
  const [activeViewFilter, setActiveViewFilter] = useState<ViewFilter>('all');
  const [activeComparisonSettings, setActiveComparisonSettings] = useState<Set<string>>(new Set());

  const filteredResult = useMemo((): IDiffResult | null => {
    if (!result) {
      return null;
    }
    switch (activeViewFilter) {
      case 'values':
        return {
          ...result,
          modifiedCells: result.modifiedCells.filter(
            (c) => c.changeType === 'value' || c.changeType === 'both'
          ),
        };
      case 'formulas':
        return {
          ...result,
          modifiedCells: result.modifiedCells.filter(
            (c) => c.changeType === 'formula' || c.changeType === 'both'
          ),
        };
      case 'all':
      default:
        return result;
    }
  }, [result, activeViewFilter]);

  const handleComparisonSettingChange = (changedSettings: Record<string, string[]>) => {
    const newSettingsArray = changedSettings['comparison-settings'];
    if (newSettingsArray) {
        const newSettings = new Set(newSettingsArray);
        setActiveComparisonSettings(newSettings);
        
        // --- FIX: Use 'messageParent' when a dialog sends a message to the task pane ---
        crossWindowMessageBus.messageParent({
          type: MessageType.RUN_COMPARISON_WITH_FILTERS,
          payload: { filterIds: Array.from(newSettings) }
        });
    }
  };
  
  if (!filteredResult) {
    return <Spinner label="Loading comparison data..." />;
  }
      
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ComparisonActionBar
        licenseTier={licenseTier}
        selectedChangeCount={filteredResult.modifiedCells.length}
        activeViewFilter={activeViewFilter}
        activeComparisonSettings={activeComparisonSettings}
        onViewFilterChange={setActiveViewFilter}
        onComparisonSettingChange={handleComparisonSettingChange}
        onRestore={(action) => loggingService.log(`[DialogComparisonView] Restore action triggered:`, action)}
      />
      
      <SideBySideDiffViewer
        result={filteredResult}
        startSnapshot={startSnapshot}
        endSnapshot={endSnapshot}
      />
    </div>
  );
};

export default DialogComparisonView;