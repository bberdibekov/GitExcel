// src/taskpane/features/comparison/services/comparison.workflow.service.ts

import { useAppStore } from "../../../state/appStore";
import { useDialogStore } from "../../../state/dialogStore";
import { synthesizeChangesets } from "./synthesizer.service";
import { debugService } from "../../../core/services/debug.service";
import { excelSnapshotService } from "../../../core/excel/excel.snapshot.service";
import { IRawEvent, IVersion } from "../../../types/types";
import { excelInteractionService } from "../../../core/excel/excel.interaction.service";
import { EventSanitizer } from "../../../core/services/event.sanitizer";

class ComparisonWorkflowService {

  /**
   * Helper to filter the event stream to strictly the window between start and end versions.
   */
  private filterEventsByTimeWindow(events: IRawEvent[], startVersion: IVersion, endVersion: IVersion): IRawEvent[] {
    if (!events || events.length === 0) return [];

    const startTime = typeof startVersion.id === 'number' ? startVersion.id : new Date(startVersion.timestamp).getTime();
    const endTime = typeof endVersion.id === 'number' ? endVersion.id : new Date(endVersion.timestamp).getTime();

    console.group(`[ComparisonWorkflow] 🔍 Event Filtering Analysis`);
    console.log(`Start Bound (v${startVersion.comment}): ${startTime} (${new Date(startTime).toLocaleTimeString()})`);
    console.log(`End Bound   (v${endVersion.comment}): ${endTime} (${new Date(endTime).toLocaleTimeString()})`);
    console.log(`Total Candidate Events: ${events.length}`);

    const filtered = events.filter((e, i) => {
      const eventTime = new Date(e.timestamp).getTime();
      
      // LOGIC: Event must be AFTER Start and ON-OR-BEFORE End
      const isAfterStart = eventTime > startTime;
      const isBeforeEnd = eventTime <= endTime;
      const isKept = isAfterStart && isBeforeEnd;

      // Log the first few and any pertinent structural ones to avoid flooding console
      const isStructural = e.changeType.includes("Row") || e.changeType.includes("Column");
      if (isStructural || i < 5) {
         let status = "✅ KEPT";
         if (!isAfterStart) status = "❌ REJECTED (Too Early)";
         if (!isBeforeEnd) status = "❌ REJECTED (Too Late)";
         
         console.log(`   [${i}] ${e.changeType} @ ${e.address} | Time: ${eventTime} | ${status}`);
      }

      return isKept;
    });

    console.log(`Result: ${filtered.length} events passed filter.`);
    console.groupEnd();

    return filtered;
  }

  public async runComparison(): Promise<void> {
    const { versions, selectedVersions, license, activeFilters } = useAppStore.getState();

    if (selectedVersions.length !== 2 || !license) return;

    const [selection1, selection2] = selectedVersions;
    let startSelectionId: number | string;
    let endSelectionId: number | string;

    if (selection1 === "current" || selection2 === "current") {
      endSelectionId = "current";
      startSelectionId = (selection1 === "current") ? selection2 : selection1;
    } else {
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
    let rawCandidateEvents: IRawEvent[] = []; 

    startVersion = versions.find((v) => v.id === startSelectionId);
    if (!startVersion) {
      console.error("Comparison failed: Could not resolve start version.");
      return;
    }

    if (endSelectionId === "current") {
      console.log("[ComparisonWorkflow] Mode: Safety Check (Live)");
      const rawEvents = excelInteractionService.getRawEvents();
      rawCandidateEvents = EventSanitizer.sanitize(rawEvents);

      try {
        const liveSnapshot = await Excel.run(async (context) => {
          return await excelSnapshotService.createWorkbookSnapshot(context);
        });
        endVersion = {
          id: Date.now(), 
          comment: "Current Workbook",
          timestamp: new Date().toISOString(), 
          snapshot: liveSnapshot,
        };
      } catch (error) {
        console.error("Failed to snapshot live workbook:", error);
        return;
      }
    } else {
      endVersion = versions.find((v) => v.id === endSelectionId);
      if (endVersion) {
        if (endVersion.eventLog && endVersion.eventLog.length > 0) {
            console.log(`[ComparisonWorkflow] Mode: Audit Trail. Using persisted log from target version.`);
            rawCandidateEvents = endVersion.eventLog; 
        } else {
            console.warn(`[ComparisonWorkflow] Mode: Audit Trail. No event log found.`);
        }
      }
    }

    if (!endVersion) return;

    // === CRITICAL FILTERING STEP ===
    const filteredEvents = this.filterEventsByTimeWindow(rawCandidateEvents, startVersion, endVersion);

    const result = synthesizeChangesets(
      startVersion,
      endVersion,
      versions,
      license,
      activeFilters,
      filteredEvents, 
    );
    debugService.addLogEntry(
      `Comparison Ran: "${startVersion.comment}" vs "${endVersion.comment}"`,
      result,
    );

    const payloadForDialog = {
      diffResult: result,
      licenseTier: license.tier,
      startSnapshot: startVersion.snapshot,
      endSnapshot: endVersion.snapshot,
      startVersionComment: startVersion.comment,
      endVersionComment: endVersion.comment,
    };

    await useDialogStore.getState().openDiffViewer(payloadForDialog);
    useAppStore.getState()._setComparisonResult({
      result: result,
      startSnapshot: startVersion.snapshot,
      endSnapshot: endVersion.snapshot,
    });
  }

  public async compareWithPrevious(versionId: number): Promise<void> {
    const versions = useAppStore.getState().versions;
    const currentIndex = versions.findIndex((v) => v.id === versionId);
    if (currentIndex > 0) {
      const previousVersionId = versions[currentIndex - 1].id;
      useAppStore.getState().selectVersion(previousVersionId);
      useAppStore.getState().selectVersion(versionId);
      await this.runComparison();
    }
  }
}

export const comparisonWorkflowService = new ComparisonWorkflowService();