// src/taskpane/services/synthesizer.service.ts
import { IDiffResult, IVersion } from "../types/types";
import { debugService } from "./debug.service";
import { resolveTimeline } from "./timeline.resolver.service";
import { consolidateReport } from "./report.consolidator.service";

/**

    The high-level "Orchestrator" for creating a diff between any two non-adjacent versions.
    It uses specialized services to first resolve the complex timeline of events and then
    consolidate that timeline into a final, user-facing report.
    */
export function synthesizeChangesets(
  startVersion: IVersion,
  endVersion: IVersion,
  allVersions: IVersion[],
): IDiffResult {
  const relevantVersions = allVersions.filter((v) =>
    v.id > startVersion.id && v.id <= endVersion.id
  );

  // --- DEEP CLONE THE INPUTS ---
  // The changeset objects are part of the React state and must be treated as immutable.
  // By creating a deep copy, we ensure that the entire synthesis process operates on
  // temporary data and never mutates the original state, preventing the duplication bug.
  const changesetSequence = relevantVersions
    .map((v) => v.changeset)
    .filter((c) => c)
    .map((c) => JSON.parse(JSON.stringify(c))) as IDiffResult[];

  const description =
    `Synthesizing v"${startVersion.id}" vs v"${endVersion.id}"`;
  debugService.addLogEntry(description, {
    startVersion: startVersion.comment,
    endVersion: endVersion.comment,
    changesetCount: changesetSequence.length,
  });

  if (changesetSequence.length === 0) {
    return {
      modifiedCells: [],
      addedRows: [],
      deletedRows: [],
      structuralChanges: [],
    };
  }
  if (changesetSequence.length === 1) {
    return changesetSequence[0];
  }

  // --- STAGE 1 & 2: Resolve the entire timeline of events ---
  // The resolver now operates on the safe, deep-cloned sequence.
  const resolvedTimeline = resolveTimeline(changesetSequence);
  debugService.addLogEntry(
    "Synthesizer Stage 1/2 (Timeline Resolution) Complete",
    {
      finalChangeHistoryKeys: Array.from(
        resolvedTimeline.finalChangeHistory.keys(),
      ),
      netAddedRowsCount: resolvedTimeline.netAddedRows.size,
      netDeletedRowsCount: resolvedTimeline.netDeletedRows.size,
    },
  );

  // --- STAGE 3: Consolidate the resolved timeline into a final report ---
  const finalResult = consolidateReport(resolvedTimeline);
  debugService.addLogEntry(
    "Synthesizer Stage 3 (Report Consolidation) Complete",
    finalResult,
  );

  return finalResult;
}
