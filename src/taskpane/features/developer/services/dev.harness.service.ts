// src/taskpane/services/developer/dev.harness.service.ts
import { IVersion } from "../../../types/types";
import { debugService } from "../../../core/services/debug.service";
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

/**
 * Configuration options for running the test harness
 */
interface ITestHarnessOptions {
  /** 
   * The step number to run up to (1-indexed, inclusive).
   * If not specified, all steps will be run.
   * @example 5 will run steps 1 through 5
   */
  upToStep?: number;
  
  /**
   * The step number to start from (1-indexed, inclusive).
   * Defaults to 1.
   * @example startFromStep: 3, upToStep: 7 will run steps 3 through 7
   */
  startFromStep?: number;
  
  /**
   * Delay in milliseconds between test steps.
   * Defaults to 500ms.
   */
  stepDelay?: number;
  
  /**
   * Delay in milliseconds after each action.
   * Defaults to 200ms.
   */
  actionDelay?: number;
}

class DevHarnessService {
  private readonly delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  /**
   * Runs the full, multi-step test case to generate a standard set of versions
   * and then performs a comparison for debugging purposes.
   * @param callbacks An object containing functions to interact with the app's state.
   * @param options Configuration options for the test run.
   */
  /**
   * Clears localStorage to reset all persisted state.
   */
  private clearLocalStorage(): void {
    try {
      localStorage.clear();
      console.log("[DEV HARNESS] localStorage cleared successfully");
    } catch (error) {
      console.warn("[DEV HARNESS] Failed to clear localStorage:", error);
    }
  }

  /**
   * Extracts all unique sheet names referenced in the test steps.
   */
  private getTestSheetNames(): string[] {
    const sheetNames = new Set<string>();
    
    for (const step of testSteps) {
      if (step.sheetsInvolved) {
        step.sheetsInvolved.forEach(name => sheetNames.add(name));
      }
    }
    
    return Array.from(sheetNames);
  }

  /**
   * Deletes test sheets if they exist to ensure a clean test environment.
   */
  private async cleanupTestSheets(): Promise<void> {
    const testSheetNames = this.getTestSheetNames();
    
    if (testSheetNames.length === 0) {
      return; // No sheets to clean up
    }
    
    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();
      
      for (const sheetName of testSheetNames) {
        const sheet = sheets.items.find(s => s.name === sheetName);
        if (sheet) {
          sheet.delete();
        }
      }
      
      await context.sync();
    });
  }

  public async runComprehensiveTest(
    callbacks: IHarnessCallbacks,
    options: ITestHarnessOptions = {}
  ): Promise<void> {
    const { onClearHistory, onSaveVersion, onCompare, onStatusUpdate, getVersions } = callbacks;
    const { 
      upToStep = testSteps.length, 
      startFromStep = 1,
      stepDelay = 500,
      actionDelay = 200
    } = options;
    
    // Validate step numbers
    const startIndex = Math.max(0, startFromStep - 1);
    const endIndex = Math.min(testSteps.length - 1, upToStep - 1);
    
    if (startIndex > endIndex) {
      throw new Error(`Invalid step range: startFromStep (${startFromStep}) must be <= upToStep (${upToStep})`);
    }
    
    if (startFromStep < 1 || upToStep > testSteps.length) {
      throw new Error(`Step numbers must be between 1 and ${testSteps.length}`);
    }
    
    const stepsToRun = testSteps.slice(startIndex, endIndex + 1);
   
    debugService.startNewLogSession();
    try {
      onStatusUpdate("Phase 0/3: Cleaning up localStorage and test sheets...");
      this.clearLocalStorage();
      await this.cleanupTestSheets();
      await this.delay(stepDelay);
      
      onStatusUpdate(`Phase 1/3: Clearing history and creating ${stepsToRun.length} version(s) (steps ${startFromStep}-${upToStep})...`);
      onClearHistory();
      await this.delay(stepDelay);
      
      for (let i = 0; i < stepsToRun.length; i++) {
        const step = stepsToRun[i];
        const stepNumber = startIndex + i + 1;
        onStatusUpdate(`Creating v${i + 1}/${stepsToRun.length}: ${step.description} (step ${stepNumber})`);
        
        await step.action();
        await this.delay(actionDelay);
        await onSaveVersion(step.comment);
        await this.delay(stepDelay);
      }
     
      // Get the definitive state AFTER the creation loop to avoid race conditions.
      const finalVersions = getVersions();
      console.log("[DEV HARNESS] State of 'versions' array AFTER loop and BEFORE comparison:", finalVersions);
      debugService.capture('AllVersionsAfterCreation', finalVersions);

      onStatusUpdate("Phase 2/3: Running focused comparison matrix...");
      await this.delay(stepDelay);
     
      const numVersions = finalVersions.length;
      if (numVersions < 2) {
        onStatusUpdate(`Test complete! Only ${numVersions} version(s) created. No comparison run.`);
        console.warn(`[DEV HARNESS] Not enough versions (${numVersions}) to run a comparison.`);
        // No throw, just end gracefully.
      } else {
        // The comparison logic now uses the actual number of versions from the state.
        const pairs: [number, number][] = [[0, numVersions - 1]];
        debugService.addLogEntry("Starting comparison verification phase.", { 
          totalPairs: pairs.length, 
          generatedPairs: pairs,
          stepsRun: `${startFromStep} to ${upToStep}`,
          totalVersionsCreated: numVersions
        });
        
        for (let i = 0; i < pairs.length; i++) {
          const [startIdx, endIdx] = pairs[i];
          onStatusUpdate(`Comparing v${startIdx + 1} vs v${endIdx + 1} (${i + 1}/${pairs.length})`);
          onCompare(startIdx, endIdx);
          await this.delay(actionDelay);
        }
        onStatusUpdate(`Test complete! Ran ${stepsToRun.length} step(s). Log file is being saved.`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Test harness failed:", error);
      debugService.addLogEntry("Test Harness Failed", { error: errorMessage });
      onStatusUpdate(`Test FAILED: ${errorMessage}. Check console.`);
      throw new Error(`Test harness failed. Check console for details.`);
    } finally {
      debugService.saveLogSession('timeline_resolver_debug_log.json');
    }
  }
  
  /**
   * Returns the total number of available test steps.
   */
  public getTotalSteps(): number {
    return testSteps.length;
  }
  
  /**
   * Returns information about a specific test step.
   */
  public getStepInfo(stepNumber: number): { description: string; comment: string } | null {
    if (stepNumber < 1 || stepNumber > testSteps.length) {
      return null;
    }
    const step = testSteps[stepNumber - 1];
    return {
      description: step.description,
      comment: step.comment
    };
  }
  
  /**
   * Returns information about all test steps.
   */
  public getAllStepsInfo(): Array<{ stepNumber: number; description: string; comment: string }> {
    return testSteps.map((step, index) => ({
      stepNumber: index + 1,
      description: step.description,
      comment: step.comment
    }));
  }
}

export const devHarnessService = new DevHarnessService();