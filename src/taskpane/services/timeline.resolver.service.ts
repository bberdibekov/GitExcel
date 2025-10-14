// src/taskpane/services/timeline.resolver.service.ts

import { IDiffResult, IChange, IRowChange, IStructuralChange, IResolvedTimeline } from "../types/types";
import { transformAddress } from "./coordinate.transform.service";
import { fromA1 } from "./address.converter";

/**
 * The "Brain" of the synthesizer. Takes a raw sequence of changesets and produces a
 * clean, resolved history of every event, mapping it to its final coordinates.
 * @param changesetSequence An ordered array of diffs between versions.
 * @returns An IResolvedTimeline object containing the fully mapped history.
 */
export function resolveTimeline(changesetSequence: IDiffResult[]): IResolvedTimeline {
  // --- STAGE 1: GATHER ALL RAW EVENTS ---
  // Aggregate every individual event from the entire sequence into master lists.
  const allModificationEvents: IChange[] = [];
  const rawAddedRows = new Map<string, IRowChange>();
  const rawDeletedRows = new Map<string, IRowChange>();
  const chronologicalStructuralChanges: IStructuralChange[] = [];

  for (let i = 0; i < changesetSequence.length; i++) {
    const changeset = changesetSequence[i];
    // For each event, we calculate the list of structural changes that happen *after* it.
    const futureStructuralChanges = changesetSequence.slice(i + 1).flatMap((c) => c.structuralChanges || []);

    // Tag each event with the transformations it will undergo.
    changeset.modifiedCells.forEach(mod => { (mod as any).futureStructuralChanges = futureStructuralChanges; allModificationEvents.push(mod); });
    changeset.addedRows.forEach(row => { const key = `${row.sheet}!${row.rowIndex}`; (row as any).futureStructuralChanges = futureStructuralChanges; rawAddedRows.set(key, row); });
    changeset.deletedRows.forEach(row => { const key = `${row.sheet}!${row.rowIndex}`; rawDeletedRows.set(key, row); });
    chronologicalStructuralChanges.push(...(changeset.structuralChanges || []));
  }

  // --- STAGE 2: RESOLVE FATES AND GROUP ---
  // Now, determine where each event ends up and group them by their final destination.
  const finalChangeHistory = new Map<string, IChange[]>();

  allModificationEvents.forEach(event => {
    const originalAddressKey = `${event.sheet}!${event.address}`;
    // Use the transformation service to find the cell's final address.
    const finalAddress = transformAddress(originalAddressKey, (event as any).futureStructuralChanges);

    if (finalAddress) {
      // The cell survived. Add its modification event to its history.
      if (!finalChangeHistory.has(finalAddress)) finalChangeHistory.set(finalAddress, []);
      finalChangeHistory.get(finalAddress)!.push(event);
    } else {
      // The cell was part of a deleted row/column. Find the deletion event
      // that was responsible and attach this modification to its "contained history".
      const coords = fromA1(originalAddressKey)!;
      const originalRowKey = `${coords.sheet}!${coords.row}`;
      const responsibleDeletion = rawDeletedRows.get(originalRowKey);
      if (responsibleDeletion) {
        if (!responsibleDeletion.containedChanges) responsibleDeletion.containedChanges = [];
        responsibleDeletion.containedChanges.push(event);
      }
    }
  });

  // Calculate the "net" changes for rows.
  const netAddedRows = new Map<string, IRowChange>();
  rawAddedRows.forEach((row, key) => {
    if (!rawDeletedRows.has(key)) {
      netAddedRows.set(key, row);
    }
  });

  const netDeletedRows = new Map<string, IRowChange>();
  rawDeletedRows.forEach((row, key) => {
    // A row is considered truly deleted if it was never re-added, OR if it was
    // a "temporary" row that had important changes before it was deleted.
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