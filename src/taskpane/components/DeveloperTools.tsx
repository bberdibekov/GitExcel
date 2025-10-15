// src/taskpane/components/DeveloperTools.tsx

import * as React from "react";
import { useState } from "react";
import { Button, Divider } from "@fluentui/react-components";
import { debugService } from "../services/debug.service";
import { useSharedStyles } from "./sharedStyles";
import { IVersion } from "../types/types"; 
import { authService } from "../services/AuthService";
import { useUser } from "../context/UserContext";
import { devHarnessService } from "../services/developer/dev.harness.service";
import { testSteps } from "../services/developer/test.cases";

interface DevToolsProps {
  versions: IVersion[];
  onSaveVersion: (comment: string) => Promise<void>;
  onClearHistory: () => void;
  onCompare: (startIndex: number, endIndex: number) => void;
}

const DeveloperTools: React.FC<DevToolsProps> = ({ versions, onSaveVersion, onClearHistory, onCompare }) => {
  const styles = useSharedStyles();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Ready");
  const { license, isLoading } = useUser();

  const handleRunTest = async () => {
    setIsRunning(true);
    setStatus("Initiating test run...");

    try {
      await devHarnessService.runComprehensiveTest({
        versions,
        onSaveVersion,
        onClearHistory,
        onCompare,
        onStatusUpdate: setStatus, // Pass the setStatus function as a callback
      });
    } catch (error) {
      // The service now throws an error on failure, which we can catch here.
      setStatus(error.message);
    } finally {
      // This ensures the running state is always reset, even if the test fails.
      setIsRunning(false);
    }
  };
  
  const handleSaveLog = () => {
    setStatus("Manually saving debug session...");
    debugService.saveLogSession('manual_restore_debug_log.json');
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
        Current Tier: <strong>{isLoading ? 'Loading...' : license?.tier?.toUpperCase() ?? 'FREE'}</strong>
      </p>
      <div className={styles.buttonGroup} style={{ marginTop: '8px' }}>
        <Button
          appearance="primary"
          onClick={handleToggleTier}
          disabled={isLoading}
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