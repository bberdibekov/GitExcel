// src/taskpane/features/comparison/services/sheet-content-diff.service.ts

import { diffArrays } from "diff";
import {
  ICellData,
  IChange,
  IChangeset,
  IRowChange,
  IRowData,
  IStructuralChange,
  ISheetSnapshot,
} from "../../../types/types";
import { fromA1 } from "../../../shared/lib/address.converter";
import { generateRowHash } from "../../../shared/lib/hashing.service";
import { valueFilters, formulaFilters, IComparisonFilter } from "./comparison.filters";

// This file contains the low-level, specialized logic for comparing the
// cell-by-cell content of two ISheetSnapshot objects.

function isRealFormula(formula: any): boolean {
  return typeof formula === "string" && formula.startsWith("=");
}

function applyFilters(
  oldValue: any,
  newValue: any,
  activeFilterIds: Set<string>,
  filterRegistry: IComparisonFilter[]
): boolean {
  return filterRegistry.some(filter => 
    activeFilterIds.has(filter.id) && filter.apply(oldValue, newValue)
  );
}

function normalizeSheetData(data: IRowData[] | ICellData[][]): IRowData[] {
  if (data.length > 0 && typeof (data[0] as any).hash === "undefined") {
    return (data as ICellData[][]).map((rowCells) => ({
      hash: generateRowHash(rowCells),
      cells: rowCells,
    }));
  }
  return data as IRowData[];
}

function compareCells(
  sheetId: string,
  oldRow: IRowData,
  newRow: IRowData,
  result: IChangeset,
  activeFilterIds: Set<string>
) {
  const maxCols = Math.max(oldRow.cells.length, newRow.cells.length);
  for (let c = 0; c < maxCols; c++) {
    const oldCell = oldRow.cells[c];
    const newCell = newRow.cells[c];

    const canonicalAddress = (newCell?.address || oldCell?.address);
    if (!canonicalAddress) continue;

    const _oldCell = oldCell || { value: "", formula: "" };
    const _newCell = newCell || { value: "", formula: "" };

    const valueChanged = 
      !applyFilters(_oldCell.value, _newCell.value, activeFilterIds, valueFilters) 
      && String(_oldCell.value) !== String(_newCell.value);
      
    const formulaChanged =
      (isRealFormula(_oldCell.formula) || isRealFormula(_newCell.formula)) &&
      !applyFilters(_oldCell.formula, _newCell.formula, activeFilterIds, formulaFilters)
      && (String(_oldCell.formula) !== String(_newCell.formula));

    if (valueChanged || formulaChanged) {
      result.modifiedCells.push({
        sheet: sheetId,
        address: canonicalAddress, 
        changeType: formulaChanged ? (valueChanged ? "both" : "formula") : "value",
        oldValue: _oldCell.value,
        newValue: _newCell.value,
        oldFormula: _oldCell.formula,
        newFormula: _newCell.formula,
      });
    }
  }
}

function coalesceRowChanges(
  sheetId: string,
  rowChanges: IRowChange[],
  type: "row_insertion" | "row_deletion",
  startRowOffset: number
): IStructuralChange[] {
  if (rowChanges.length === 0) return [];
  const structuralChanges: IStructuralChange[] = [];
  const sortedChanges = [...rowChanges].sort((a, b) => a.rowIndex - b.rowIndex);
  
  let currentBlock: IStructuralChange = {
    type,
    sheet: sheetId,
    index: sortedChanges[0].rowIndex + startRowOffset,
    count: 1,
  };

  for (let i = 1; i < sortedChanges.length; i++) {
    if (sortedChanges[i].rowIndex === sortedChanges[i - 1].rowIndex + 1) {
        currentBlock.count!++;
    } else {
      structuralChanges.push(currentBlock);
      currentBlock = { type, sheet: sheetId, index: sortedChanges[i].rowIndex + startRowOffset, count: 1 };
    }
  }
  structuralChanges.push(currentBlock);
  return structuralChanges;
}

export function diffSheetContent(
  sheetId: string,
  oldSheet: ISheetSnapshot,
  newSheet: ISheetSnapshot,
  activeFilterIds: Set<string>
): IChangeset {
  const result: IChangeset = { modifiedCells: [], addedRows: [], deletedRows: [], structuralChanges: [] };
  const oldCoords = oldSheet.address ? fromA1(oldSheet.address) : null;
  const startRowOffset = oldCoords ? oldCoords.row : 0;
  const oldData = normalizeSheetData(oldSheet.data);
  const newData = normalizeSheetData(newSheet.data);
  const changes = diffArrays(oldData.map(r => r.hash), newData.map(r => r.hash));

  let oldIdx = 0;
  let newIdx = 0;

  for (let i = 0; i < changes.length; i++) {
    const part = changes[i];
    const nextPart = i + 1 < changes.length ? changes[i + 1] : null;

    if (part.removed && nextPart && nextPart.added && part.count === nextPart.count) {
      for (let j = 0; j < part.count; j++) {
        compareCells(sheetId, oldData[oldIdx], newData[newIdx], result, activeFilterIds);
        oldIdx++;
        newIdx++;
      }
      i++;
    } else if (part.added) {
      for (let j = 0; j < part.count; j++) {
        const addedRowData = newData[newIdx];
        result.addedRows.push({ sheet: sheetId, rowIndex: newIdx, rowData: addedRowData });

        // --- START OF FIX ---
        // The original "fix" that removed this logic was incorrect. It prevented the
        // timeline resolver from ever learning about the *creation* of cells.
        // For the resolver to build a complete history, it MUST receive a
        // modifiedCells event for any cell that is created with content.
        addedRowData.cells.forEach(cell => {
          const hasContent = (cell.value !== "" && cell.value != null) || isRealFormula(cell.formula);
          if (hasContent) {
            result.modifiedCells.push({
              sheet: sheetId,
              address: cell.address,
              changeType: isRealFormula(cell.formula) ? 'both' : 'value',
              oldValue: "",
              newValue: cell.value,
              oldFormula: "",
              newFormula: cell.formula,
            });
          }
        });
        // --- END OF FIX ---

        newIdx++;
      }
    } else if (part.removed) {
      for (let j = 0; j < part.count; j++) {
        result.deletedRows.push({ sheet: sheetId, rowIndex: oldIdx + startRowOffset, rowData: oldData[oldIdx] });
        oldIdx++;
      }
    } else {
      for (let j = 0; j < part.count; j++) {
        compareCells(sheetId, oldData[oldIdx], newData[newIdx], result, activeFilterIds);
        oldIdx++;
        newIdx++;
      }
    }
  }

  const trueInsertions = result.addedRows.filter(row => row.rowIndex < oldData.length);
  result.structuralChanges.push(
    ...coalesceRowChanges(sheetId, trueInsertions, "row_insertion", startRowOffset),
    ...coalesceRowChanges(sheetId, result.deletedRows, "row_deletion", 0)
  );

  return result;
}