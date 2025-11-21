// src/taskpane/features/developer/components/DeveloperTools.tsx


import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button, Divider, Textarea, Subtitle2 } from "@fluentui/react-components";
import { debugService } from "../../../core/services/debug.service";
import { useSharedStyles } from "../../../shared/styles/sharedStyles";
import { authService } from "../../../core/services/AuthService";
import { devHarnessService, IHybridDiffTest } from "../../../features/developer/services/dev.harness.service"; // Import IHybridDiffTest
import { testSteps, HybridRowInsertRecalcTest } from "../../../features/developer/services/test.cases"; // Import Hybrid Test Case
import { useAppStore } from "../../../state/appStore";
import { comparisonWorkflowService } from "../../comparison/services/comparison.workflow.service";
import { excelInteractionService } from "../../../core/excel/excel.interaction.service";

interface DevToolsProps { }

const DeveloperTools: React.FC<DevToolsProps> = () => {
  const {
    versions,
    license,
    isLicenseLoading,
    addVersion,
    clearVersions,
    selectedVersions // Added for comparison logic integrity
  } = useAppStore();

  const styles = useSharedStyles();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [isCapturingEvents, setIsCapturingEvents] = useState(true); // Default to true now due to Shared Runtime

  // New State for Live Monitor
  const [liveLogText, setLiveLogText] = useState("");
  const [liveEventCount, setLiveEventCount] = useState(0);

  const versionsRef = useRef(versions);
  useEffect(() => {
    versionsRef.current = versions;
  }, [versions]);

  // Helper function to provide callbacks for the harness methods
  const getHarnessCallbacks = (setComparisonStatus: (msg: string) => void) => {
    return {
      getVersions: () => versionsRef.current,
      onSaveVersion: addVersion,
      onClearHistory: clearVersions,
      // The onCompare callback for the harness needs to initiate the complex workflow
      onCompare: (startIdx: number, endIdx: number | 'current') => {
        const currentVersions = useAppStore.getState().versions;

        // Translate harness index (0-based) or 'current' flag to AppStore selection
        const startId = currentVersions[startIdx]?.id;
        const endId = endIdx === 'current' ? 'current' : currentVersions[endIdx as number]?.id;

        if (startId) useAppStore.getState().selectVersion(startId);
        if (endId) useAppStore.getState().selectVersion(endId);

        // Run the comparison. comparisonWorkflowService relies on the AppStore selection being updated.
        comparisonWorkflowService.runComparison();
      },
      onStatusUpdate: setComparisonStatus,
    };

  };

  const handleRunComprehensiveTest = async () => {
    setIsRunning(true);
    setStatus("Initiating Comprehensive test run...");

    try {
      await devHarnessService.runComprehensiveTest(
        getHarnessCallbacks(setStatus),
        { upToStep: testSteps.length }
      );
      setStatus("Comprehensive test run completed successfully!");
    } catch (error) {
      setStatus(`Error during comprehensive test: ${error.message}`);
    } finally {
      setIsRunning(false);
    }

  };

  // === NEW HYBRID TEST HANDLER ===
  const handleRunHybridTest = async () => {
    setIsRunning(true);
    setStatus("Initiating Hybrid Diff Test...");

    try {
      await Excel.run(async (context) => {
        // Ensure the target sheet exists before the harness tries to clean or use it
        context.workbook.worksheets.add(HybridRowInsertRecalcTest.sheetName);
        await context.sync();
      });

      await devHarnessService.runHybridDiffTest(
        getHarnessCallbacks(setStatus),
        HybridRowInsertRecalcTest
      );
      setStatus("Hybrid Diff Test PASSED. Noise successfully filtered!");

    } catch (error) {
      setStatus(`Error during Hybrid Diff test: ${error.message}`);
    } finally {
      setIsRunning(false);
    }

  };
  // ===============================

  const handleSaveLog = () => {
    setStatus("Manually saving debug session...");
    debugService.saveLogSession('manual_debug_log.json');
    setStatus("Debug session saved.");
  };

  const handleToggleTier = () => {
    const currentTier = license?.tier || 'free';
    const nextTier = currentTier === 'free' ? 'pro' : 'free';
    authService.setMockTier(nextTier);
    window.location.reload();
  };

  const handleClearMock = () => {
    authService.clearMockTier();
    window.location.reload();
  };

  // Updated to reflect that tracking is likely already running
  const handleToggleEventCapture = async () => {
    if (isRunning) return;

    try {
      if (isCapturingEvents) {
        setStatus("Stopping event capture...");
        await excelInteractionService.stopAndSaveChangeTracking();
        setStatus("Capture stopped. Log saved to disk.");
        setIsCapturingEvents(false);
      } else {
        setStatus("Starting event capture...");
        await excelInteractionService.startChangeTracking();
        setStatus("Capturing worksheet 'onChanged' events...");
        setIsCapturingEvents(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus(`Event capture failed: ${errorMessage}`);
      setIsCapturingEvents(false);
    }

  };

  // Reads the in-memory buffer from the background service
  const handleRefreshLiveLog = () => {
    const events = excelInteractionService.getRawEvents();
    setLiveEventCount(events.length);
    setLiveLogText(JSON.stringify(events, null, 2));
    setStatus(`Fetched ${events.length} events from background service.`);
  };

  return (
    <div style={{
      backgroundColor: '#fff3f3',
      border: '2px dashed #d13438',
      borderRadius: '4px',
      padding: '8px',
      marginTop: '8px'
    }}>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '13px' }}>Developer Tools</h4>
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
        Tier: <strong>{isLicenseLoading ? 'Loading...' : license?.tier?.toUpperCase() ?? 'FREE'}</strong>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
        <Button
          appearance="primary"
          size="small"
          onClick={handleToggleTier}
          disabled={isLicenseLoading}
          style={{ flex: 1 }}
        >
          {`→ ${license?.tier === 'pro' ? 'Free' : 'Pro'}`}
        </Button>
        <Button
          appearance="secondary"
          size="small"
          onClick={handleClearMock}
          style={{ flex: 1 }}
        >
          Clear
        </Button>
      </div>

      <Divider style={{ margin: "6px 0" }} />

      {/* Test Runner Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
        <Button
          appearance="primary"
          size="small"
          onClick={handleRunComprehensiveTest}
          disabled={isRunning || isCapturingEvents}
          style={{ flex: 1 }}
          title={`Runs comprehensive test v1-${testSteps.length}`}
        >
          {isRunning ? "Running..." : `Test v1-${testSteps.length}`}
        </Button>
        <Button
          appearance="secondary"
          size="small"
          onClick={handleRunHybridTest}
          disabled={isRunning || isCapturingEvents}
          style={{ flex: 1 }}
          title={HybridRowInsertRecalcTest.description}
        >
          Run Hybrid Diff Test
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
        <Button
          appearance="secondary"
          size="small"
          onClick={handleSaveLog}
          disabled={isRunning || isCapturingEvents}
          style={{ flex: 1 }}
        >
          Save Log
        </Button>

        <Button
          size="small"
          onClick={handleToggleEventCapture}
          disabled={isRunning}
          appearance={isCapturingEvents ? "primary" : "secondary"}
          style={{ flex: 1 }}
        >
          {isCapturingEvents ? "Stop & Save Events" : "Restart Capture"}
        </Button>
      </div>

      <Divider style={{ margin: "6px 0" }} />

      {/* Live Monitor Section */}
      <div style={{ backgroundColor: 'white', padding: '5px', borderRadius: '3px', border: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <Subtitle2>Live Buffer ({liveEventCount})</Subtitle2>
          <Button size="small" onClick={handleRefreshLiveLog}>Refresh</Button>
        </div>
        <Textarea
          value={liveLogText}
          readOnly
          rows={6}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '10px', whiteSpace: 'pre' }}
          placeholder="Events captured while pane was closed will appear here..."
        />
      </div>

      <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
        {status}
      </div>
    </div>

  );
};

export default DeveloperTools;