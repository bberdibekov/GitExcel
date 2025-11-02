// src/taskpane/features/comparison/components/TaskPaneComparisonView.tsx

import * as React from 'react';
import { useAppStore } from '../../../state/appStore';
// import { useDialogStore } from '../../../state/dialogStore'; // <-- No longer needed here
import { Button, Subtitle1, Body1 } from '@fluentui/react-components';
import { ArrowLeft16Filled } from '@fluentui/react-icons';
import { loggingService } from '../../../core/services/LoggingService';

/**
 * This component acts as the "Results Screen". It reads the current comparison
 * result from the global state and decides HOW to display it based on the mode.
 * NOTE: This component's role has changed. The dialog is now opened by the workflow service.
 * This view serves as a summary placeholder in the task pane.
 */
export const TaskPaneComparisonView: React.FC = () => {
  const diffResult = useAppStore((state) => state.diffResult);
  const startSnapshot = useAppStore((state) => state.startSnapshot);
  const endSnapshot = useAppStore((state) => state.endSnapshot);
  const clearComparison = useAppStore((state) => state.clearComparison);
  
  // const openDialog = useDialogStore((s) => s.open); // <-- FIX: This was removed.
  
  if (!diffResult || !startSnapshot || !endSnapshot) {
    return (
        <div>
            <Button icon={<ArrowLeft16Filled />} onClick={clearComparison}>Back</Button>
            <Body1>Error: Comparison data is missing or incomplete.</Body1>
        </div>
    );
  }
  
  const generateSummaryText = () => {
    const { modifiedCells, structuralChanges } = diffResult;
    const parts = [];

    if (modifiedCells.length > 0) {
      const plural = modifiedCells.length === 1 ? "" : "s";
      parts.push(`${modifiedCells.length} modified cell${plural}`);
    }

    if (structuralChanges.length > 0) {
      const plural = structuralChanges.length === 1 ? "" : "s";
      parts.push(`${structuralChanges.length} structural change${plural}`);
    }

    if (parts.length === 0) {
      return "No changes found.";
    }

    return `Found ${parts.join(" and ")}.`;
  };

  const handleOpenInWindow = () => {
    // --- FIX: This functionality has moved to the comparison.workflow.service ---
    // The dialog is now opened automatically. This button is currently redundant.
    loggingService.log("[TaskPaneComparisonView] 'Review Changes' clicked, but the dialog should already be open.");
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #e0e0e0', flexShrink: 0, marginBottom: '10px' }}>
        <Button icon={<ArrowLeft16Filled />} onClick={clearComparison} appearance="transparent">
          Back to Version History
        </Button>
      </header>
      
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
          <Subtitle1>Comparison Summary</Subtitle1>
          <Body1>
              {generateSummaryText()}
          </Body1>
          <Button appearance="primary" onClick={handleOpenInWindow} disabled>
              Review Changes in New Window
          </Button>
          <Body1><i>The comparison window should have opened automatically.</i></Body1>
      </div>
    </div>
  );
};

export default TaskPaneComparisonView;