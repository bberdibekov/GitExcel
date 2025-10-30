// src/taskpane/features/comparison/components/dialog/DialogComparisonView.tsx

import * as React from "react";
import { useState, useMemo } from "react"; // <-- Make sure useMemo is imported
import { IDiffResult, IWorkbookSnapshot } from "../../../../types/types";
import { Spinner } from "@fluentui/react-components";
import { crossWindowMessageBus } from "../../../../core/dialog/CrossWindowMessageBus";
import { MessageType } from "../../../../types/messaging.types";
import { loggingService } from "../../../../core/services/LoggingService";

import ComparisonActionBar, { ViewFilter } from "./ComparisonActionBar";
import SideBySideDiffViewer from "./ComparisonReport";

interface DialogComparisonViewProps {
  result: IDiffResult | null;
  startSnapshot: IWorkbookSnapshot;
  endSnapshot: IWorkbookSnapshot;
  licenseTier: 'free' | 'pro';
}

const DialogComparisonView: React.FC<DialogComparisonViewProps> = ({ result, startSnapshot, endSnapshot, licenseTier }) => {
  const [activeViewFilter, setActiveViewFilter] = useState<ViewFilter>('all');
  const [activeComparisonSettings, setActiveComparisonSettings] = useState<Set<string>>(new Set());

  // --- START: ADDED FILTERING LOGIC ---
  // This memoized value will re-calculate ONLY when the result or filter changes.
  const filteredResult = useMemo((): IDiffResult | null => {
    if (!result) {
      return null;
    }

    // The 'ViewFilter' type from ComparisonActionBar is 'all', 'values', or 'formulas'
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
        // For 'all' or any unknown filter, return the original, unfiltered result.
        return result;
    }
  }, [result, activeViewFilter]);
  // --- END: ADDED FILTERING LOGIC ---

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
  
  // --- Check the filtered result for loading state ---
  if (!filteredResult) {
    return <Spinner label="Loading comparison data..." />;
  }
      
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ComparisonActionBar
        licenseTier={licenseTier}
        // --- Use the filtered count for the badge ---
        selectedChangeCount={filteredResult.modifiedCells.length}
        activeViewFilter={activeViewFilter}
        activeComparisonSettings={activeComparisonSettings}
        onViewFilterChange={setActiveViewFilter}
        onComparisonSettingChange={handleComparisonSettingChange}
        onRestore={(action) => loggingService.log(`[DialogComparisonView] Restore action triggered:`, action)}
      />
      
      {/* The container now renders our single, powerful grid viewer with FILTERED data */}
      <SideBySideDiffViewer
        result={filteredResult} // <-- PASS THE FILTERED RESULT
        startSnapshot={startSnapshot}
        endSnapshot={endSnapshot}
      />
    </div>
  );
};

export default DialogComparisonView;