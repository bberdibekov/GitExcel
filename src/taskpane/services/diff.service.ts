// src/taskpane/services/diff.service.ts

import { diffArrays } from "diff";
import {
  ICellData,
  IChange,
  IDiffResult,
  IRowChange,
  IRowData,
  IStructuralChange,
  IWorkbookSnapshot,
} from "../types/types";
import { toA1 } from "./address.converter";
import { generateRowHash } from "./hashing.service";

/**
Determines if a cell's formula property represents a true, user-entered formula.
Excel's API returns literals (e.g., 5, "hello") in the formula property for non-formulas.
A real formula is a string that starts with "=".
*/
function isRealFormula(formula: any): boolean {
  return typeof formula === "string" && formula.startsWith("=");
}

function coalesceRowChanges(
  sheetName: string,
  rowChanges: IRowChange[],
  type: "row_insertion" | "row_deletion",
): IStructuralChange[] {
  if (rowChanges.length === 0) return [];
  const structuralChanges: IStructuralChange[] = [];
  const sortedChanges = [...rowChanges].sort((a, b) => a.rowIndex - b.rowIndex);
  let currentBlock: IStructuralChange = {
    type,
    sheet: sheetName,
    index: sortedChanges[0].rowIndex,
    count: 1,
  };
  for (let i = 1; i < sortedChanges.length; i++) {
    const prevIndex = sortedChanges[i - 1].rowIndex;
    const currentIndex = sortedChanges[i].rowIndex;
    if (currentIndex === prevIndex + 1) currentBlock.count!++;
    else {
      structuralChanges.push(currentBlock);
      currentBlock = { type, sheet: sheetName, index: currentIndex, count: 1 };
    }
  }
  structuralChanges.push(currentBlock);
  return structuralChanges;
}
function normalizeSheetData(data: IRowData[] | ICellData[][]): IRowData[] {
  if (data.length > 0 && typeof (data[0] as any).hash === "undefined") {
    const oldData = data as ICellData[][];
    return oldData.map((rowCells) => ({
      hash: generateRowHash(rowCells),
      cells: rowCells,
    }));
  }
  return data as IRowData[];
}

function compareCells(
  sheetName: string,
  rowIndex: number,
  oldRow: IRowData,
  newRow: IRowData,
  result: IDiffResult,
) {
  const maxCols = Math.max(oldRow.cells.length, newRow.cells.length);
  for (let c = 0; c < maxCols; c++) {
    const oldCell = oldRow.cells[c] || { value: "", formula: "" };
    const newCell = newRow.cells[c] || { value: "", formula: "" };

    const valueChanged = String(oldCell.value) !== String(newCell.value);
    // A formula change is only valid if the formula string is different AND a real formula is involved.
    const formulaChanged =
      (isRealFormula(oldCell.formula) || isRealFormula(newCell.formula)) &&
      (String(oldCell.formula) !== String(newCell.formula));

    if (valueChanged || formulaChanged) {
      let changeType: IChange["changeType"] = "value"; // Default to value change
      if (formulaChanged) {
        // If a real formula changed, check if the value changed too.
        changeType = valueChanged ? "both" : "formula";
      }

      result.modifiedCells.push({
        sheet: sheetName,
        address: toA1(rowIndex, c),
        changeType, // Use the newly calculated, correct type
        oldValue: oldCell.value,
        newValue: newCell.value,
        oldFormula: oldCell.formula,
        newFormula: newCell.formula,
      });
    }
  }
}

function diffSheetData(
  sheetName: string,
  oldData: IRowData[],
  newData: IRowData[],
): IDiffResult {
  const result: IDiffResult = {
    modifiedCells: [],
    addedRows: [],
    deletedRows: [],
    structuralChanges: [],
  };

  const oldHashes = oldData.map((r) => r.hash);
  const newHashes = newData.map((r) => r.hash);
  const changes = diffArrays(oldHashes, newHashes);

  let oldIdx = 0;
  let newIdx = 0;

  for (let i = 0; i < changes.length; i++) {
    const part = changes[i];
    const nextPart = i + 1 < changes.length ? changes[i + 1] : null;

    if (
      part.removed && nextPart && nextPart.added &&
      part.count === nextPart.count
    ) {
      for (let j = 0; j < part.count; j++) {
        compareCells(
          sheetName,
          newIdx,
          oldData[oldIdx],
          newData[newIdx],
          result,
        );
        oldIdx++;
        newIdx++;
      }
      i++;
    } else if (part.added) {
      for (let j = 0; j < part.count; j++) {
        const addedRowData = newData[newIdx];
        result.addedRows.push({
          sheet: sheetName,
          rowIndex: newIdx,
          rowData: addedRowData,
        });

        // --- LOGIC FOR CREATION EVENTS ---
        addedRowData.cells.forEach((cell, colIndex) => {
          const hasValue = cell.value !== "" && cell.value !== undefined;
          const hasFormula = cell.formula !== "" && cell.formula !== undefined;

          if (hasValue || hasFormula) {
            result.modifiedCells.push({
              sheet: sheetName,
              address: toA1(newIdx, colIndex),
              // Use the helper to correctly determine the change type on creation.
              changeType: isRealFormula(cell.formula) ? "both" : "value",
              oldValue: "",
              newValue: cell.value,
              oldFormula: "",
              newFormula: cell.formula,
            });
          }
        });
        newIdx++;
      }
    } else if (part.removed) {
      for (let j = 0; j < part.count; j++) {
        result.deletedRows.push({
          sheet: sheetName,
          rowIndex: oldIdx,
          rowData: oldData[oldIdx],
        });
        oldIdx++;
      }
    } else {
      for (let j = 0; j < part.count; j++) {
        compareCells(
          sheetName,
          newIdx,
          oldData[oldIdx],
          newData[newIdx],
          result,
        );
        oldIdx++;
        newIdx++;
      }
    }
  }

  result.structuralChanges.push(
    ...coalesceRowChanges(sheetName, result.addedRows, "row_insertion"),
    ...coalesceRowChanges(sheetName, result.deletedRows, "row_deletion"),
  );

  return result;
}

export function diffSnapshots(
  oldSnapshot: IWorkbookSnapshot,
  newSnapshot: IWorkbookSnapshot,
): IDiffResult {
  const result: IDiffResult = {
    modifiedCells: [],
    addedRows: [],
    deletedRows: [],
    structuralChanges: [],
  };
  const allSheetNames = new Set([
    ...Object.keys(oldSnapshot),
    ...Object.keys(newSnapshot),
  ]);
  for (const sheetName of Array.from(allSheetNames)) {
    if (!oldSnapshot[sheetName] || !newSnapshot[sheetName]) continue;
    const oldSheetData = normalizeSheetData(oldSnapshot[sheetName].data);
    const newSheetData = normalizeSheetData(newSnapshot[sheetName].data);
    const sheetResult = diffSheetData(sheetName, oldSheetData, newSheetData);
    result.modifiedCells.push(...sheetResult.modifiedCells);
    result.addedRows.push(...sheetResult.addedRows);
    result.deletedRows.push(...sheetResult.deletedRows);
    result.structuralChanges.push(...sheetResult.structuralChanges);
  }
  return result;
}
