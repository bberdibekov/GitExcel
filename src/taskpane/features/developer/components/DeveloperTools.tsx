// src/taskpane/components/DeveloperTools.tsx

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button, Divider } from "@fluentui/react-components";
import { debugService } from "../../../core/services/debug.service";
import { useSharedStyles } from "../../../shared/styles/sharedStyles";
import { authService } from "../../../core/services/AuthService";
import { devHarnessService } from "../../../features/developer/services/dev.harness.service";
import { testSteps } from "../../../features/developer/services/test.cases";

import { useAppStore } from "../../../state/appStore";

interface DevToolsProps {}

const DeveloperTools: React.FC<DevToolsProps> = () => {
  // --- Select state and actions from the store ---
  const {
    versions,
    license,
    isLicenseLoading, // <-- FIX #1: Use the correct property name from the store
    addVersion,
    clearVersions,
    runComparison,
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
        onCompare: runComparison,
        onStatusUpdate: setStatus,
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
    <div className={styles.card_dev_tools}>
      <h4>Developer Tools</h4>
      <p className={styles.textSubtle} style={{ margin: 0 }}>
        This panel is only visible in development mode.
      </p>

      <Divider style={{ margin: "12px 0" }} />
      <p className={styles.textSubtle} style={{ margin: 0, fontWeight: "bold" }}>
        Mock Auth Control
      </p>
      <p className={styles.textSubtle} style={{ marginTop: '4px' }}>
        Current Tier: <strong>{isLicenseLoading ? 'Loading...' : license?.tier?.toUpperCase() ?? 'FREE'}</strong>
      </p>
      <div className={styles.buttonGroup} style={{ marginTop: '8px' }}>
        <Button
          appearance="primary"
          onClick={handleToggleTier}
          disabled={isLicenseLoading} // <-- FIX #3: And here
        >
          {`Switch to ${license?.tier === 'pro' ? 'Free' : 'Pro'}`}
        </Button>
        <Button
          appearance="secondary"
          onClick={handleClearMock}
        >
          Clear Mock & Revert
        </Button>
      </div>
      <Divider style={{ margin: "12px 0" }} />
      
      <Button 
        appearance="primary" 
        onClick={handleRunTest} 
        disabled={isRunning}
        style={{ marginTop: "10px", width: "100%" }}
      >
        {isRunning ? "Running..." : `Run Formatted v1-v${testSteps.length} Test Case`}
      </Button>
      
      <Button
        appearance="secondary"
        onClick={handleSaveLog}
        disabled={isRunning}
        style={{ marginTop: "8px", width: "100%" }}
      >
        Save Debug Session to File
      </Button>

      <p className={styles.textSubtle} style={{ marginTop: '10px', fontStyle: 'italic' }}>Status: {status}</p>
    </div>
  );
};

export default DeveloperTools;