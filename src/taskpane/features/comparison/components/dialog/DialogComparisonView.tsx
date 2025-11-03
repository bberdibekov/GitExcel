// src/taskpane/features/comparison/components/dialog/DialogComparisonView.tsx

import * as React from "react";
import { useState, useMemo } from "react";
import { IDiffResult, IWorkbookSnapshot } from "../../../../types/types";
import { Spinner } from "@fluentui/react-components";
import { crossWindowMessageBus } from "../../../../core/dialog/CrossWindowMessageBus";
import { MessageType } from "../../../../types/messaging.types";
import { loggingService } from "../../../../core/services/LoggingService";
import { generateSummary, calculateSummaryStats } from "../../services/summary.service";

import SideBySideDiffViewer from "./SideBySideDiffViewer";
import CollapsiblePane, { ViewFilter } from "./CollapsiblePane";
import { useComparisonDialogStyles } from "./ComparisonDialog.styles";

interface DialogComparisonViewProps {
  result: IDiffResult | null;
  startSnapshot: IWorkbookSnapshot;
  endSnapshot: IWorkbookSnapshot;
  licenseTier: 'free' | 'pro';
  startVersionComment: string;
  endVersionComment: string;
}

const DialogComparisonView: React.FC<DialogComparisonViewProps> = (props) => {
  const { result, startSnapshot, endSnapshot, licenseTier, startVersionComment, endVersionComment } = props;
  const styles = useComparisonDialogStyles();
  
  const [isPaneOpen, setIsPaneOpen] = useState(true);
  const [activeViewFilter, setActiveViewFilter] = useState<ViewFilter>('all');
  const [activeComparisonSettings, setActiveComparisonSettings] = useState<Set<string>>(new Set());

  const summary = useMemo(() => result ? generateSummary(result) : { highLevelChanges: [], modifiedCells: [] }, [result]);
  const summaryStats = useMemo(() => calculateSummaryStats(result), [result]);

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
    <div className={styles.dialogViewContainer}>
      <CollapsiblePane
        isPaneOpen={isPaneOpen}
        onPaneToggle={() => setIsPaneOpen(!isPaneOpen)}
        highLevelChanges={summary.highLevelChanges}
        totalChanges={summaryStats.totalChanges}
        valueChanges={summaryStats.valueChanges}
        formulaChanges={summaryStats.formulaChanges}
        licenseTier={licenseTier}
        selectedChangeCount={filteredResult.modifiedCells.length}
        activeViewFilter={activeViewFilter}
        activeComparisonSettings={activeComparisonSettings}
        onViewFilterChange={setActiveViewFilter}
        onComparisonSettingChange={handleComparisonSettingChange}
        onRestore={(action) => loggingService.log(`[DialogComparisonView] Restore action triggered:`, action)}
      />
      
      <div className={styles.mainContentArea}>
        <SideBySideDiffViewer
          result={filteredResult}
          startSnapshot={startSnapshot}
          endSnapshot={endSnapshot}
          startVersionComment={startVersionComment}
          endVersionComment={endVersionComment}
          licenseTier={licenseTier}
        />
      </div>
    </div>
  );
};

export default DialogComparisonView;