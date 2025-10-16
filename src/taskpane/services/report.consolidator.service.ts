// src/taskpane/services/report.consolidator.service.ts

import { IChange, IDiffResult, IResolvedTimeline, IWorkbookSnapshot, ICombinedChange } from "../types/types";
import { fromA1, toA1 } from "./address.converter";
import { transformAddress } from "./coordinate.transform.service";

/**
 * A helper to safely get a cell's data from a snapshot.
 * Returns a default empty cell if the sheet, row, or cell doesn't exist.
 */
function getCellFromSnapshot(snapshot: IWorkbookSnapshot, sheet: string, row: number, col: number): { value: any, formula: any } {
  const emptyCell = { value: "", formula: "" };
  const sheetData = snapshot[sheet];
  if (!sheetData) return emptyCell;
  const rowData = sheetData.data[row];
  if (!rowData) return emptyCell;
  const cellData = rowData.cells[col];
  return cellData || emptyCell;
}


/**

The "Formatter" of the synthesizer. Takes a clean, resolved timeline and
consolidates it into the final, user-facing diff report.
@param timeline The IResolvedTimeline object from the resolver service.
@param startVersionSnapshot The complete snapshot of the starting version for the comparison.
@returns The final, consolidated IDiffResult for the UI.
*/
export function consolidateReport(timeline: IResolvedTimeline, startVersionSnapshot: IWorkbookSnapshot): IDiffResult {
    const finalModifiedCells: ICombinedChange[] = [];

    // 1. Consolidate the history of all cells that survived and were modified at any point.
    timeline.finalChangeHistory.forEach((history, finalAddressKey) => {
        const coords = fromA1(finalAddressKey)!;
        const lastEvent = history[history.length - 1];

        const startState = getCellFromSnapshot(startVersionSnapshot, coords.sheet!, coords.row, coords.col);

        const hasValueChange = startState.value !== lastEvent.newValue;
        const hasFormulaChange = isRealFormula(startState.formula) || isRealFormula(lastEvent.newFormula) 
          && startState.formula !== lastEvent.newFormula;

        let finalChangeType: IChange["changeType"] = "value";
        if (hasValueChange && hasFormulaChange) {
            finalChangeType = "both";
        } else if (hasFormulaChange) {
            finalChangeType = "formula";
        }

        finalModifiedCells.push({
            sheet: coords.sheet!,
            address: toA1(coords.row, coords.col),
            startValue: startState.value,
            startFormula: startState.formula,
            endValue: lastEvent.newValue,
            endFormula: lastEvent.newFormula,
            changeType: finalChangeType,
            history: history,
            metadata: {},
        });
    });

    // 2. Process net added rows to find "pure creations" not captured above.
    timeline.netAddedRows.forEach((addedRow) => {
        addedRow.rowData.cells.forEach((cell, colIndex) => {
            if (cell.value === "" && cell.formula === "") return;

            const originalAddress = `${addedRow.sheet}!${toA1(addedRow.rowIndex, colIndex)}`;
            const finalAddressStr = transformAddress(
                originalAddress,
                (addedRow as any).futureStructuralChanges,
            );

            if (finalAddressStr && !timeline.finalChangeHistory.has(finalAddressStr)) {
                const finalCoords = fromA1(finalAddressStr)!;
                const creationEvent: IChange = {
                  sheet: finalCoords.sheet!,
                  address: toA1(finalCoords.row, finalCoords.col),
                  changeType: isRealFormula(cell.formula) ? 'both' : 'value',
                  oldValue: "", newValue: cell.value,
                  oldFormula: "", newFormula: cell.formula,
                };

                finalModifiedCells.push({
                  sheet: finalCoords.sheet!,
                  address: toA1(finalCoords.row, finalCoords.col),
                  startValue: "",
                  startFormula: "",
                  endValue: cell.value,
                  endFormula: cell.formula,
                  changeType: creationEvent.changeType,
                  history: [creationEvent],
                  metadata: {},
                });
            }
        });
    });

    return {
      modifiedCells: finalModifiedCells,
      addedRows: Array.from(timeline.netAddedRows.values()),
      deletedRows: Array.from(timeline.netDeletedRows.values()),
      structuralChanges: timeline.chronologicalStructuralChanges,
    };
}

function isRealFormula(formula: any): boolean {
    return typeof formula === "string" && formula.startsWith("=");
}