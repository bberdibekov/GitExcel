// src/taskpane/services/synthesizer.service.ts
import { IDiffResult, IVersion, IChangeset } from "../../../types/types";
import { debugService } from "../../../core/services/debug.service";
import { resolveTimeline } from "./timeline.resolver.service";
import { consolidateReport } from "./report.consolidator.service";
import { diffSnapshots } from "./diff.service";
import { ILicense } from "../../../core/services/AuthService";



/**
 * The high-level "Orchestrator" for creating a diff between any two non-adjacent versions.
 */
export function synthesizeChangesets(
  startVersion: IVersion,
  endVersion: IVersion,
  allVersions: IVersion[],
  license: ILicense,
  activeFilterIds: Set<string>
  
): IDiffResult {
  const relevantVersions = allVersions.filter((v) =>
    v.id >= startVersion.id && v.id <= endVersion.id
  );

  
  // Generate changesets on the fly using the provided filters and license.
  const changesetSequence: IChangeset[] = [];
  for (let i = 0; i < relevantVersions.length - 1; i++) {
    const fromVersion = relevantVersions[i];
    const toVersion = relevantVersions[i + 1];
    const changeset = diffSnapshots(
      fromVersion.snapshot, 
      toVersion.snapshot, 
      license, 
      activeFilterIds
    );
    changesetSequence.push(changeset);
  }
  
  
  const description =
    `Synthesizing v"${startVersion.id}" vs v"${endVersion.id}"`;
  debugService.addLogEntry(description, {
    startVersion: startVersion.comment,
    endVersion: endVersion.comment,
    changesetCount: changesetSequence.length,
    activeFilterIds: Array.from(activeFilterIds), // Log active filters
  });

  if (changesetSequence.length === 0) {
    return {
      modifiedCells: [],
      addedRows: [],
      deletedRows: [],
      structuralChanges: [],
    };
  }
  
  // --- PAYWALL LOGIC (FEAT-005) ---
  // Check if the final changeset in the sequence is a partial result.
  const lastChangeset = changesetSequence[changesetSequence.length - 1];
  const isPartial = lastChangeset.isPartialResult;
  const hiddenCount = lastChangeset.hiddenChangeCount;
  // --- END PAYWALL LOGIC ---

  const resolvedTimeline = resolveTimeline(changesetSequence);
  
  debugService.addLogEntry(
    "Synthesizer Stage 1/2 (Timeline Resolution) Complete",
    {
      finalChangeHistoryKeys: Array.from(
        resolvedTimeline.finalChangeHistory.keys(),
      ),
      chronologicalRowEventCount: resolvedTimeline.chronologicalRowEvents.length,
    },
  );

  // Create a map of Sheet ID -> Final Sheet Name ---
  // By iterating chronologically, the map will automatically contain the latest known name for every sheet ID.
  const sheetIdToFinalNameMap = new Map<string, string>();
  for (const version of relevantVersions) {
    for (const sheetId in version.snapshot) {
      sheetIdToFinalNameMap.set(sheetId, version.snapshot[sheetId].name);
    }
  }
  // --- MODIFIED: Pass the new map to the consolidator ---
  const finalResult = consolidateReport(resolvedTimeline, sheetIdToFinalNameMap);
  debugService.addLogEntry(
    "Synthesizer Stage 2/2 (Report Consolidation) Complete", // <-- Corrected stage number
    finalResult,
  );

  // --- PAYWALL LOGIC (FEAT-005) ---
  // Attach the paywall flags to the final result object for the UI.
  finalResult.isPartialResult = isPartial;
  finalResult.hiddenChangeCount = hiddenCount;
  // --- END PAYWALL LOGIC ---

  return finalResult;
}