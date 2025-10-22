// src/taskpane/services/diff.service.ts

import { diffArrays } from "diff";
import {
  ICellData,
  IChange,
  IChangeset,
  IRowChange,
  IRowData,
  IStructuralChange,
  IWorkbookSnapshot,
  ISheetSnapshot,
} from "../types/types";
import { toA1, fromA1 } from "./address.converter";
import { generateRowHash } from "./hashing.service";
import { ILicense } from "./AuthService";
import { valueFilters, formulaFilters, IComparisonFilter } from "./comparison.filters";
// A constant defining the number of changes to show to a free user on a partial result.
const PARTIAL_RESULT_COUNT = 2;


/**
Determines if a cell's formula property represents a true, user-entered formula.
*/
function isRealFormula(formula: any): boolean {
  return typeof formula === "string" && formula.startsWith("=");
}

/**
 * The core filter pipeline processor. It applies a set of active filters
 * to determine if two values should be considered semantically equal.
 * @returns `true` if an active filter considers the values equal, otherwise `false`.
 */
function applyFilters(
  oldValue: any,
  newValue: any,
  activeFilterIds: Set<string>,
  filterRegistry: IComparisonFilter[]
): boolean {
  // Find the first active filter in the registry that considers the values equal.
  const isEqual = filterRegistry.some(filter => 
    activeFilterIds.has(filter.id) && filter.apply(oldValue, newValue)
  );
  return isEqual;
}

/**
 * A helper to get a set of all premium filter IDs from the registries.
 * This is memoized to avoid re-computing on every call.
 */
let proFilterIds: Set<string> | null = null;
function getProFilterIds(): Set<string> {
    if (proFilterIds === null) {
        const allFilters = [...valueFilters, ...formulaFilters];
        proFilterIds = new Set(
            allFilters.filter(f => f.tier === 'pro').map(f => f.id)
        );
    }
    return proFilterIds;
}


function coalesceRowChanges(
  sheetName: string,
  rowChanges: IRowChange[],
  type: "row_insertion" | "row_deletion",
  startRowOffset: number // This is now correctly used.
): IStructuralChange[] {
  if (rowChanges.length === 0) return [];
  const structuralChanges: IStructuralChange[] = [];
  const sortedChanges = [...rowChanges].sort((a, b) => a.rowIndex - b.rowIndex);
  
  // --- MODIFIED (BUGFIX) ---
  // The rowIndex for insertions is relative, so we MUST apply the offset.
  // The rowIndex for deletions is already absolute, so an offset of 0 is passed in.
  let currentBlock: IStructuralChange = {
    type,
    sheet: sheetName,
    index: sortedChanges[0].rowIndex + startRowOffset, // Apply offset
    count: 1,
  };

  for (let i = 1; i < sortedChanges.length; i++) {
    const prevIndex = sortedChanges[i - 1].rowIndex;
    const currentIndex = sortedChanges[i].rowIndex;
    if (currentIndex === prevIndex + 1) {
        currentBlock.count!++;
    }
    else {
      structuralChanges.push(currentBlock);
      // --- MODIFIED (BUGFIX) ---
      // Apply offset to the start of the next block as well.
      currentBlock = { type, sheet: sheetName, index: currentIndex + startRowOffset, count: 1 };
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
    if (!canonicalAddress) {
      continue;
    }

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
      let changeType: IChange["changeType"] = "value";
      if (formulaChanged) {
        changeType = valueChanged ? "both" : "formula";
      }

      result.modifiedCells.push({
        sheet: sheetName,
        address: canonicalAddress, 
        changeType,
        oldValue: _oldCell.value,
        newValue: _newCell.value,
        oldFormula: _oldCell.formula,
        newFormula: _newCell.formula,
      });
    }
  }
}

function diffSheetData(
  sheetName: string,
  oldSheet: ISheetSnapshot,
  newSheet: ISheetSnapshot,
  activeFilterIds: Set<string>
): IChangeset {
  const result: IChangeset = {
    modifiedCells: [],
    addedRows: [],
    deletedRows: [],
    structuralChanges: [],
  };

  const oldCoords = oldSheet.address ? fromA1(oldSheet.address) : null;
  const startRowOffset = oldCoords ? oldCoords.row : 0;

  const oldData = normalizeSheetData(oldSheet.data);
  const newData = normalizeSheetData(newSheet.data);

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
          oldData[oldIdx],
          newData[newIdx],
          result,
          activeFilterIds
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
          rowIndex: newIdx, // This remains relative for the "trueInsertions" filter logic.
          rowData: addedRowData,
        });

        addedRowData.cells.forEach((cell) => {
          const hasValue = cell.value !== "" && cell.value !== undefined;
          const hasFormula = cell.formula !== "" && cell.formula !== undefined;

          if (hasValue || hasFormula) {
            result.modifiedCells.push({
              sheet: sheetName,
              address: cell.address,
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
          rowIndex: oldIdx + startRowOffset, // This is now an absolute worksheet index.
          rowData: oldData[oldIdx],
        });
        oldIdx++;
      }
    } else {
      for (let j = 0; j < part.count; j++) {
        compareCells(
          sheetName,
          oldData[oldIdx],
          newData[newIdx],
          result,
          activeFilterIds
        );
        oldIdx++;
        newIdx++;
      }
    }
  }

  const trueInsertions = result.addedRows.filter(row => row.rowIndex < oldData.length);
  const trueDeletions = result.deletedRows;
  
  // Pass startRowOffset for insertions (relative) and 0 for deletions (already absolute).
  const insertionChanges = coalesceRowChanges(sheetName, trueInsertions, "row_insertion", startRowOffset);
  const deletionChanges = coalesceRowChanges(sheetName, trueDeletions, "row_deletion", 0);

  result.structuralChanges.push(...insertionChanges, ...deletionChanges);

  return result;
}

export function diffSnapshots(
  oldSnapshot: IWorkbookSnapshot,
  newSnapshot: IWorkbookSnapshot,
  license: ILicense,
  activeFilterIds: Set<string>
): IChangeset {
  const result: IChangeset = {
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
    
    const oldSheet = oldSnapshot[sheetName];
    const newSheet = newSnapshot[sheetName];

    const sheetResult = diffSheetData(sheetName, oldSheet, newSheet, activeFilterIds);
    result.modifiedCells.push(...sheetResult.modifiedCells);
    result.addedRows.push(...sheetResult.addedRows);
    result.deletedRows.push(...sheetResult.deletedRows);
    result.structuralChanges.push(...sheetResult.structuralChanges);
  }

  // --- SERVICE-LAYER PAYWALL ENFORCEMENT ---
  const proFilters = getProFilterIds();
  
  let isProFilterActive = false;
  activeFilterIds.forEach(id => {
    if (proFilters.has(id)) {
      isProFilterActive = true;
    }
  });

  if (license?.tier === 'free' && isProFilterActive && result.modifiedCells.length > PARTIAL_RESULT_COUNT) {
    const originalCount = result.modifiedCells.length;
    result.modifiedCells = result.modifiedCells.slice(0, PARTIAL_RESULT_COUNT);
    result.isPartialResult = true;
    result.hiddenChangeCount = originalCount - PARTIAL_RESULT_COUNT;
  }
  // --- END PAYWALL ENFORCEMENT ---

  return result;
}