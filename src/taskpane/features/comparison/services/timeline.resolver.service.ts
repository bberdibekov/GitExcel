// src/taskpane/services/timeline.resolver.service.ts

import { IChange, IRowChange, IStructuralChange, IResolvedTimeline, IChangeset, IRowEvent } from "../../../types/types";
import { transformAddress } from "../../../shared/lib/coordinate.transform.service";
import { debugService } from "../../../core/services/debug.service"; 

/**
 * The "Brain" of the synthesizer. Takes a raw sequence of changesets and produces a
 * clean, resolved history of every event by simulating the timeline of changes.
 * This is a stateful process that tracks each cell's identity over time.
 * 
 * @param changesetSequence An ordered array of diffs between versions.
 * @param sheetIdToNameMap A map to translate sheet UUIDs to human-readable names for logging.
 * @returns An IResolvedTimeline object containing the fully mapped history.
 */
export function resolveTimeline(
  changesetSequence: IChangeset[],
  sheetIdToNameMap: Map<string, string> // <-- MODIFIED: Accept the name map
): IResolvedTimeline {
  let cellHistoryTracker = new Map<string, IChange[]>();
  const chronologicalRowEvents: IRowEvent[] = [];
  const chronologicalStructuralChanges: IStructuralChange[] = [];

  for (let i = 0; i < changesetSequence.length; i++) {
    const changeset = changesetSequence[i];

    // --- MODIFIED (LOGGING): Prepare a log-friendly version of the changeset ---
    const loggableChangeset = {
      modifiedCells: changeset.modifiedCells.map(c => {
        const sheetName = sheetIdToNameMap.get(c.sheet) || c.sheet;
        return `${sheetName}!${c.address}`;
      }),
      addedRows: changeset.addedRows.length,
      deletedRows: changeset.deletedRows.length,
      structuralChanges: changeset.structuralChanges.map(sc => ({
          ...sc,
          sheet: sheetIdToNameMap.get(sc.sheet) || sc.sheet
      })),
    };

    debugService.addLogEntry(`Timeline Resolver: Processing Changeset ${i + 1}/${changesetSequence.length}`, {
      changeset: loggableChangeset,
    });
    // --- END MODIFICATION ---
    
    // STEP 1: TERMINATE HISTORY.
    changeset.deletedRows.forEach(deletedRow => {
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

    // STEP 2: TRANSFORM STATE.
    if (changeset.structuralChanges.length > 0) {
      chronologicalStructuralChanges.push(...changeset.structuralChanges);

      // --- MODIFIED (LOGGING): Translate tracker keys for debug capture ---
      const translatedBeforeEntries = Array.from(cellHistoryTracker.entries()).map(([key, value]) => {
          const [sheetId, cell] = key.split('!');
          const sheetName = sheetIdToNameMap.get(sheetId) || sheetId;
          return [`${sheetName}!${cell}`, value];
      });
      debugService.capture(`CellTracker_Before_Transform (Changeset ${i + 1})`, translatedBeforeEntries);
      // --- END MODIFICATION ---

      const newCellHistoryTracker = new Map<string, IChange[]>();
      
      for (const [currentAddress, history] of cellHistoryTracker.entries()) {
        const newAddress = transformAddress(currentAddress, changeset.structuralChanges);
        if (newAddress) {
          newCellHistoryTracker.set(newAddress, history);
        }
      }
      
      // --- Translate tracker keys for debug capture ---
      const translatedAfterEntries = Array.from(newCellHistoryTracker.entries()).map(([key, value]) => {
        const [sheetId, cell] = key.split('!');
        const sheetName = sheetIdToNameMap.get(sheetId) || sheetId;
        return [`${sheetName}!${cell}`, value];
      });
      debugService.capture(`CellTracker_After_Transform (Changeset ${i + 1})`, translatedAfterEntries);
      
      cellHistoryTracker = newCellHistoryTracker;
    }

    // STEP 3: APPLY NEW CHANGES.
    changeset.modifiedCells.forEach(change => {
      const addressKey = `${change.sheet}!${change.address}`;
      if (!cellHistoryTracker.has(addressKey)) {
        cellHistoryTracker.set(addressKey, []);
      }
      cellHistoryTracker.get(addressKey)!.push(change);
    });

    changeset.addedRows.forEach(addedRow => {
      chronologicalRowEvents.push({ type: 'add', data: addedRow });
    });
  }

  return {
    finalChangeHistory: cellHistoryTracker,
    chronologicalRowEvents,
    chronologicalStructuralChanges,
  };
}