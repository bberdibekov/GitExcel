// src/taskpane/services/timeline.resolver.service.ts

import { IChange, IRowChange, IStructuralChange, IResolvedTimeline, IChangeset } from "../types/types";
import { transformAddress } from "./coordinate.transform.service";
import { fromA1 } from "./address.converter";

/**
 * The "Brain" of the synthesizer. Takes a raw sequence of changesets and produces a
 * clean, resolved history of every event, mapping it to its final coordinates.
 * @param changesetSequence An ordered array of diffs between versions.
 * @returns An IResolvedTimeline object containing the fully mapped history.
 */
export function resolveTimeline(changesetSequence: IChangeset[]): IResolvedTimeline { // Accepts IChangeset[]
  // --- STAGE 1: GATHER ALL RAW EVENTS ---
  const allModificationEvents: IChange[] = [];
  const rawAddedRows = new Map<string, IRowChange>();
  const rawDeletedRows = new Map<string, IRowChange>();
  const chronologicalStructuralChanges: IStructuralChange[] = [];

  for (let i = 0; i < changesetSequence.length; i++) {
    const changeset = changesetSequence[i];
    const futureStructuralChanges = changesetSequence.slice(i + 1).flatMap((c) => c.structuralChanges || []);

    changeset.modifiedCells.forEach(mod => { (mod as any).futureStructuralChanges = futureStructuralChanges; allModificationEvents.push(mod); });
    changeset.addedRows.forEach(row => { const key = `${row.sheet}!${row.rowIndex}`; (row as any).futureStructuralChanges = futureStructuralChanges; rawAddedRows.set(key, row); });
    changeset.deletedRows.forEach(row => { const key = `${row.sheet}!${row.rowIndex}`; rawDeletedRows.set(key, row); });
    chronologicalStructuralChanges.push(...(changeset.structuralChanges || []));
  }

  // --- STAGE 2: RESOLVE FATES AND GROUP ---
  const finalChangeHistory = new Map<string, IChange[]>();

  allModificationEvents.forEach(event => {
    const originalAddressKey = `${event.sheet}!${event.address}`;
    const finalAddress = transformAddress(originalAddressKey, (event as any).futureStructuralChanges);

    if (finalAddress) {
      if (!finalChangeHistory.has(finalAddress)) finalChangeHistory.set(finalAddress, []);
      finalChangeHistory.get(finalAddress)!.push(event);
    } else {
      const coords = fromA1(originalAddressKey)!;
      const originalRowKey = `${coords.sheet}!${coords.row}`;
      const responsibleDeletion = rawDeletedRows.get(originalRowKey);
      if (responsibleDeletion) {
        if (!responsibleDeletion.containedChanges) responsibleDeletion.containedChanges = [];
        responsibleDeletion.containedChanges.push(event);
      }
    }
  });

  const netAddedRows = new Map<string, IRowChange>();
  rawAddedRows.forEach((row, key) => {
    if (!rawDeletedRows.has(key)) {
      netAddedRows.set(key, row);
    }
  });

  const netDeletedRows = new Map<string, IRowChange>();
  rawDeletedRows.forEach((row, key) => {
    if (!rawAddedRows.has(key) || (row.containedChanges && row.containedChanges.length > 0)) {
      netDeletedRows.set(key, row);
    }
  });

  return {
    finalChangeHistory,
    netAddedRows,
    netDeletedRows,
    chronologicalStructuralChanges,
  };
}