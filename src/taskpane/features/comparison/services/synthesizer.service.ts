// src/taskpane/features/comparison/services/synthesizer.service.ts
import { IDiffResult, IVersion, IChangeset, SheetId, SheetName } from "../../../types/types";
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

  const changesetSequence: IChangeset[] = [];
  for (let i = 0; i < relevantVersions.length - 1; i++) {
    const fromVersion = relevantVersions[i];
    const toVersion = relevantVersions[i+1];
    const changeset = diffSnapshots(
      fromVersion.snapshot,
      toVersion.snapshot,
      license,
      activeFilterIds
    );
    // --- START: ADDED DEBUG LOGGING ---
    console.log(`[SYNTHESIZER] CHANGESET LOG: ${fromVersion.comment} -> ${toVersion.comment}`, {
        modifiedCells: changeset.modifiedCells.length,
        addedRows: changeset.addedRows.length,
        deletedRows: changeset.deletedRows.length,
        structuralChanges: changeset.structuralChanges, // <-- VERY IMPORTANT
        isPartial: changeset.isPartialResult
    });
    // --- END: ADDED DEBUG LOGGING ---
    changesetSequence.push(changeset);
  }
  
  const description = `Synthesizing v"${startVersion.id}" vs v"${endVersion.id}"`;
  debugService.addLogEntry(description, {
    startVersion: startVersion.comment,
    endVersion: endVersion.comment,
    changesetCount: changesetSequence.length,
    activeFilterIds: Array.from(activeFilterIds),
  });

  if (changesetSequence.length === 0) {
    return { modifiedCells: [], addedRows: [], deletedRows: [], structuralChanges: [] };
  }
  
  // --- Create the name map BEFORE calling the resolver ---
  const sheetIdToFinalNameMap = new Map<SheetId, SheetName>();
  for (const version of relevantVersions) {
    for (const sheetId in version.snapshot) {
      sheetIdToFinalNameMap.set(sheetId as SheetId, version.snapshot[sheetId].name);
    }
  }

  const lastChangeset = changesetSequence[changesetSequence.length - 1];
  const isPartial = lastChangeset.isPartialResult;
  const hiddenCount = lastChangeset.hiddenChangeCount;

  // --- Pass the name map into the resolver for better logging ---
  const resolvedTimeline = resolveTimeline(changesetSequence, sheetIdToFinalNameMap);
  
  // --- START: ADDED DEBUG LOGGING ---
  console.log('[SYNTHESIZER] TIMELINE LOG:', {
      finalChangeHistoryCount: resolvedTimeline.finalChangeHistory.size,
      finalChangeHistoryKeys: Array.from(resolvedTimeline.finalChangeHistory.keys()), // See what cells are being tracked
      chronologicalRowEventCount: resolvedTimeline.chronologicalRowEvents.length,
      chronologicalStructuralChangeCount: resolvedTimeline.chronologicalStructuralChanges.length,
  });
  // --- END: ADDED DEBUG LOGGING ---
  
  // --- Translate the keys for this log entry ---
  const translatedKeys = Array.from(resolvedTimeline.finalChangeHistory.keys()).map(key => {
    const [sheetId, cell] = key.split('!');
    const sheetName = sheetIdToFinalNameMap.get(sheetId as SheetId) || sheetId;
    return `${sheetName}!${cell}`;
  });

  debugService.addLogEntry(
    "Synthesizer Stage 1/2 (Timeline Resolution) Complete",
    {
      finalChangeHistoryKeys: translatedKeys, // Use translated keys
      chronologicalRowEventCount: resolvedTimeline.chronologicalRowEvents.length,
    },
  );

  const finalResult = consolidateReport(resolvedTimeline, sheetIdToFinalNameMap);

  // --- START: ADDED DEBUG LOGGING ---
  console.log('[SYNTHESIZER] FINAL RESULT LOG:', {
    modifiedCells: finalResult.modifiedCells.length,
    addedRows: finalResult.addedRows.length,
    deletedRows: finalResult.deletedRows.length,
    structuralChanges: finalResult.structuralChanges.length,
  });
  // --- END: ADDED DEBUG LOGGING ---
  
  debugService.addLogEntry(
    "Synthesizer Stage 2/2 (Report Consolidation) Complete",
    {
      summary: {
        modifiedCellsCount: finalResult.modifiedCells.length,
        addedRowsCount: finalResult.addedRows.length,
        deletedRowsCount: finalResult.deletedRows.length,
        structuralChangesCount: finalResult.structuralChanges.length,
      },
      finalModifiedCellAddresses: finalResult.modifiedCells.map(c => `${c.sheet}!${c.address}`)
    }
  );

  finalResult.isPartialResult = isPartial;
  finalResult.hiddenChangeCount = hiddenCount;

  return finalResult;
}