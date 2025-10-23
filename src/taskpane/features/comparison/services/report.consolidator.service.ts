// src/taskpane/services/report.consolidator.service.ts

import { IChange, IDiffResult, IResolvedTimeline, ICombinedChange, IRowChange } from "../../../types/types"
import { fromA1, toA1 } from "../../../shared/lib/address.converter";


/**
 * The "Formatter" of the synthesizer. Takes a clean, resolved timeline and
 * consolidates it into the final, user-facing diff report.
 * @param timeline The IResolvedTimeline object from the now-stateful resolver service.
 * @returns The final, consolidated IDiffResult for the UI.
 */
export function consolidateReport(timeline: IResolvedTimeline): IDiffResult {
    const finalModifiedCells: ICombinedChange[] = [];

    // This logic processes all cells that SURVIVE the timeline.
    timeline.finalChangeHistory.forEach((history, finalAddressKey) => {
        if (history.length === 0) {
            return;
        }

        // --- NEW (BUGFIX): Filter out changes that are only value changes on formula cells. ---
        // These are typically side effects of recalculations, not direct user edits, and create noise.
        const filteredHistory = history.filter(change => {
            const isRecalculation = change.changeType === 'value' && isRealFormula(change.oldFormula);
            return !isRecalculation;
        });

        // If all changes for a cell were filtered out (i.e., they were all recalculations),
        // then we don't need to include this cell in the final report.
        if (filteredHistory.length === 0) {
            return;
        }
        // --- END BUGFIX ---

        const coords = fromA1(finalAddressKey)!;

        // --- MODIFIED (BUGFIX): Use the filtered history to determine the start and end states. ---
        const firstEvent = filteredHistory[0];
        const lastEvent = filteredHistory[filteredHistory.length - 1];

        const startValue = firstEvent.oldValue;
        const startFormula = firstEvent.oldFormula;
        const endValue = lastEvent.newValue;
        const endFormula = lastEvent.newFormula;

        const hasValueChange = String(startValue) !== String(endValue);
        const hasFormulaChange = (isRealFormula(startFormula) || isRealFormula(endFormula)) 
                                && String(startFormula) !== String(endFormula);

        let finalChangeType: IChange["changeType"] = "value";
        if (hasValueChange && hasFormulaChange) {
            finalChangeType = "both";
        } else if (hasFormulaChange) {
            finalChangeType = "formula";
        }

        finalModifiedCells.push({
            sheet: coords.sheet!,
            address: toA1(coords.row, coords.col),
            startValue: startValue,
            startFormula: startFormula,
            endValue: endValue,
            endFormula: endFormula,
            changeType: finalChangeType,
            // --- MODIFIED (BUGFIX): Assign the clean, filtered history. ---
            history: filteredHistory,
            metadata: {},
        });
    });

    // --- MODIFIED (REFACTOR): Process the new chronological event ledger. ---
    // We no longer read from 'net' maps. We iterate through the full, unfiltered history.
    const finalAddedRows: IRowChange[] = [];
    const finalDeletedRows: IRowChange[] = [];

    for (const event of timeline.chronologicalRowEvents) {
        if (event.type === 'add') {
            finalAddedRows.push(event.data);
        } else if (event.type === 'delete') {
            finalDeletedRows.push(event.data);
        }
    }

    return {
      modifiedCells: finalModifiedCells,
      // Pass through the full, unfiltered lists of row events.
      addedRows: finalAddedRows,
      deletedRows: finalDeletedRows,
      structuralChanges: timeline.chronologicalStructuralChanges,
    };
}

function isRealFormula(formula: any): boolean {
    return typeof formula === "string" && formula.startsWith("=");
}