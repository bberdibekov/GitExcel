// src/taskpane/features/comparison/components/dialog/DialogComparisonView.tsx

import * as React from "react";
import { useState, useMemo } from "react";
import { IDiffResult, IWorkbookSnapshot } from "../../../../types/types";
import { Spinner } from "@fluentui/react-components";
import { crossWindowMessageBus } from "../../../../core/dialog/CrossWindowMessageBus";
import { MessageType } from "../../../../types/messaging.types";
import { loggingService } from "../../../../core/services/LoggingService";

import ComparisonActionBar, { ViewFilter } from "./ComparisonActionBar";
// --- CORRECT: We are now importing our new viewer component ---
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

  if (!result) {
    return <Spinner label="Loading comparison data..." />;
  }
      
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ComparisonActionBar
        licenseTier={licenseTier}
        selectedChangeCount={0} // Selection is not applicable in the grid view yet
        activeViewFilter={activeViewFilter}
        activeComparisonSettings={activeComparisonSettings}
        onViewFilterChange={setActiveViewFilter}
        onComparisonSettingChange={handleComparisonSettingChange}
        onRestore={(action) => loggingService.log(`[DialogComparisonView] Restore action triggered:`, action)}
      />
      
      {/* The container now renders our single, powerful grid viewer */}
      <SideBySideDiffViewer
        result={result}
        startSnapshot={startSnapshot}
        endSnapshot={endSnapshot}
      />
    </div>
  );
};

export default DialogComparisonView;