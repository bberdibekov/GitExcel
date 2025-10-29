// src/taskpane/features/comparison/services/comparison.workflow.service.ts

import { useAppStore } from "../../../state/appStore";
import { useDialogStore } from "../../../state/dialogStore";
import { synthesizeChangesets } from "./synthesizer.service";
import { debugService } from "../../../core/services/debug.service";

/**
 * A stateless service to orchestrate the complex "Run Comparison" workflow.
 * It reads from and dispatches actions to the state stores, but holds no state itself.
 */
class ComparisonWorkflowService {
  public runComparison(startIndex?: number, endIndex?: number): void {
    // 1. Get required state directly from the stores.
    const { versions, selectedVersions, license, activeFilters } = useAppStore.getState();
    
    let finalStartIndex = startIndex;
    let finalEndIndex = endIndex;

    if (finalStartIndex === undefined || finalEndIndex === undefined) {
      if (selectedVersions.length !== 2) return;
      const sortedIds = [...selectedVersions].sort((a, b) => a - b);
      finalStartIndex = versions.findIndex(v => v.id === sortedIds[0]);
      finalEndIndex = versions.findIndex(v => v.id === sortedIds[1]);
    }
    
    const startVersion = versions[finalStartIndex!];
    const endVersion = versions[finalEndIndex!];

    if (!startVersion || !endVersion || !license) {
      return;
    }

    // 2. Execute the core business logic.
    const result = synthesizeChangesets(startVersion, endVersion, versions, license, activeFilters);
    debugService.addLogEntry(`Comparison Ran: "${startVersion.comment}" vs "${endVersion.comment}"`, result);

    // 3. Command the dialogStore to perform its specialized action.
    useDialogStore.getState().open("diff-viewer", {
      diffResult: result,
      licenseTier: license.tier,
    });
    
    // 4. Command the appStore to update its state with the outcome.
    // This is the line that causes the error until appStore.ts is updated.
    useAppStore.getState()._setComparisonResult(result, { start: finalStartIndex!, end: finalEndIndex! });
  }

  public compareWithPrevious(versionId: number): void{
    const versions = useAppStore.getState().versions;
    const currentIndex = versions.findIndex(v => v.id === versionId);
    if (currentIndex > 0) {
      this.runComparison(currentIndex - 1, currentIndex);
    }
  }
}

// Export a singleton instance for easy use in components.
export const comparisonWorkflowService = new ComparisonWorkflowService();