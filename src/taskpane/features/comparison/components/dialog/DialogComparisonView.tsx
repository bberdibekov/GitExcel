// src/taskpane/features/comparison/components/dialog/DialogComparisonView.tsx

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { IDiffResult, IWorkbookSnapshot, ViewFilter } from "../../../../types/types";
import { Spinner } from "@fluentui/react-components";
import { crossWindowMessageBus } from "../../../../core/dialog/CrossWindowMessageBus";
import { MessageType } from "../../../../types/messaging.types";
import { generateSummary, calculateSummaryStats } from "../../services/summary.service";
import { truncateComment } from "../../../../shared/lib/string.utils";

import SideBySideDiffViewer from "./SideBySideDiffViewer";
import { useDialogComparisonViewStyles } from "./Styles/DialogComparisonView.styles";
import { IHighLevelChange } from "../../../../types/types";

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
  const styles = useDialogComparisonViewStyles();
  
  const [activeViewFilter, setActiveViewFilter] = useState<ViewFilter>('all');
  const [activeComparisonSettings, setActiveComparisonSettings] = useState<Set<string>>(new Set());

  useEffect(() => {
    const MAX_LENGTH = 30;
    if (startVersionComment && endVersionComment) {
      const truncatedStart = truncateComment(startVersionComment, MAX_LENGTH);
      const truncatedEnd = truncateComment(endVersionComment, MAX_LENGTH);
      document.title = `Comparison: "${truncatedStart}" vs. "${truncatedEnd}"`;
    } else {
      document.title = "Excel Version Control - Comparison";
    }
  }, [startVersionComment, endVersionComment]);


  const summary = useMemo(() => result ? generateSummary(result) : { highLevelChanges: [] as IHighLevelChange[], modifiedCells: [] }, [result]);
  const summaryStats = useMemo(() => calculateSummaryStats(result), [result]);

  const filteredResult = useMemo((): IDiffResult | null => {
    if (!result) {
      return null;
    }
    // This filtering logic will eventually move, but is fine here for now.
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
      <SideBySideDiffViewer
        // Core props
        result={filteredResult}
        startSnapshot={startSnapshot}
        endSnapshot={endSnapshot}
        startVersionComment={startVersionComment}
        endVersionComment={endVersionComment}
        licenseTier={licenseTier}
        
        // Props inherited from CollapsiblePane for future use
        highLevelChanges={summary.highLevelChanges}
        summaryStats={summaryStats}
        activeViewFilter={activeViewFilter}
        activeComparisonSettings={activeComparisonSettings}
        onViewFilterChange={setActiveViewFilter}
        onComparisonSettingChange={handleComparisonSettingChange}
      />
    </div>
  );
};

export default DialogComparisonView;