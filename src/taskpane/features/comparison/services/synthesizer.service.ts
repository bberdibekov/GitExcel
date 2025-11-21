// src/taskpane/features/comparison/services/synthesizer.service.ts
import {
  IChangeset,
  IDiffResult,
  IRawEvent,
  IVersion,
  SheetId,
  SheetName,
} from "../../../types/types"; // NEW IMPORT
import { debugService } from "../../../core/services/debug.service";
import { resolveTimeline } from "./timeline.resolver.service";
import { consolidateReport } from "./report.consolidator.service";
import { diffSnapshots } from "./diff.service";
import { ILicense } from "../../../core/services/AuthService";

/**

    The high-level "Orchestrator" for creating a diff between any two non-adjacent versions.
    */
export function synthesizeChangesets(
  startVersion: IVersion,
  endVersion: IVersion,
  allVersions: IVersion[],
  license: ILicense,
  activeFilterIds: Set<string>,
  // === NEW ARGUMENT ===
  sanitizedEvents: IRawEvent[] = [],
  // ====================
): IDiffResult {
  const relevantVersions = allVersions.filter((v) =>
    v.id >= startVersion.id && v.id <= endVersion.id
  );

  // NOTE: If endVersion is the 'current' workbook, it will NOT be in allVersions.
  // We must ensure the endVersion passed to this function is included as the final step.
  if (endVersion.id === startVersion.id && relevantVersions.length === 0) {
    // Edge case: comparing A to A, or something went wrong.
    return {
      modifiedCells: [],
      addedRows: [],
      deletedRows: [],
      structuralChanges: [],
    };
  }

  let sequenceToDiff = relevantVersions;
  let isLiveComparison = false;

  if (
    relevantVersions.length > 0 &&
    relevantVersions[relevantVersions.length - 1].id !== endVersion.id
  ) {
    // This means the endVersion is the live snapshot, which must be tacked on last.
    sequenceToDiff = [...relevantVersions, endVersion];
    isLiveComparison = true;
  }

  if (sequenceToDiff.length < 2) {
    // Handle the case where only one version is provided (e.g., comparing live to its immediate predecessor)
    if (sequenceToDiff.length === 1 && endVersion.id === sequenceToDiff[0].id) {
      // If the list contained only the start version, and the end version is also the start version, this is an error.
      return {
        modifiedCells: [],
        addedRows: [],
        deletedRows: [],
        structuralChanges: [],
      };
    }
    // If sequence is [v_start, v_end] where v_end is live, sequenceToDiff.length will be 2.
  }

  const description =
    `Synthesizing v"${startVersion.id}" vs v"${endVersion.id}"`;
  debugService.addLogEntry(description, {
    startVersion: startVersion.comment,
    endVersion: endVersion.comment,
    relevantVersionCount: sequenceToDiff.length,
    activeFilterIds: Array.from(activeFilterIds),
  });

  const changesetSequence: IChangeset[] = [];

  for (let i = 0; i < sequenceToDiff.length - 1; i++) {
    const fromVersion = sequenceToDiff[i];
    const toVersion = sequenceToDiff[i + 1];

    
    // Always pass the provided event log to the FINAL comparison step.
    // In "Safety Check" mode, this passes the live events to the Live Snapshot comparison.
    // In "Audit Trail" mode, this passes the persisted V2 events to the V1->V2 comparison.
    const isFinalStep = i === sequenceToDiff.length - 2;
    const eventsForDiff = isFinalStep ? sanitizedEvents : [];

    const changeset = diffSnapshots(
      fromVersion.snapshot,
      toVersion.snapshot,
      license,
      activeFilterIds,
      fromVersion.comment,
      toVersion.comment,
      eventsForDiff,
    );
    debugService.addLogEntry(
      `[Synthesizer] Generated Changeset ${i + 1}/${
        sequenceToDiff.length - 1
      } (${fromVersion.comment} -> ${toVersion.comment})`,
      {
        summary: {
          modifiedCells: changeset.modifiedCells.length,
          addedRows: changeset.addedRows.length,
          deletedRows: changeset.deletedRows.length,
          structuralChanges: changeset.structuralChanges.length,
        },
        structuralChangeDetails: changeset.structuralChanges,
        isPartial: changeset.isPartialResult,
      },
    );
    changesetSequence.push(changeset);
  }

  if (changesetSequence.length === 0) {
    debugService.addLogEntry(
      "Synthesizer detected no changesets; returning empty result.",
      {},
    );
    return {
      modifiedCells: [],
      addedRows: [],
      deletedRows: [],
      structuralChanges: [],
    };
  }

  // --- Create the name map BEFORE calling the resolver ---
  const sheetIdToFinalNameMap = new Map<SheetId, SheetName>();
  // We iterate over the entire sequence, including the final endVersion snapshot, to get final names.
  for (const version of sequenceToDiff) {
    for (const sheetId in version.snapshot) {
      sheetIdToFinalNameMap.set(
        sheetId as SheetId,
        version.snapshot[sheetId].name,
      );
    }
  }

  const lastChangeset = changesetSequence[changesetSequence.length - 1];
  const isPartial = lastChangeset.isPartialResult;
  const hiddenCount = lastChangeset.hiddenChangeCount;

  // --- Pass the name map into the resolver for better logging ---
  const resolvedTimeline = resolveTimeline(
    changesetSequence,
    sheetIdToFinalNameMap,
  );

  const translatedKeysForLog = Array.from(
    resolvedTimeline.finalChangeHistory.keys(),
  ).map((key) => {
    const [sheetId, cell] = key.split("!");
    const sheetName = sheetIdToFinalNameMap.get(sheetId as SheetId) ||
      `[${sheetId}]`;
    return `${sheetName}!${cell}`;
  });

  debugService.addLogEntry(
    "Synthesizer Stage 1/2 (Timeline Resolution) Complete",
    {
      finalChangeHistoryCount: resolvedTimeline.finalChangeHistory.size,
      finalChangeHistoryKeys: translatedKeysForLog,
      chronologicalRowEventCount:
        resolvedTimeline.chronologicalRowEvents.length,
      chronologicalStructuralChangeCount:
        resolvedTimeline.chronologicalStructuralChanges.length,
    },
  );

  const finalResult = consolidateReport(
    resolvedTimeline,
    sheetIdToFinalNameMap,
  );

  debugService.addLogEntry(
    "Synthesizer Stage 2/2 (Report Consolidation) Complete",
    {
      summary: {
        modifiedCellsCount: finalResult.modifiedCells.length,
        addedRowsCount: finalResult.addedRows.length,
        deletedRowsCount: finalResult.deletedRows.length,
        structuralChangesCount: finalResult.structuralChanges.length,
      },
      finalModifiedCellAddresses: finalResult.modifiedCells.map((c) =>
        `${c.sheet}!${c.address}`
      ),
    },
  );

  finalResult.isPartialResult = isPartial;
  finalResult.hiddenChangeCount = hiddenCount;

  return finalResult;
}
