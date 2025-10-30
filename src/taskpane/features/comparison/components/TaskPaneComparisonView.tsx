// src/taskpane/features/comparison/components/TaskPaneComparisonView.tsx

import * as React from 'react';
import { useAppStore } from '../../../state/appStore';
import { useDialogStore } from '../../../state/dialogStore';
import { Button, Subtitle1, Body1 } from '@fluentui/react-components';
import { ArrowLeft16Filled } from '@fluentui/react-icons';

/**
 * This component acts as the "Results Screen". It reads the current comparison
 * result from the global state and decides HOW to display it based on the mode.
 */
export const TaskPaneComparisonView: React.FC = () => {
  const diffResult = useAppStore((state) => state.diffResult);
  const startSnapshot = useAppStore((state) => state.startSnapshot);
  const endSnapshot = useAppStore((state) => state.endSnapshot);
  const clearComparison = useAppStore((state) => state.clearComparison);
  
  const openDialog = useDialogStore((s) => s.open);
  
  if (!diffResult || !startSnapshot || !endSnapshot) {
    return (
        <div>
            <Button icon={<ArrowLeft16Filled />} onClick={clearComparison}>Back</Button>
            <Body1>Error: Comparison data is missing or incomplete.</Body1>
        </div>
    );
  }
  
  // --- START: ADDED DYNAMIC SUMMARY LOGIC ---
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
  // --- END: ADDED DYNAMIC SUMMARY LOGIC ---

  const handleOpenInWindow = () => {
    openDialog('diff-viewer', {
      diffResult,
      startSnapshot,
      endSnapshot,
      licenseTier: useAppStore.getState().license?.tier ?? 'free'
    });
  };

  // --- MODIFIED: The component now has a single, simplified render path ---
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
              {/* --- MODIFIED: Use the new summary text --- */}
              {generateSummaryText()}
          </Body1>
          <Button appearance="primary" onClick={handleOpenInWindow}>
              Review Changes in New Window
          </Button>
      </div>
    </div>
  );
};

export default TaskPaneComparisonView;