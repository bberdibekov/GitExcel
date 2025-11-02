// src/taskpane/features/comparison/services/comparison.workflow.service.ts

import { useAppStore } from "../../../state/appStore";
import { useDialogStore } from "../../../state/dialogStore";
import { synthesizeChangesets } from "./synthesizer.service";
import { debugService } from "../../../core/services/debug.service";
import { excelSnapshotService } from "../../../core/excel/excel.snapshot.service";
import { IVersion } from "../../../types/types";

/**
 * A stateless service to orchestrate the complex "Run Comparison" workflow.
 * It intelligently handles two modes:
 *  1. "Audit Trail" (Historical vs. Historical)
 *  2. "Safety Check" (Live vs. Historical)
 */
class ComparisonWorkflowService {
  /**
   * Runs a comparison based on the current selections in the appStore.
   * This is now the primary entry point for all comparisons.
   */
  public async runComparison(): Promise<void> {
    const { versions, selectedVersions, license, activeFilters } = useAppStore.getState();

    if (selectedVersions.length !== 2 || !license) {
      return;
    }

    // Correctly determine the start and end versions regardless of selection order.
    const [selection1, selection2] = selectedVersions;
    let startSelectionId: number | string;
    let endSelectionId: number | string;

    if (selection1 === 'current' || selection2 === 'current') {
      // "Safety Check" mode: 'current' is always the end version.
      endSelectionId = 'current';
      startSelectionId = (selection1 === 'current') ? selection2 : selection1;
    } else {
      // "Audit Trail" mode: Compare the numeric IDs (timestamps) to find the true start and end.
      if (selection1 > selection2) {
        endSelectionId = selection1;
        startSelectionId = selection2;
      } else {
        endSelectionId = selection2;
        startSelectionId = selection1;
      }
    }

    let startVersion: IVersion | undefined;
    let endVersion: IVersion | undefined;
    
    // --- Part 1: Resolve the Start Version (must be historical) ---
    startVersion = versions.find(v => v.id === startSelectionId);
    if (!startVersion) {
        console.error("Comparison failed: Could not resolve start version.");
        return;
    }

    // --- Part 2: Resolve the End Version (could be historical or live) ---
    if (endSelectionId === 'current') {
      // --- "SAFETY CHECK" MODE ---
      console.log("[ComparisonWorkflow] Running in 'Safety Check' mode (Live vs. Historical)");
      try {
        const liveSnapshot = await Excel.run(async (context) => {
            return await excelSnapshotService.createWorkbookSnapshot(context);
        });
        // Create a temporary, in-memory IVersion object for the live workbook
        endVersion = {
            id: Date.now(),
            comment: "Current Workbook",
            timestamp: new Date().toLocaleString(),
            snapshot: liveSnapshot,
        };
      } catch (error) {
        console.error("Failed to create snapshot of current workbook:", error);
        return; // Exit if we can't snapshot the live sheet
      }
    } else {
      // --- "AUDIT TRAIL" MODE ---
      console.log("[ComparisonWorkflow] Running in 'Audit Trail' mode (Historical vs. Historical)");
      endVersion = versions.find(v => v.id === endSelectionId);
    }
    
    if (!endVersion) {
      console.error("Comparison failed: Could not resolve end version.");
      return;
    }

    // --- Part 3: Execute the comparison (unchanged logic, but with dynamically resolved versions) ---
    const result = synthesizeChangesets(startVersion, endVersion, versions, license, activeFilters);
    debugService.addLogEntry(`Comparison Ran: "${startVersion.comment}" vs "${endVersion.comment}"`, result);

    const payloadForDialog = {
        diffResult: result,
        licenseTier: license.tier,
        startSnapshot: startVersion.snapshot,
        endSnapshot: endVersion.snapshot,
        // --- [NEW] Add the version comments to the payload ---
        startVersionComment: startVersion.comment,
        endVersionComment: endVersion.comment,
    };

    // --- FIX: This now calls the correct method on the dialogStore ---
    // Command the dialogStore to open with our rich payload
    await useDialogStore.getState().openDiffViewer(payloadForDialog);
    
    const comparisonPayload = {
        result: result,
        startSnapshot: startVersion.snapshot,
        endSnapshot: endVersion.snapshot
    };
    
    // This logic is preserved from your original code.
    useAppStore.getState()._setComparisonResult(comparisonPayload);
  }

  /**
   * A helper method to compare a version with its immediate predecessor.
   */
  public async compareWithPrevious(versionId: number): Promise<void> {
    const versions = useAppStore.getState().versions;
    const currentIndex = versions.findIndex(v => v.id === versionId);
    if (currentIndex > 0) {
      const previousVersionId = versions[currentIndex - 1].id;
      // Manually set the selection and run the main comparison logic
      useAppStore.getState().selectVersion(previousVersionId);
      useAppStore.getState().selectVersion(versionId);
      await this.runComparison();
    }
  }
}

export const comparisonWorkflowService = new ComparisonWorkflowService();