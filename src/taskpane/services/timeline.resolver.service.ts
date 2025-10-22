// src/taskpane/services/timeline.resolver.service.ts

import { IChange, IRowChange, IStructuralChange, IResolvedTimeline, IChangeset, IRowEvent } from "../types/types"; // MODIFIED: Import IRowEvent
import { transformAddress } from "./coordinate.transform.service";
import { debugService } from "./debug.service"; 

/**
 * The "Brain" of the synthesizer. Takes a raw sequence of changesets and produces a
 * clean, resolved history of every event by simulating the timeline of changes.
 * This is a stateful process that tracks each cell's identity over time.
 * 
 * @param changesetSequence An ordered array of diffs between versions.
 * @returns An IResolvedTimeline object containing the fully mapped history.
 */
export function resolveTimeline(changesetSequence: IChangeset[]): IResolvedTimeline {
  // The core of our new stateful engine. 
  // The key is the *current* A1 address of a cell, and the value is its complete history.
  let cellHistoryTracker = new Map<string, IChange[]>();

  // --- MODIFIED (REFACTOR): We no longer track 'net' changes.
  // We now keep a simple, chronological ledger of every single row event.
  const chronologicalRowEvents: IRowEvent[] = [];

  // Keep a clean, chronological list of structural changes for the final report.
  const chronologicalStructuralChanges: IStructuralChange[] = [];

  // --- STATEFUL PLAYBACK ---
  // Process each changeset chronologically, updating our state at each step.
  for (let i = 0; i < changesetSequence.length; i++) {
    const changeset = changesetSequence[i];

    debugService.addLogEntry(`Timeline Resolver: Processing Changeset ${i + 1}/${changesetSequence.length}`, {
      changeset: {
        modifiedCells: changeset.modifiedCells.map(c => c.address),
        addedRows: changeset.addedRows.length,
        deletedRows: changeset.deletedRows.length,
        structuralChanges: changeset.structuralChanges,
      }
    });
    
    // --- REFACTORED (BUGFIX): The order of operations is now correct and critical. ---
    // We must follow a strict "Terminate -> Transform -> Modify" sequence.

    // STEP 1: TERMINATE HISTORY. Process deletions against the CURRENT state of the grid.
    changeset.deletedRows.forEach(deletedRow => {
      // --- MODIFIED (REFACTOR): No more cancellation. Just record the event.
      chronologicalRowEvents.push({ type: 'delete', data: deletedRow });
      
      deletedRow.containedChanges = [];
      const rowSheet = deletedRow.sheet;
      const rowIndex = deletedRow.rowIndex;
      
      for (const [addressKey, history] of cellHistoryTracker.entries()) {
        if (addressKey.startsWith(`${rowSheet}!`) && history.length > 0) {
            const cellRowIndex = parseInt(addressKey.match(/\d+$/)![0], 10) - 1;
            if (cellRowIndex === rowIndex) {
                deletedRow.containedChanges.push(...history);
                cellHistoryTracker.delete(addressKey);
            }
        }
      }
    });

    // STEP 2: TRANSFORM STATE. Remap the addresses of all SURVIVING cells.
    if (changeset.structuralChanges.length > 0) {
      chronologicalStructuralChanges.push(...changeset.structuralChanges);

      debugService.capture(`CellTracker_Before_Transform (Changeset ${i + 1})`, Array.from(cellHistoryTracker.entries()));

      const newCellHistoryTracker = new Map<string, IChange[]>();
      
      for (const [currentAddress, history] of cellHistoryTracker.entries()) {
        const newAddress = transformAddress(currentAddress, changeset.structuralChanges);
        if (newAddress) {
          newCellHistoryTracker.set(newAddress, history);
        }
      }
      
      debugService.capture(`CellTracker_After_Transform (Changeset ${i + 1})`, Array.from(newCellHistoryTracker.entries()));
      
      cellHistoryTracker = newCellHistoryTracker;
    }

    // STEP 3: APPLY NEW CHANGES. With a stable and correct address map, process modifications and additions.
    changeset.modifiedCells.forEach(change => {
      const addressKey = `${change.sheet}!${change.address}`;
      if (!cellHistoryTracker.has(addressKey)) {
        cellHistoryTracker.set(addressKey, []);
      }
      cellHistoryTracker.get(addressKey)!.push(change);
    });

    // --- MODIFIED (REFACTOR): No more cancellation. Just record the event.
    changeset.addedRows.forEach(addedRow => {
      chronologicalRowEvents.push({ type: 'add', data: addedRow });
    });
  }

  return {
    finalChangeHistory: cellHistoryTracker,
    chronologicalRowEvents, // Return the new ledger
    chronologicalStructuralChanges,
  };
}