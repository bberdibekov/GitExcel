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

  const description = `Synthesizing v"${startVersion.id}" vs v"${endVersion.id}"`;
  debugService.addLogEntry(description, {
    startVersion: startVersion.comment,
    endVersion: endVersion.comment,
    relevantVersionCount: relevantVersions.length,
    activeFilterIds: Array.from(activeFilterIds,


    ),
  });

  const changesetSequence: IChangeset[] = [];
  for (let i = 0; i < relevantVersions.length - 1; i++) {
    const fromVersion = relevantVersions[i];
    const toVersion = relevantVersions[i+1];
    const changeset = diffSnapshots(
      fromVersion.snapshot,
      toVersion.snapshot,
      license,
      activeFilterIds,
      fromVersion.comment,
      toVersion.comment
    );
    debugService.addLogEntry(`[Synthesizer] Generated Changeset ${i + 1}/${relevantVersions.length - 1} (${fromVersion.comment} -> ${toVersion.comment})`, {
        summary: {
            modifiedCells: changeset.modifiedCells.length,
            addedRows: changeset.addedRows.length,
            deletedRows: changeset.deletedRows.length,
            structuralChanges: changeset.structuralChanges.length,
        },
        structuralChangeDetails: changeset.structuralChanges,
        isPartial: changeset.isPartialResult
    });
    changesetSequence.push(changeset);
  }
  
  if (changesetSequence.length === 0) {
    debugService.addLogEntry("Synthesizer detected no changesets; returning empty result.", {});
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
  const translatedKeysForLog = Array.from(resolvedTimeline.finalChangeHistory.keys()).map(key => {
    const [sheetId, cell] = key.split('!');
    const sheetName = sheetIdToFinalNameMap.get(sheetId as SheetId) || `[${sheetId}]`;
    return `${sheetName}!${cell}`;
  });

  debugService.addLogEntry(
    "Synthesizer Stage 1/2 (Timeline Resolution) Complete",
    {
      finalChangeHistoryCount: resolvedTimeline.finalChangeHistory.size,
      finalChangeHistoryKeys: translatedKeysForLog,
      chronologicalRowEventCount: resolvedTimeline.chronologicalRowEvents.length,
      chronologicalStructuralChangeCount: resolvedTimeline.chronologicalStructuralChanges.length,
    },
  );
  // --- END: ADDED DEBUG LOGGING ---

  const finalResult = consolidateReport(resolvedTimeline, sheetIdToFinalNameMap);

  // --- START: ADDED DEBUG LOGGING ---
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
  // --- END: ADDED DEBUG LOGGING ---

  finalResult.isPartialResult = isPartial;
  finalResult.hiddenChangeCount = hiddenCount;

  return finalResult;
}