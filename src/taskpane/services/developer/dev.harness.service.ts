// src/taskpane/services/developer/dev.harness.service.ts

import { IVersion } from "../../types/types";
import { debugService } from "../debug.service";
import { testSteps } from "./test.cases";

/**
 * Defines the functions and data the harness needs from the main application
 * to perform its operations.
 */
interface IHarnessCallbacks {
  getVersions: () => IVersion[];
  onSaveVersion: (comment: string) => Promise<void>;
  onClearHistory: () => void;
  onCompare: (startIndex: number, endIndex: number) => void;
  onStatusUpdate: (message: string) => void;
}

class DevHarnessService {
  private readonly delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Runs the full, multi-step test case to generate a standard set of versions
   * and then performs a comparison for debugging purposes.
   * @param callbacks An object containing functions to interact with the app's state.
   */
  public async runComprehensiveTest(callbacks: IHarnessCallbacks): Promise<void> {
    const { onClearHistory, onSaveVersion, onCompare, onStatusUpdate, getVersions } = callbacks;
    
    debugService.startNewLogSession();

    try {
      onStatusUpdate("Phase 1/2: Clearing history and creating versions...");
      onClearHistory();
      await this.delay(500);

      for (let i = 0; i < testSteps.length; i++) {
        const step = testSteps[i];
        onStatusUpdate(`Creating v${i + 1}/${testSteps.length}: ${step.description}`);
        await step.action();
        await this.delay(200);
        await onSaveVersion(step.comment);
        await this.delay(500);
      }
      
      console.log("[DEV HARNESS] State of 'versions' array AFTER loop and BEFORE capture:", getVersions());
      debugService.capture('AllVersionsAfterCreation', getVersions());
      onStatusUpdate("Phase 2/2: Running focused comparison matrix...");
      await this.delay(500);
      
      const numVersions = testSteps.length;
      const pairs: [number, number][] = [[0, numVersions - 1]];

      debugService.addLogEntry("Starting comparison verification phase.", { totalPairs: pairs.length, generatedPairs: pairs });

      for (let i = 0; i < pairs.length; i++) {
        const [startIndex, endIndex] = pairs[i];
        onStatusUpdate(`Comparing v${startIndex + 1} vs v${endIndex + 1} (${i + 1}/${pairs.length})`);
        onCompare(startIndex, endIndex);
        await this.delay(200);
      }
      
      onStatusUpdate("Test complete! Log file is being saved.");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Test harness failed:", error);
      debugService.addLogEntry("Test Harness Failed", { error: errorMessage });
      throw new Error(`Test harness failed. Check console for details.`);
    } finally {
      debugService.saveLogSession('timeline_resolver_debug_log.json');
    }
  }
}

export const devHarnessService = new DevHarnessService();