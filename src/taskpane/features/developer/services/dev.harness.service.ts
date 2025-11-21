// src/taskpane/features/developer/services/dev.harness.service.ts

import { IRawEvent, IVersion } from "../../../types/types";
import { debugService } from "../../../core/services/debug.service";
import { testSteps } from "./test.cases";
import { comparisonWorkflowService } from "../../../features/comparison/services/comparison.workflow.service";
import { excelInteractionService } from "../../../core/excel/excel.interaction.service";
import { useAppStore } from "../../../state/appStore";

/**
 * Defines the functions and data the harness needs from the main application
 * to perform its operations.
 */
interface IHarnessCallbacks {
  getVersions: () => IVersion[];
  onSaveVersion: (comment: string) => Promise<void>;
  onClearHistory: () => void;
  /* Compares two versions by index, where 'current' means the live workbook state */
  onCompare: (startIndex: number, endIndex: number | "current") => void;
  onStatusUpdate: (message: string) => void;
}

/**
 * Configuration options for running the test harness
 */
interface ITestHarnessOptions {
  /**
   * The step number to run up to (1-indexed, inclusive).
   * If not specified, all steps will be run.
   */
  upToStep?: number;

  /**
   * The step number to start from (1-indexed, inclusive).
   * Defaults to 1.
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

/**
 * Defines a test case specifically for validating the Hybrid Diff engine
 * by controlling the live event stream between two snapshots.
 */
export interface IHybridDiffTest {
  name: string;
  description: string;

  // Action to set up the state for Version 1 (The 'Old' Snapshot)
  setupAction: (context: Excel.RequestContext) => Promise<void>;

  // The sequence of raw events that should be injected into the tracker
  // when running the Live vs. Historical comparison (v1 vs Current).
  mockRawEvents: IRawEvent[];

  // Action to create the final workbook state (The 'Current' Snapshot).
  liveAction: (context: Excel.RequestContext) => Promise<void>;

  // Expected validation (checking the final number of changes, excluding noise)
  expectedModifiedCellsCount: number;
  expectedStructuralChangesCount: number;
  sheetId: string; // The Sheet ID to target for comparison (for setup/cleanup)
  sheetName: string; // The Sheet Name for user convenience
}

class DevHarnessService {
  private readonly delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

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
        step.sheetsInvolved.forEach((name) => sheetNames.add(name));
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
        const sheet = sheets.items.find((s) => s.name === sheetName);
        if (sheet) {
          sheet.delete();
        }
      }

      await context.sync();
    });
  }

  public async runComprehensiveTest(
    callbacks: IHarnessCallbacks,
    options: ITestHarnessOptions = {},
  ): Promise<void> {
    const {
      onClearHistory,
      onSaveVersion,
      onCompare,
      onStatusUpdate,
      getVersions,
    } = callbacks;
    const {
      upToStep = testSteps.length,
      startFromStep = 1,
      stepDelay = 500,
      actionDelay = 200,
    } = options;

    // Validate step numbers
    const startIndex = Math.max(0, startFromStep - 1);
    const endIndex = Math.min(testSteps.length - 1, upToStep - 1);

    if (startIndex > endIndex) {
      throw new Error(
        `Invalid step range: startFromStep (${startFromStep}) must be <= upToStep (${upToStep})`,
      );
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

      onStatusUpdate(
        `Phase 1/3: Clearing history and creating ${stepsToRun.length} version(s) (steps ${startFromStep}-${upToStep})...`,
      );
      onClearHistory();
      await this.delay(stepDelay);

      // === CRITICAL FIX: Start Event Capture before running actions ===
      onStatusUpdate("Starting Event Capture for Test Run...");
      await excelInteractionService.startChangeTracking();
      // ===============================================================

      for (let i = 0; i < stepsToRun.length; i++) {
        const step = stepsToRun[i];
        const stepNumber = startIndex + i + 1;
        onStatusUpdate(
          `Creating v${
            i + 1
          }/${stepsToRun.length}: ${step.description} (step ${stepNumber})`,
        );

        await step.action();
        await this.delay(actionDelay);
        // The onSaveVersion call (via AppStore) will pop the events captured since the last save
        await onSaveVersion(step.comment);
        await this.delay(stepDelay);
      }

      // === CRITICAL FIX: Stop Capture after loop ===
      await excelInteractionService.stopAndSaveChangeTracking();
      // =============================================

      // Get the definitive state AFTER the creation loop to avoid race conditions.
      const finalVersions = getVersions();
      console.log(
        "[DEV HARNESS] State of 'versions' array AFTER loop and BEFORE comparison:",
        finalVersions,
      );
      debugService.capture("AllVersionsAfterCreation", finalVersions);

      onStatusUpdate("Phase 2/3: Running focused comparison matrix...");
      await this.delay(stepDelay);

      const numVersions = finalVersions.length;
      if (numVersions < 2) {
        onStatusUpdate(
          `Test complete! Only ${numVersions} version(s) created. No comparison run.`,
        );
        console.warn(
          `[DEV HARNESS] Not enough versions (${numVersions}) to run a comparison.`,
        );
        // No throw, just end gracefully.
      } else {
        // The comparison logic now uses the actual number of versions from the state.
        // Compare the first version (index 0) against the last (index numVersions - 1).
        const pairs: [number, number | "current"][] = [[0, numVersions - 1]];
        debugService.addLogEntry("Starting comparison verification phase.", {
          totalPairs: pairs.length,
          generatedPairs: pairs,
          stepsRun: `${startFromStep} to ${upToStep}`,
          totalVersionsCreated: numVersions,
        });

        for (let i = 0; i < pairs.length; i++) {
          const [startIdx, endIdx] = pairs[i];
          onStatusUpdate(
            `Comparing v${startIdx + 1} vs v${
              endIdx === "current" ? "Current" : endIdx + 1
            } (${i + 1}/${pairs.length})`,
          );
          onCompare(startIdx, endIdx);
          await this.delay(actionDelay);
        }
        onStatusUpdate(
          `Test complete! Ran ${stepsToRun.length} step(s). Log file is being saved.`,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("Test harness failed:", error);
      debugService.addLogEntry("Test Harness Failed", { error: errorMessage });
      onStatusUpdate(`Test FAILED: ${errorMessage}. Check console.`);
      
      // Ensure we stop tracking if an error occurs
      try { await excelInteractionService.stopAndSaveChangeTracking(); } catch(e) {}

      throw new Error(`Test harness failed. Check console for details.`);
    } finally {
      debugService.saveLogSession("timeline_resolver_debug_log.json");
    }
  }

  // === NEW HYBRID DIFF TEST RUNNER ===

  public async runHybridDiffTest(
    callbacks: IHarnessCallbacks,
    testCase: IHybridDiffTest,
  ): Promise<void> {
    const { onSaveVersion, onStatusUpdate, getVersions, onCompare } = callbacks;

    debugService.startNewLogSession();
    onStatusUpdate(`Phase 1/4: Setting up baseline for: ${testCase.name}`);

    try {
      // 1. Setup Baseline (v1)
      await Excel.run(async (context) => {
        // Ensure the target sheet exists and is clean
        const sheet = context.workbook.worksheets.getItemOrNullObject(
          testCase.sheetName,
        );
        sheet.load("isNullObject");
        await context.sync();

        if (sheet.isNullObject) {
          context.workbook.worksheets.add(testCase.sheetName);
        }
        await context.sync();

        context.workbook.worksheets.getItem(testCase.sheetName).getRange()
          .clear();
        await context.sync();

        // Execute the setup action to define v1's state
        await testCase.setupAction(context);
        await context.sync();
      });
      await onSaveVersion("v1: Hybrid Baseline");

      await this.delay(200);
      const versions = getVersions();
      const baselineVersionIndex = versions.length - 1;
      if (
        baselineVersionIndex < 0 ||
        versions[baselineVersionIndex].comment !== "v1: Hybrid Baseline"
      ) {
        throw new Error("Baseline version save failed."); // Keep the check, but trust the index
      }

      let actualSheetId: string | null = null;
      const baselineSnapshot = versions[baselineVersionIndex].snapshot;

      // Iterate through the snapshot keys (which are the GUIDs) to find the ID corresponding to the Sheet Name
      for (const id in baselineSnapshot) {
        if (baselineSnapshot[id].name === testCase.sheetName) {
          actualSheetId = id;
          break;
        }
      }

      if (!actualSheetId) {
        throw new Error(
          `Critical Error: Could not find live persistent GUID for sheet '${testCase.sheetName}'.`,
        );
      }

      onStatusUpdate(
        "Phase 2/4: Executing live actions (State update & Mock Event injection)...",
      );

      // Note: Accessing testCase.mockRawEvents (the getter) here generates fresh timestamps 
      // relative to Date.now(), ensuring they are not filtered out by the workflow service.
      const patchedMockEvents = testCase.mockRawEvents.map((event) => ({
        ...event,
        // Overwrite the placeholder ID with the actual live GUID
        worksheetId: actualSheetId!,
      }));

      // 2. Inject Mock Events (Overrides live capture)
      const restoreEvents = excelInteractionService.injectMockEvents(patchedMockEvents);

      try {
        // 3. Execute Live Action to achieve the final state
        await Excel.run(async (context) => {
          await testCase.liveAction(context);
          await context.sync();
        });

        onStatusUpdate(
          "Phase 3/4: Comparing Baseline vs Live (Hybrid Diff Check)...",
        );

        // Trigger the comparison workflow: v1 vs 'current'
        // The ComparisonWorkflowService will use the events we mocked via excelInteractionService
        onCompare(baselineVersionIndex, "current");
        // Wait for the comparison to complete and update the store (relying on async processes)
        await this.delay(500);

        // 4. Validation
        onStatusUpdate("Phase 4/4: Validating Hybrid Diff Results...");

        // Retrieve results from the App Store
        const state = useAppStore.getState();
        const finalResult = state.diffResult;

        if (!finalResult) {
          throw new Error(
            "Comparison did not produce a valid result object. Check synthesizer/workflow logs.",
          );
        }

        // We check the final, filtered results
        const modifiedCells = finalResult.modifiedCells.length;
        const structuralChanges = finalResult.structuralChanges.length;

        if (modifiedCells !== testCase.expectedModifiedCellsCount) {
          throw new Error(
            `Modified Cells validation failed. Expected: ${testCase.expectedModifiedCellsCount}, Got: ${modifiedCells}. (Recalculations should have been filtered).`,
          );
        }
        if (structuralChanges !== testCase.expectedStructuralChangesCount) {
          throw new Error(
            `Structural Changes validation failed. Expected: ${testCase.expectedStructuralChangesCount}, Got: ${structuralChanges}.`,
          );
        }

        onStatusUpdate(
          `Hybrid Diff Test PASSED! Found ${modifiedCells} edits and ${structuralChanges} structural changes.`,
        );
      } finally {
        // 5. Cleanup and Restore
        restoreEvents();
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("Hybrid Diff Test failed:", error);
      debugService.addLogEntry("Hybrid Diff Test Failed", {
        error: errorMessage,
      });
      onStatusUpdate(
        `Hybrid Diff Test FAILED: ${errorMessage}. Check console.`,
      );
      throw new Error(`Test harness failed. Check console for details.`);
    } finally {
      debugService.saveLogSession("hybrid_diff_test_log.json");
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
  public getStepInfo(
    stepNumber: number,
  ): { description: string; comment: string } | null {
    if (stepNumber < 1 || stepNumber > testSteps.length) {
      return null;
    }
    const step = testSteps[stepNumber - 1];
    return {
      description: step.description,
      comment: step.comment,
    };
  }

  /**
   * Returns information about all test steps.
   */
  public getAllStepsInfo(): Array<
    { stepNumber: number; description: string; comment: string }
  > {
    return testSteps.map((step, index) => ({
      stepNumber: index + 1,
      description: step.description,
      comment: step.comment,
    }));
  }
}

export const devHarnessService = new DevHarnessService();