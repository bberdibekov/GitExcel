// src/taskpane/features/comparison/services/sheet-content-diff.service.ts

import { diffArrays, Change } from "diff";
import {
  ICellData,
  IChange,
  IChangeset,
  IRowChange,
  IRowData,
  IStructuralChange,
  ISheetSnapshot,
  SheetId,
} from "../../../types/types";
import { fromA1 } from "../../../shared/lib/address.converter";
import { generateRowHash } from "../../../shared/lib/hashing.service";
import { valueFilters, formulaFilters, IComparisonFilter } from "./comparison.filters";
import { ISheetRename } from "./sheet.diff.service";

// This file contains the low-level, specialized logic for comparing the
// cell-by-cell content of two ISheetSnapshot objects.

// --- HELPER TYPES for column analysis ---
interface IColumnChangeCandidate {
  type: 'add' | 'delete';
  index: number;
  count: number;
}

// --- START: NEW COLUMN ANALYSIS LOGIC ---

/**
 * The confidence threshold for promoting a series of cell shifts to a structural column change.
 * If 70% of modified rows show the same column add/delete pattern, we treat it as structural.
 */
const COLUMN_CHANGE_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Analyzes the collected evidence of cell shifts across all modified rows to determine
 * if a uniform column insertion or deletion occurred.
 * @param candidates A map where the key is a row index and the value is the list of cell shifts in that row.
 * @param modifiedRowCount The total number of rows that had content modifications.
 * @returns A definitive list of IStructuralChange events if a uniform change is detected, otherwise an empty array.
 */
function analyzeColumnChanges(
  candidates: Map<number, IColumnChangeCandidate[]>,
  modifiedRowCount: number
): IStructuralChange[] {
  if (modifiedRowCount === 0 || candidates.size === 0) {
    return [];
  }
  
  const voteCounter = new Map<string, number>();
  let dominantCandidateKey: string | null = null;
  let maxVotes = 0;

  // Each row "votes" for the structural change it observed.
  candidates.forEach(rowCandidates => {
    if (rowCandidates.length === 1) { // Only consider simple, unambiguous changes (one add or one delete per row)
      const candidate = rowCandidates[0];
      const key = `${candidate.type}:${candidate.index}:${candidate.count}`;
      const newCount = (voteCounter.get(key) || 0) + 1;
      voteCounter.set(key, newCount);
      if (newCount > maxVotes) {
        maxVotes = newCount;
        dominantCandidateKey = key;
      }
    }
  });

  // If a single candidate wins a sufficient majority of the votes, we have a winner.
  if (dominantCandidateKey && maxVotes >= modifiedRowCount * COLUMN_CHANGE_CONFIDENCE_THRESHOLD) {
    const [type, indexStr, countStr] = dominantCandidateKey.split(':');
    const index = parseInt(indexStr, 10);
    const count = parseInt(countStr, 10);
    
    // This is a high-confidence structural change.
    return [{
      type: type === 'add' ? 'column_insertion' : 'column_deletion',
      sheet: '' as SheetId, // The sheetId will be added by the caller
      index: index,
      count: count,
    }];
  }

  // The changes were not uniform enough; likely a "shift cells" operation.
  return [];
}
// --- END: NEW COLUMN ANALYSIS LOGIC ---


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

function normalizeFormula(formula: string, renames: ISheetRename[]): string {
  if (!isRealFormula(formula) || renames.length === 0) {
    return formula;
  }

  let normalizedFormula = formula;
  for (const rename of renames) {
    const searchForQuoted = new RegExp(`'${rename.oldName}'!`, 'g');
    const searchForUnquoted = new RegExp(`(?<!')\\b${rename.oldName}\\b!`, 'g');
    const replaceWith = `'${rename.newName}'!`;

    normalizedFormula = normalizedFormula.replace(searchForQuoted, replaceWith);
    normalizedFormula = normalizedFormula.replace(searchForUnquoted, replaceWith);
  }
  return normalizedFormula;
}

// This function now handles the "fallback" case: a direct cell-by-cell comparison
// for rows that are modified but NOT part of a uniform structural change.
function compareCells(
  sheetId: SheetId,
  oldRow: IRowData,
  newRow: IRowData,
  activeFilterIds: Set<string>,
  renames: ISheetRename[],
  deletions: (IStructuralChange & { type: 'sheet_deletion', sheetId: SheetId })[]
): IChange[] {
  const modifiedCells: IChange[] = [];
  const maxCols = Math.max(oldRow.cells.length, newRow.cells.length);
  for (let c = 0; c < maxCols; c++) {
    const oldCell = oldRow.cells[c];
    const newCell = newRow.cells[c];

    const canonicalAddress = (newCell?.address || oldCell?.address);
    if (!canonicalAddress) continue;

    const _oldCell = oldCell || { value: "", formula: "", precedents: [] };
    const _newCell = newCell || { value: "", formula: "" };

    if (isRealFormula(_oldCell.formula) && String(_newCell.formula).includes("#REF!")) {
      const deletedSheetIds = new Set(deletions.map(d => d.sheetId!));
      if (_oldCell.precedents?.some(p => deletedSheetIds.has(p.sheetId))) {
        modifiedCells.push({
          sheet: sheetId, address: canonicalAddress, changeType: "formula",
          oldValue: _oldCell.value, newValue: _newCell.value,
          oldFormula: _oldCell.formula, newFormula: _newCell.formula,
          metadata: { isConsequential: true, reason: "ref_error_sheet_deleted" },
        });
        continue;
      }
    }

    const valueChanged = !applyFilters(_oldCell.value, _newCell.value, activeFilterIds, valueFilters) && String(_oldCell.value) !== String(_newCell.value);
    const normalizedOldFormula = normalizeFormula(String(_oldCell.formula), renames);
    const formulaChanged = (isRealFormula(_oldCell.formula) || isRealFormula(_newCell.formula)) && !applyFilters(normalizedOldFormula, _newCell.formula, activeFilterIds, formulaFilters) && (normalizedOldFormula !== String(_newCell.formula));

    if (valueChanged || formulaChanged) {
      modifiedCells.push({
        sheet: sheetId, address: canonicalAddress,
        changeType: formulaChanged ? (valueChanged ? "both" : "formula") : "value",
        oldValue: _oldCell.value, newValue: _newCell.value,
        oldFormula: _oldCell.formula, newFormula: _newCell.formula,
      });
    }
  }
  return modifiedCells;
}

function coalesceRowChanges(
  sheetId: SheetId,
  rowChanges: IRowChange[],
  type: "row_insertion" | "row_deletion",
  startRowOffset: number
): IStructuralChange[] {
  if (rowChanges.length === 0) return [];
  const structuralChanges: IStructuralChange[] = [];
  const sortedChanges = [...rowChanges].sort((a, b) => a.rowIndex - b.rowIndex);

  let currentBlock: IStructuralChange = {
    type, sheet: sheetId,
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

// --- START: REFACTORED diffSheetContent ---
export function diffSheetContent(
  sheetId: SheetId,
  oldSheet: ISheetSnapshot,
  newSheet: ISheetSnapshot,
  activeFilterIds: Set<string>,
  renames: ISheetRename[],
  deletions: (IStructuralChange & { type: 'sheet_deletion', sheetId: SheetId })[]
): IChangeset {
  const result: IChangeset = { modifiedCells: [], addedRows: [], deletedRows: [], structuralChanges: [] };
  const oldCoords = oldSheet.address ? fromA1(oldSheet.address) : null;
  const startRowOffset = oldCoords ? oldCoords.row : 0;
  const oldData = normalizeSheetData(oldSheet.data);
  const newData = normalizeSheetData(newSheet.data);

  const rowHashChanges = diffArrays(oldData.map(r => r.hash), newData.map(r => r.hash));

  const columnChangeCandidates = new Map<number, IColumnChangeCandidate[]>();
  const bufferedModifiedCells: IChange[] = [];
  let modifiedRowCount = 0;

  let oldIdx = 0;
  let newIdx = 0;

  // --- PASS 1: GATHER EVIDENCE from row and cell diffs ---
  for (let i = 0; i < rowHashChanges.length; i++) {
    const part = rowHashChanges[i];
    const nextPart = i + 1 < rowHashChanges.length ? rowHashChanges[i + 1] : null;

    if (part.removed && nextPart && nextPart.added && part.count === nextPart.count) {
      // This block represents modified rows.
      modifiedRowCount += part.count;
      for (let j = 0; j < part.count; j++) {
        const oldRow = oldData[oldIdx];
        const newRow = newData[newIdx];
        
        // Granular diff on cells to detect intra-row shifts.
        const cellChanges = diffArrays(oldRow.cells, newRow.cells, {
          comparator: (a, b) => a.value === b.value && a.formula === b.formula
        });

        const rowCandidates: IColumnChangeCandidate[] = [];
        let oldCellIdx = 0;
        let newCellIdx = 0;
        
        cellChanges.forEach(cellPart => {
          if (cellPart.added) {
            rowCandidates.push({ type: 'add', index: newCellIdx, count: cellPart.count });
            newCellIdx += cellPart.count;
          } else if (cellPart.removed) {
            rowCandidates.push({ type: 'delete', index: oldCellIdx, count: cellPart.count });
            oldCellIdx += cellPart.count;
          } else {
            oldCellIdx += cellPart.count;
            newCellIdx += cellPart.count;
          }
        });

        if (rowCandidates.length > 0) {
          columnChangeCandidates.set(oldIdx, rowCandidates);
        }
        
        // Buffer the detailed changes in case this is a fallback scenario.
        bufferedModifiedCells.push(...compareCells(sheetId, oldRow, newRow, activeFilterIds, renames, deletions));
        
        oldIdx++;
        newIdx++;
      }
      i++; // Skip the next part since we've processed it.
    } else if (part.added) {
      for (let j = 0; j < part.count; j++) {
        const addedRowData = newData[newIdx];
        result.addedRows.push({ sheet: sheetId, rowIndex: newIdx, rowData: addedRowData });
        addedRowData.cells.forEach(cell => {
          const hasContent = (cell.value !== "" && cell.value != null) || isRealFormula(cell.formula);
          if (hasContent) {
            result.modifiedCells.push({
              sheet: sheetId, address: cell.address, changeType: isRealFormula(cell.formula) ? 'both' : 'value',
              oldValue: "", newValue: cell.value, oldFormula: "", newFormula: cell.formula,
            });
          }
        });
        newIdx++;
      }
    } else if (part.removed) {
      for (let j = 0; j < part.count; j++) {
        result.deletedRows.push({ sheet: sheetId, rowIndex: oldIdx + startRowOffset, rowData: oldData[oldIdx] });
        oldIdx++;
      }
    } else { // Unchanged rows
      oldIdx += part.count;
      newIdx += part.count;
    }
  }

  // --- PASS 2: INFER STRUCTURAL CHANGES and decide on a strategy ---
  const inferredColumnChanges = analyzeColumnChanges(columnChangeCandidates, modifiedRowCount);

  if (inferredColumnChanges.length > 0) {
    // STRATEGY: A uniform column change was detected. Report it as a structural event.
    // We discard the bufferedModifiedCells because they are just noise/ripple effects.
    result.structuralChanges.push(...inferredColumnChanges.map(c => ({...c, sheet: sheetId})));
  } else {
    // STRATEGY: Fallback. No uniform change detected. This was a "shift cells" or manual edit.
    // Report the detailed, cell-by-cell changes.
    result.modifiedCells.push(...bufferedModifiedCells);
  }

  const trueInsertions = result.addedRows.filter(row => row.rowIndex < oldData.length);
  result.structuralChanges.push(
    ...coalesceRowChanges(sheetId, trueInsertions, "row_insertion", startRowOffset),
    ...coalesceRowChanges(sheetId, result.deletedRows, "row_deletion", 0)
  );

  return result;
}