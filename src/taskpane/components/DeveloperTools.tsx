// src/taskpane/components/DeveloperTools.tsx

import * as React from "react";
import { useState } from "react";
import { Button } from "@fluentui/react-components";
import { debugService } from "../services/debug.service";
import { useSharedStyles } from "./sharedStyles";

// --- MODIFICATION START (FEAT-005) ---
// Update the onCompare prop to be a synchronous function.
interface DevToolsProps {
  onSaveVersion: (comment: string) => Promise<void>;
  onClearHistory: () => void;
  onCompare: (startIndex: number, endIndex: number) => void;
}
// --- MODIFICATION END ---

interface TestStep {
  description: string;
  comment: string;
  action: () => Promise<void>;
}

const testSteps: TestStep[] = [ 
    { description: "Setting up v1: Empty Sheet", comment: "v1: Initial State", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange().clear(); await context.sync(); }); }, }, 
    { description: "Setting up v2: A2 = 1", comment: "v2: A2 = 1", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A2").values = [[1]]; await context.sync(); }); }, }, 
    { description: "Setting up v3: A3 = 2", comment: "v3: A3 = 2", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A3").values = [[2]]; await context.sync(); }); }, }, 
    { description: "Setting up v4: A4 = SUM(A2:A3)", comment: "v4: A4 = SUM", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A4").formulas = [["=SUM(A2:A3)"]]; await context.sync(); }); }, }, 
    { description: "Setting up v5: Insert row at 4", comment: "v5: Insert row at 4", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("4:4").insert(Excel.InsertShiftDirection.down); await context.sync(); }); }, }, 
    { description: "Setting up v6: A4 = 'new value'", comment: "v6: A4 = 'new value'", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A4").values = [['new value']]; await context.sync(); }); }, }, 
    { description: "Setting up v7: A3 = 25", comment: "v7: A3 = 25", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("A3").values = [[25]]; await context.sync(); }); }, }, 
    { description: "Setting up v8: Delete row 3", comment: "v8: Delete row 3", action: async () => { await Excel.run(async (context) => { context.workbook.worksheets.getActiveWorksheet().getRange("3:3").delete(Excel.DeleteShiftDirection.up); await context.sync(); }); }, }, 
];

const DeveloperTools: React.FC<DevToolsProps> = ({ onSaveVersion, onClearHistory, onCompare }) => {
  // Call the shared style hook to get the generated class names.
  const styles = useSharedStyles();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Ready");

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleRunTest = async () => {
    setIsRunning(true);
    debugService.startNewLogSession();

    try {
      // --- Setup Phase ---
      setStatus("Phase 1/2: Clearing history and creating versions...");
      onClearHistory();
      await delay(500);

      for (let i = 0; i < testSteps.length; i++) {
        const step = testSteps[i];
        setStatus(`Creating v${i + 1}/${testSteps.length}: ${step.description}`);
        await step.action();
        await delay(200);
        await onSaveVersion(step.comment);
        await delay(500);
      }
      
      // --- Scenario Generation & Verification Phase ---
      setStatus("Phase 2/2: Running focused comparison matrix...");
      await delay(500);
      
      const numVersions = testSteps.length;
      const pairs: [number, number][] = [];

      for (let i = 0; i < numVersions; i++) {
        for (let j = i + 1; j < numVersions; j++) {
          if (i === 0 && j === numVersions - 1) {
            pairs.push([i, j]);
          }
        }
      }

      debugService.addLogEntry("Starting comparison verification phase.", { totalPairs: pairs.length, generatedPairs: pairs });

      for (let i = 0; i < pairs.length; i++) {
        const [startIndex, endIndex] = pairs[i];
        setStatus(`Comparing v${startIndex + 1} vs v${endIndex + 1} (${i + 1}/${pairs.length})`);
        // --- MODIFICATION START (FEAT-005) ---
        // Remove the `await` as onCompare is no longer an async function.
        onCompare(startIndex, endIndex);
        // --- MODIFICATION END ---
        await delay(200);
      }
      
      setStatus("Test complete! Log file is being saved.");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Test harness failed:", error);
      setStatus(`Failed at step: ${status}. Check console.`);
      debugService.addLogEntry("Test Harness Failed", { error: errorMessage, status });
    } finally {
      setIsRunning(false);
      debugService.saveLogSession('focused_test_run_log.json');
    }
  };
  
  return (
    <div className={styles.card_warning}>
      <h4>Developer Tools</h4>
      <p className={styles.textSubtle} style={{ margin: 0 }}>
        This panel is only visible in development mode.
      </p>
      <Button 
        appearance="primary" 
        onClick={handleRunTest} 
        disabled={isRunning}
        style={{ marginTop: "10px", width: "100%" }}
      >
        {isRunning ? "Running..." : "Run Focused v1-v8 Test Case"}
      </Button>
      <p className={styles.textSubtle} style={{ marginTop: '10px', fontStyle: 'italic' }}>Status: {status}</p>
    </div>
  );
};

export default DeveloperTools;