// src/taskpane/services/synthesizer.service.ts
import { IDiffResult, IVersion, IChangeset } from "../types/types";
import { debugService } from "./debug.service";
import { resolveTimeline } from "./timeline.resolver.service";
import { consolidateReport } from "./report.consolidator.service";

/**
 * The high-level "Orchestrator" for creating a diff between any two non-adjacent versions.
 */
export function synthesizeChangesets(
  startVersion: IVersion,
  endVersion: IVersion,
  allVersions: IVersion[],
): IDiffResult {
  const relevantVersions = allVersions.filter((v) =>
    v.id > startVersion.id && v.id <= endVersion.id
  );

  const changesetSequence = relevantVersions
    .map((v) => v.changeset)
    .filter((c) => c)
    .map((c) => JSON.parse(JSON.stringify(c))) as IChangeset[];
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

  const finalResult = consolidateReport(resolvedTimeline, startVersion.snapshot);
  debugService.addLogEntry(
    "Synthesizer Stage 3 (Report Consolidation) Complete",
    finalResult,
  );

  return finalResult;
}