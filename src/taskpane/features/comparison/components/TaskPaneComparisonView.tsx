// src/taskpane/features/comparison/components/TaskPaneComparisonView.tsx

import * as React from 'react';
import { useAppStore } from '../../../state/appStore';
import { useDialogStore } from '../../../state/dialogStore';
import { Button, Subtitle1, Body1 } from '@fluentui/react-components';
import { ArrowLeft16Filled } from '@fluentui/react-icons';
import SideBySideDiffViewer from './dialog/ComparisonReport'; // Our powerful grid viewer component

/**
 * This component acts as the "Results Screen". It reads the current comparison
 * result from the global state and decides HOW to display it based on the mode.
 */
export const TaskPaneComparisonView: React.FC = () => {
  // --- FIX: Use individual selectors for each piece of state and action. ---
  // This is a more robust and performant pattern for consuming the store.
  const diffResult = useAppStore((state) => state.diffResult);
  const startSnapshot = useAppStore((state) => state.startSnapshot);
  const endSnapshot = useAppStore((state) => state.endSnapshot);
  const selectedVersions = useAppStore((state) => state.selectedVersions);
  const clearComparison = useAppStore((state) => state.clearComparison);
  
  const openDialog = useDialogStore((s) => s.open);
  
  const isLiveComparison = selectedVersions.includes('current');

  if (!diffResult || !startSnapshot || !endSnapshot) {
    return (
        <div>
            <Button icon={<ArrowLeft16Filled />} onClick={clearComparison}>Back</Button>
            <Body1>Error: Comparison data is missing or incomplete.</Body1>
        </div>
    );
  }

  const handleOpenInWindow = () => {
    openDialog('diff-viewer', {
      diffResult,
      startSnapshot,
      endSnapshot,
      licenseTier: useAppStore.getState().license?.tier ?? 'free'
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #e0e0e0', flexShrink: 0, marginBottom: '10px' }}>
        <Button icon={<ArrowLeft16Filled />} onClick={clearComparison} appearance="transparent">
          Back to Version History
        </Button>
      </header>
      
      {isLiveComparison ? (
        // --- "Safety Check" Mode: Render the grid directly inside the task pane ---
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
           <SideBySideDiffViewer
              result={diffResult}
              startSnapshot={startSnapshot}
              endSnapshot={endSnapshot}
           />
        </div>
      ) : (
        // --- "Audit Trail" Mode: Show a summary and a button to pop out the dialog ---
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
            <Subtitle1>Comparison Summary</Subtitle1>
            <Body1>
                Found {diffResult.modifiedCells.length} modified cell(s).
            </Body1>
            <Button appearance="primary" onClick={handleOpenInWindow}>
                Review Changes in New Window
            </Button>
        </div>
      )}
    </div>
  );
};

export default TaskPaneComparisonView;