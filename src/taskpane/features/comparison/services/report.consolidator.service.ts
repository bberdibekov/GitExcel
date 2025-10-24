// src/taskpane/services/report.consolidator.service.ts

import { IChange, IDiffResult, IResolvedTimeline, ICombinedChange, IRowChange, ICellData, IStructuralChange } from "../../../types/types";
import { fromA1, toA1 } from "../../../shared/lib/address.converter";


/**
 * The "Formatter" of the synthesizer. Takes a clean, resolved timeline and
 * consolidates it into the final, user-facing diff report.
 * @param timeline The IResolvedTimeline object from the resolver service.
 * @param sheetIdToFinalNameMap A map to translate persistent sheet IDs to their last known user-facing name.
 * @returns The final, consolidated IDiffResult for the UI.
 */
export function consolidateReport(
    timeline: IResolvedTimeline, 
    sheetIdToFinalNameMap: Map<string, string>
): IDiffResult {
    const finalModifiedCells: ICombinedChange[] = [];

    timeline.finalChangeHistory.forEach((history, finalAddressKey) => {
        if (history.length === 0) return;

        const filteredHistory = history.filter(change => {
            const isRecalculation = change.changeType === 'value' && isRealFormula(change.oldFormula);
            return !isRecalculation;
        });

        if (filteredHistory.length === 0) return;

        const coords = fromA1(finalAddressKey)!;
        const sheetId = coords.sheet!;
        const finalSheetName = sheetIdToFinalNameMap.get(sheetId) || sheetId; // Translate ID to Name

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
        
        const metadata: { [key: string]: any; } = {};
        const isCreation = startValue === "" && startFormula === "";
        if (isCreation) {
            metadata.isCreation = true;
        }

        finalModifiedCells.push({
            sheet: finalSheetName, // <-- MODIFIED: Use the translated name
            address: toA1(coords.row, coords.col),
            startValue,
            startFormula,
            endValue,
            endFormula,
            changeType: finalChangeType,
            history: filteredHistory,
            metadata,
        });
    });

    const finalAddedRows: IRowChange[] = [];
    const finalDeletedRows: IRowChange[] = [];

    for (const event of timeline.chronologicalRowEvents) {
        const sheetId = event.data.sheet;
        const finalSheetName = sheetIdToFinalNameMap.get(sheetId) || sheetId; // Translate ID to Name
        
        // Create a new IRowChange object with the translated name for the final report
        const finalRowChange: IRowChange = {
            ...event.data,
            sheet: finalSheetName, // <-- MODIFIED: Use the translated name
        };
        
        if (event.type === 'add') {
            finalAddedRows.push(finalRowChange);
        } else if (event.type === 'delete') {
            finalDeletedRows.push(finalRowChange);
        }
    }

    // --- NEW: Translate sheet IDs in structural changes (for row/col insertions/deletions) ---
    const finalStructuralChanges: IStructuralChange[] = timeline.chronologicalStructuralChanges.map(change => {
        // Sheet add/delete/rename events already use the name, so we only need to translate the others.
        if (change.type === 'row_insertion' || change.type === 'row_deletion' || change.type === 'column_insertion' || change.type === 'column_deletion') {
            const sheetId = change.sheet;
            const finalSheetName = sheetIdToFinalNameMap.get(sheetId) || sheetId;
            return { ...change, sheet: finalSheetName };
        }
        return change;
    });
    // --- END NEW ---

    return {
      modifiedCells: finalModifiedCells,
      addedRows: finalAddedRows,
      deletedRows: finalDeletedRows,
      structuralChanges: finalStructuralChanges, // <-- MODIFIED: Use the translated changes
    };
}

function isRealFormula(formula: any): boolean {
    return typeof formula === "string" && formula.startsWith("=");
}