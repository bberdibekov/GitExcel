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

  const changesetSequence: IChangeset[] = [];
  for (let i = 0; i < relevantVersions.length - 1; i++) {
    const changeset = diffSnapshots(
      relevantVersions[i].snapshot, 
      relevantVersions[i + 1].snapshot, 
      license, 
      activeFilterIds
    );
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
  
  // --- MODIFIED: Create the name map BEFORE calling the resolver ---
  const sheetIdToFinalNameMap = new Map<string, string>();
  for (const version of relevantVersions) {
    for (const sheetId in version.snapshot) {
      sheetIdToFinalNameMap.set(sheetId, version.snapshot[sheetId].name);
    }
  }

  const lastChangeset = changesetSequence[changesetSequence.length - 1];
  const isPartial = lastChangeset.isPartialResult;
  const hiddenCount = lastChangeset.hiddenChangeCount;

  // --- MODIFIED: Pass the name map into the resolver for better logging ---
  const resolvedTimeline = resolveTimeline(changesetSequence, sheetIdToFinalNameMap);
  
  // --- MODIFIED: Translate the keys for this log entry ---
  const translatedKeys = Array.from(resolvedTimeline.finalChangeHistory.keys()).map(key => {
    const [sheetId, cell] = key.split('!');
    const sheetName = sheetIdToFinalNameMap.get(sheetId) || sheetId;
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