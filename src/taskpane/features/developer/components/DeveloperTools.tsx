// src/taskpane/features/developer/components/DeveloperTools.tsx

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button, Divider } from "@fluentui/react-components";
import { debugService } from "../../../core/services/debug.service";
import { useSharedStyles } from "../../../shared/styles/sharedStyles";
import { authService } from "../../../core/services/AuthService";
import { devHarnessService } from "../../../features/developer/services/dev.harness.service";
import { testSteps } from "../../../features/developer/services/test.cases";
import { useAppStore } from "../../../state/appStore";
import { comparisonWorkflowService } from "../../comparison/services/comparison.workflow.service";

interface DevToolsProps { }

const DeveloperTools: React.FC<DevToolsProps> = () => {
  const {
    versions,
    license,
    isLicenseLoading,
    addVersion,
    clearVersions,
  } = useAppStore();

  const styles = useSharedStyles();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Ready");

  const versionsRef = useRef(versions);
  useEffect(() => {
    versionsRef.current = versions;
  }, [versions]);

  const handleRunTest = async () => {
    setIsRunning(true);
    setStatus("Initiating test run...");

    try {
      await devHarnessService.runComprehensiveTest({
        getVersions: () => versionsRef.current,
        onSaveVersion: addVersion,
        onClearHistory: clearVersions,
        onCompare: comparisonWorkflowService.runComparison,
        onStatusUpdate: setStatus,
      }, {
        upToStep: 18,
      });
      setStatus("Test run completed successfully!");
    } catch (error) {
      setStatus(`Error during test: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

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

      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
        <Button
          appearance="primary"
          size="small"
          onClick={handleRunTest}
          disabled={isRunning}
          style={{ flex: 1 }}
        >
          {isRunning ? "Running..." : `Test v1-${testSteps.length}`}
        </Button>

        <Button
          appearance="secondary"
          size="small"
          onClick={handleSaveLog}
          disabled={isRunning}
          style={{ flex: 1 }}
        >
          Save Log
        </Button>
      </div>

      <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
        {status}
      </div>
    </div>
  );
};

export default DeveloperTools;