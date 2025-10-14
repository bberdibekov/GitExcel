// src/taskpane/services/report.consolidator.service.ts

import { IChange, IDiffResult, IResolvedTimeline } from "../types/types";
import { fromA1, toA1 } from "./address.converter";
import { transformAddress } from "./coordinate.transform.service";

/**

The "Formatter" of the synthesizer. Takes a clean, resolved timeline and
consolidates it into the final, user-facing diff report.
@param timeline The IResolvedTimeline object from the resolver service.
@returns The final, consolidated IDiffResult for the UI.
*/
export function consolidateReport(timeline: IResolvedTimeline): IDiffResult {
    const finalResult: IDiffResult = {
        modifiedCells: [],
        // --- Pass through the net added rows for the UI summary ---
        // The UI uses this array to display a high-level list of added rows.
        // This is separate from the "creation" events handled in modifiedCells.
        addedRows: Array.from(timeline.netAddedRows.values()),
        deletedRows: Array.from(timeline.netDeletedRows.values()),
        structuralChanges: timeline.chronologicalStructuralChanges,
    };

    // 1. Consolidate the history of all cells that survived and were modified at any point.
    timeline.finalChangeHistory.forEach((history, finalAddressKey) => {
        const coords = fromA1(finalAddressKey)!;
        const firstEvent = history[0];
        const lastEvent = history[history.length - 1];

        const originalRowKey = `${firstEvent.sheet}!${
            fromA1(firstEvent.address)!.row
        }`;
        const wasCreatedDuringTimeline = timeline.netAddedRows.has(
            originalRowKey,
        );

        const hasValueChange = history.some((c) =>
            c.changeType === "value" || c.changeType === "both"
        );
        const hasFormulaChange = history.some((c) =>
            c.changeType === "formula" || c.changeType === "both"
        );

        let finalChangeType: IChange["changeType"] = "value";
        if (hasValueChange && hasFormulaChange) {
            finalChangeType = "both";
        } else if (hasFormulaChange) {
            finalChangeType = "formula";
        }

        finalResult.modifiedCells.push({
            sheet: coords.sheet!,
            address: toA1(coords.row, coords.col),
            oldValue: wasCreatedDuringTimeline ? "" : firstEvent.oldValue,
            oldFormula: wasCreatedDuringTimeline ? "" : firstEvent.oldFormula,
            newValue: lastEvent.newValue,
            newFormula: lastEvent.newFormula,
            changeType: finalChangeType,
        });
    });

    // 2. Process net added rows to find "pure creations".
    // This logic is still essential for showing the content of new rows.
    timeline.netAddedRows.forEach((addedRow) => {
        addedRow.rowData.cells.forEach((cell, colIndex) => {
            if (cell.value === "" && cell.formula === "") return;

            const originalAddress = `${addedRow.sheet}!${
                toA1(addedRow.rowIndex, colIndex)
            }`;
            const finalAddressStr = transformAddress(
                originalAddress,
                (addedRow as any).futureStructuralChanges,
            );

            if (
                finalAddressStr &&
                !timeline.finalChangeHistory.has(finalAddressStr)
            ) {
                const finalCoords = fromA1(finalAddressStr)!;
                finalResult.modifiedCells.push({
                    sheet: finalCoords.sheet!,
                    address: toA1(finalCoords.row, finalCoords.col),
                    changeType: isRealFormula(cell.formula) ? "both" : "value",
                    oldValue: "",
                    newValue: cell.value,
                    oldFormula: "",
                    newFormula: cell.formula,
                });
            }
        });
    });

    return finalResult;
}

// Helper function to be used in step 2.
function isRealFormula(formula: any): boolean {
    return typeof formula === "string" && formula.startsWith("=");
}
