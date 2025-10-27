// src/taskpane/features/comparison/services/report.consolidator.service.ts

import {
    IChange,
    IDiffResult,
    IResolvedTimeline,
    ICombinedChange,
    IReportRowChange,
    IReportStructuralChange,
    SheetId,
    SheetName,
} from "../../../types/types";
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
    sheetIdToFinalNameMap: Map<SheetId, SheetName>
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
        const sheetId = coords.sheet! as SheetId; // This is the internal ID
        const finalSheetName = sheetIdToFinalNameMap.get(sheetId) || sheetId; // This is the user-facing Name

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

        // Check the last event for any special metadata from the diff engine
        // (like 'isConsequential') and merge it into the final metadata object.
        if (lastEvent.metadata) {
          Object.assign(metadata, lastEvent.metadata);
        }

        finalModifiedCells.push({
            sheet: finalSheetName,
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

    const finalAddedRows: IReportRowChange[] = [];
    const finalDeletedRows: IReportRowChange[] = [];

    for (const event of timeline.chronologicalRowEvents) {
        const sheetId = event.data.sheet;
        const finalSheetName = sheetIdToFinalNameMap.get(sheetId) || sheetId;
        
        const finalRowChange: IReportRowChange = {
            ...event.data,
            sheet: finalSheetName, // translate the sheet property to a SheetName
        };
        
        if (event.type === 'add') {
            finalAddedRows.push(finalRowChange);
        } else if (event.type === 'delete') {
            finalDeletedRows.push(finalRowChange);
        }
    }

    const finalStructuralChanges: IReportStructuralChange[] = timeline.chronologicalStructuralChanges.map(change => {
        const sheetId = change.sheet;
        const finalSheetName = sheetIdToFinalNameMap.get(sheetId) || sheetId;
        return {
            ...change,
            sheet: finalSheetName,
            oldName: change.oldName,
            newName: change.newName,
        } as IReportStructuralChange;
    });

    return {
      modifiedCells: finalModifiedCells,
      addedRows: finalAddedRows,
      deletedRows: finalDeletedRows,
      structuralChanges: finalStructuralChanges,
    };
}

function isRealFormula(formula: any): boolean {
    return typeof formula === "string" && formula.startsWith("=");
}