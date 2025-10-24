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
} from "../../../types/types";
import { toA1, fromA1 } from "../../../shared/lib/address.converter";
import { generateRowHash } from "../../../shared/lib/hashing.service";
import { ILicense } from "../../../core/services/AuthService";
import { valueFilters, formulaFilters, IComparisonFilter } from "./comparison.filters";
import { sheetDiffService } from "./sheet.diff.service";

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
  sheetId: string, 
  rowChanges: IRowChange[],
  type: "row_insertion" | "row_deletion",
  startRowOffset: number // This is now correctly used.
): IStructuralChange[] {
  if (rowChanges.length === 0) return [];
  const structuralChanges: IStructuralChange[] = [];
  const sortedChanges = [...rowChanges].sort((a, b) => a.rowIndex - b.rowIndex);
  
  // The rowIndex for insertions is relative, so we MUST apply the offset.
  // The rowIndex for deletions is already absolute, so an offset of 0 is passed in.
  let currentBlock: IStructuralChange = {
    type,
    sheet: sheetId, 
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
      // Apply offset to the start of the next block as well.
      currentBlock = { type, sheet: sheetId, index: currentIndex + startRowOffset, count: 1 }; 
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
        sheet: sheetId,
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
  sheetId: string, // <-- MODIFIED: This parameter represents the persistent sheet ID, not the name.
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
          sheetId,
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
          sheet: sheetId, 
          rowIndex: newIdx, // This remains relative for the "trueInsertions" filter logic.
          rowData: addedRowData,
        });

        addedRowData.cells.forEach((cell) => {
          const hasValue = cell.value !== "" && cell.value !== undefined;
          const hasFormula = cell.formula !== "" && cell.formula !== undefined;

          if (hasValue || hasFormula) {
            result.modifiedCells.push({
              sheet: sheetId, 
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
          sheet: sheetId, 
          rowIndex: oldIdx + startRowOffset, // This is now an absolute worksheet index.
          rowData: oldData[oldIdx],
        });
        oldIdx++;
      }
    } else {
      for (let j = 0; j < part.count; j++) {
        compareCells(
          sheetId, 
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
  const insertionChanges = coalesceRowChanges(sheetId, trueInsertions, "row_insertion", startRowOffset); 
  const deletionChanges = coalesceRowChanges(sheetId, trueDeletions, "row_deletion", 0); 

  result.structuralChanges.push(...insertionChanges, ...deletionChanges);

  return result;
}

// --- MODIFIED: The entire diffSnapshots function is refactored. ---
export function diffSnapshots(
  oldSnapshot: IWorkbookSnapshot,
  newSnapshot: IWorkbookSnapshot,
  license: ILicense,
  activeFilterIds: Set<string>
): IChangeset {
  // 1. Get the high-level workbook structure changes first.
  const sheetDiffResult = sheetDiffService.diffSheets(oldSnapshot, newSnapshot);

  // 2. Initialize the final changeset with these structural changes.
  const result: IChangeset = {
    modifiedCells: [],
    addedRows: [],
    deletedRows: [],
    structuralChanges: sheetDiffResult.structuralChanges,
  };

  // 3. --- START OF BUGFIX ---
  // Process the content of newly ADDED sheets. This was the missing step.
  const addedSheetChanges = sheetDiffResult.structuralChanges.filter(c => c.type === 'sheet_addition');

  for (const addedSheet of addedSheetChanges) {
    const sheetId = addedSheet.sheetId!;
    const newSheet = newSnapshot[sheetId];
    if (!newSheet || !newSheet.data) continue;

    // Treat every row in the new sheet as an "added row".
    newSheet.data.forEach((rowData, rowIndex) => {
      result.addedRows.push({
        sheet: sheetId,
        rowIndex: rowIndex,
        rowData: rowData,
      });

      // And treat every cell with content as a "modified cell" (from blank to new).
      rowData.cells.forEach(cell => {
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
    });
  }
  // --- END OF BUGFIX ---


  // 4. Now, perform a deep, cell-by-cell diff ONLY on sheets that existed in both versions.
  for (const sheetId of sheetDiffResult.modifiedSheetIds) {
    // We can safely assume the sheet exists in both snapshots because of where modifiedSheetIds comes from.
    const oldSheet = oldSnapshot[sheetId];
    const newSheet = newSnapshot[sheetId];

    const sheetContentResult = diffSheetData(sheetId, oldSheet, newSheet, activeFilterIds);
    
    // 5. Merge the content changes from this sheet into our master result object.
    result.modifiedCells.push(...sheetContentResult.modifiedCells);
    result.addedRows.push(...sheetContentResult.addedRows);
    result.deletedRows.push(...sheetContentResult.deletedRows);
    result.structuralChanges.push(...sheetContentResult.structuralChanges); // Append row-level changes
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