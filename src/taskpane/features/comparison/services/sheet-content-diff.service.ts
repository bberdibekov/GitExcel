// src/taskpane/features/comparison/services/sheet-content-diff.service.ts

import { Change, diffArrays } from "diff";
import {
  ICellData,
  IChange,
  IChangeset,
  IRawEvent,
  IRowChange,
  IRowData,
  ISheetSnapshot,
  IStructuralChange,
  SheetId,
} from "../../../types/types";
import { fromA1 } from "../../../shared/lib/address.converter";
import { generateRowHash } from "../../../shared/lib/hashing.service";
import {
  formulaFilters,
  IComparisonFilter,
  valueFilters,
} from "./comparison.filters";
import { ISheetRename } from "./sheet.diff.service";

// This file contains the low-level, specialized logic for comparing the
// cell-by-cell content of two ISheetSnapshot objects.

// --- HELPER TYPES for column analysis ---
interface IColumnChangeCandidate {
  type: "add" | "delete";
  index: number;
  count: number;
}

// === START: HYBRID DIFF HELPERS ===

interface IRowAlignmentItem {
  type: "match" | "inserted" | "deleted";
  oldIndex: number; // -1 for inserted rows (index in oldData)
  newIndex: number; // -1 for deleted rows (index in newData)
}

/**

Parses raw structural events for a sheet and creates a strict alignment map

showing which old row corresponds to which new row.

NOTE: This is a complex heuristic assuming simple, non-overlapping structural changes.
*/
function buildRowAlignmentMap(
  sheetId: SheetId,
  oldDataLength: number,
  newDataLength: number,
  sanitizedEvents: IRawEvent[],
  startRowOffset: number,
): IRowAlignmentItem[] {
  const map: IRowAlignmentItem[] = [];
  const events = sanitizedEvents.filter(
    (e) =>
      e.worksheetId === sheetId &&
      (e.changeType === "RowInserted" || e.changeType === "RowDeleted"),
  );

  let currentOldRow = 0;
  let currentNewRow = 0;

  // Events must be sorted by index to process structural changes correctly
  events.sort((a, b) => {
    // Convert A1 address (e.g., "A10:Z10") to its 1-based row index
    const aRow = fromA1(a.address).row;
    const bRow = fromA1(b.address).row;
    return aRow - bRow;
  });

  // Pre-process event indices relative to the sheet's logical structure (1-based row index)
  const insertionLogicalIndices = events
    .filter((e) => e.changeType === "RowInserted")
    .map((e) => fromA1(e.address).row);

  const deletionLogicalIndices = events
    .filter((e) => e.changeType === "RowDeleted")
    .map((e) => fromA1(e.address).row);

  // Determine the maximum logical index we need to track.
  const maxLogicalRow = Math.max(
    oldDataLength + startRowOffset,
    newDataLength + startRowOffset,
    ...insertionLogicalIndices,
    ...deletionLogicalIndices,
  );

  // Iterate through the logical indices (1-based row index in Excel)
  for (
    let logicalRowIndex = 1; logicalRowIndex <= maxLogicalRow; logicalRowIndex++
  ) {
    const isInsertionPoint = insertionLogicalIndices.includes(logicalRowIndex);
    const isDeletionPoint = deletionLogicalIndices.includes(logicalRowIndex);

    // Check for Deletions first (as a deletion in the old snapshot affects indices)
    if (isDeletionPoint) {
      if (currentOldRow < oldDataLength) {
        map.push({ type: "deleted", oldIndex: currentOldRow, newIndex: -1 });
        currentOldRow++;
      }
    }

    // Check for Insertions
    if (isInsertionPoint) {
      if (currentNewRow < newDataLength) {
        map.push({ type: "inserted", oldIndex: -1, newIndex: currentNewRow });
        currentNewRow++;
      }
    }

    // Check for Match (content that was neither deleted nor inserted at this logical row)
    const oldExists = currentOldRow < oldDataLength;
    const newExists = currentNewRow < newDataLength;

    if (oldExists && newExists) {
      // If we haven't processed an insertion or deletion event at this logical row,
      // it means the row, even if shifted, aligns content-wise here.
      if (!isInsertionPoint && !isDeletionPoint) {
        map.push({
          type: "match",
          oldIndex: currentOldRow,
          newIndex: currentNewRow,
        });
        currentOldRow++;
        currentNewRow++;
      }
    }
  }

  // Fallback catch for rows remaining outside the event-logged range (e.g., changes outside used range, large block ops)
  while (currentOldRow < oldDataLength) {
    map.push({ type: "deleted", oldIndex: currentOldRow++, newIndex: -1 });
  }
  while (currentNewRow < newDataLength) {
    map.push({ type: "inserted", oldIndex: -1, newIndex: currentNewRow++ });
  }

  return map;
}

/**

Creates a fast lookup map for all cell addresses modified by a user (RangeEdited events).
*/
function getRangeEditedLookup(
  sheetId: SheetId,
  sanitizedEvents: IRawEvent[],
): Set<string> {
  const lookup = new Set<string>();

  // RangeEdited is the only event that definitively proves a user touched a cell value/formula.
  const rangeEditedEvents = sanitizedEvents.filter(
    (e) => e.worksheetId === sheetId && e.changeType === "RangeEdited",
  );

  for (const event of rangeEditedEvents) {
    // We rely on the event.address being accurate.
    lookup.add(event.address);
  }

  return lookup;
}

// === END: HYBRID DIFF HELPERS ===

/**

The confidence threshold for promoting a series of cell shifts to a structural column change.

If 70% of modified rows show the same column add/delete pattern, we treat it as structural.
*/
const COLUMN_CHANGE_CONFIDENCE_THRESHOLD = 0.7;

/**

Analyzes the collected evidence of cell shifts across all modified rows to determine

if a uniform column insertion or deletion occurred.
*/
function analyzeColumnChanges(
  candidates: Map<number, IColumnChangeCandidate[]>,
  modifiedRowCount: number,
): IStructuralChange[] {
  if (modifiedRowCount === 0 || candidates.size === 0) {
    return [];
  }

  const voteCounter = new Map<string, number>();
  let dominantCandidateKey: string | null = null;
  let maxVotes = 0;

  // Each row "votes" for the structural change it observed.
  candidates.forEach((rowCandidates) => {
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
  if (
    dominantCandidateKey &&
    maxVotes >= modifiedRowCount * COLUMN_CHANGE_CONFIDENCE_THRESHOLD
  ) {
    const [type, indexStr, countStr] = dominantCandidateKey.split(":");
    const index = parseInt(indexStr, 10);
    const count = parseInt(countStr, 10);

    // This is a high-confidence structural change.
    return [{
      type: type === "add" ? "column_insertion" : "column_deletion",
      sheet: "" as SheetId, // The sheetId will be added by the caller
      index: index,
      count: count,
    }];
  }

  // The changes were not uniform enough; likely a "shift cells" operation.
  return [];
}

function isRealFormula(formula: any): boolean {
  return typeof formula === "string" && formula.startsWith("=");
}

function applyFilters(
  oldValue: any,
  newValue: any,
  activeFilterIds: Set<string>,
  filterRegistry: IComparisonFilter[],
): boolean {
  return filterRegistry.some((filter) =>
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

function coalesceRowChanges(
  sheetId: SheetId,
  rowChanges: IRowChange[],
  type: "row_insertion" | "row_deletion",
  startRowOffset: number,
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
      currentBlock = {
        type,
        sheet: sheetId,
        index: sortedChanges[i].rowIndex + startRowOffset,
        count: 1,
      };
    }
  }
  structuralChanges.push(currentBlock);
  return structuralChanges;
}

/**

Updated compareCells to include the "Negative Proof" filter.
*/
function compareCellsHybrid(
  sheetId: SheetId,
  oldRow: IRowData,
  newRow: IRowData,
  activeFilterIds: Set<string>,
  renames: ISheetRename[],
  deletions:
    (IStructuralChange & { type: "sheet_deletion"; sheetId: SheetId })[],
  fromVersionComment: string,
  toVersionComment: string,
  rangeEditedLookup: Set<string>, // NEW ARGUMENT
): IChange[] {
  const modifiedCells: IChange[] = [];
  const maxCols = Math.max(oldRow.cells.length, newRow.cells.length);
  for (let c = 0; c < maxCols; c++) {
    const oldCell = oldRow.cells[c];
    const newCell = newRow.cells[c];

    const canonicalAddress = newCell?.address || oldCell?.address;
    if (!canonicalAddress) continue;

    const _oldCell = oldCell || { value: "", formula: "", precedents: [] };
    const _newCell = newCell || { value: "", formula: "" };

    // --- CONVOLUTED FORMULA CHECK (Unchanged) ---
    if (
      isRealFormula(_oldCell.formula) &&
      String(_newCell.formula).includes("#REF!")
    ) {
      const deletedSheetIds = new Set(deletions.map((d) => d.sheetId!));
      if (_oldCell.precedents?.some((p) => deletedSheetIds.has(p.sheetId))) {
        modifiedCells.push({
          sheet: sheetId,
          address: canonicalAddress,
          changeType: "formula",
          oldValue: _oldCell.value,
          newValue: _newCell.value,
          oldFormula: _oldCell.formula,
          newFormula: _newCell.formula,
          fromVersionComment,
          toVersionComment,
          metadata: {
            isConsequential: true,
            reason: "ref_error_sheet_deleted",
          },
        });
        continue;
      }
    }

    const valueChanged =
      !applyFilters(
        _oldCell.value,
        _newCell.value,
        activeFilterIds,
        valueFilters,
      ) && String(_oldCell.value) !== String(_newCell.value);
    const normalizedOldFormula = normalizeFormula(
      String(_oldCell.formula),
      renames,
    );
    const formulaChanged =
      (isRealFormula(_oldCell.formula) || isRealFormula(_newCell.formula)) &&
      !applyFilters(
        normalizedOldFormula,
        _newCell.formula,
        activeFilterIds,
        formulaFilters,
      ) && (normalizedOldFormula !== String(_newCell.formula));

    if (valueChanged || formulaChanged) {
      // --- HYBRID DIFF: NEGATIVE PROOF FILTER ---
      const isUserEdit = rangeEditedLookup.has(canonicalAddress);

      if (!isUserEdit && (valueChanged || formulaChanged)) {
        // Case 2: Old != New BUT Log is Empty for Address -> System Recalc (Dim/Ignore)
        modifiedCells.push({
          sheet: sheetId,
          address: canonicalAddress,
          changeType: formulaChanged
            ? (valueChanged ? "both" : "formula")
            : "value",
          oldValue: _oldCell.value,
          newValue: _newCell.value,
          oldFormula: _oldCell.formula,
          newFormula: _newCell.formula,
          fromVersionComment,
          toVersionComment,
          metadata: { source: "system_recalc", isConsequential: true }, // Mark as consequential/recalc
        });
        continue;
      }

      // Case 1: Old != New AND Log contains RangeEdited(Address) -> User Edit (Highlight)
      modifiedCells.push({
        sheet: sheetId,
        address: canonicalAddress,
        changeType: formulaChanged
          ? (valueChanged ? "both" : "formula")
          : "value",
        oldValue: _oldCell.value,
        newValue: _newCell.value,
        oldFormula: _oldCell.formula,
        newFormula: _newCell.formula, // Corrected assignment
        fromVersionComment,
        toVersionComment,
      });
    }
  }
  return modifiedCells;
}

export function diffSheetContent(
  sheetId: SheetId,
  oldSheet: ISheetSnapshot,
  newSheet: ISheetSnapshot,
  activeFilterIds: Set<string>,
  renames: ISheetRename[],
  deletions:
    (IStructuralChange & { type: "sheet_deletion"; sheetId: SheetId })[],
  fromVersionComment: string,
  toVersionComment: string,
  sanitizedEvents: IRawEvent[],
): IChangeset {
  const result: IChangeset = {
    modifiedCells: [],
    addedRows: [],
    deletedRows: [],
    structuralChanges: [],
  };
  const oldCoords = oldSheet.address ? fromA1(oldSheet.address) : null;
  // startRow is 0-based index of the first row containing data. We use this offset for 1-based structural changes.
  const startRowOffset = oldSheet.startRow;
  const startColOffset = oldSheet.startCol;
  const oldData = normalizeSheetData(oldSheet.data);
  const newData = normalizeSheetData(newSheet.data);

  // --- HYBRID DIFF PHASE 1: Alignment Map & Lookup ---
  const alignmentMap = buildRowAlignmentMap(
    sheetId,
    oldData.length,
    newData.length,
    sanitizedEvents,
    startRowOffset,
  );
  const rangeEditedLookup = getRangeEditedLookup(sheetId, sanitizedEvents);

  let tempAddedRows: IRowChange[] = [];
  let tempDeletedRows: IRowChange[] = [];
  const bufferedModifiedCells: IChange[] = [];

  // --- HYBRID DIFF PHASE 2: Iterating the Alignment Map ---
  for (const item of alignmentMap) {
    if (item.type === "inserted") {
      const addedRowData = newData[item.newIndex];
      tempAddedRows.push({
        sheet: sheetId,
        rowIndex: item.newIndex,
        rowData: addedRowData,
      });

      // Cells in an inserted row are always "modified cells" if they contain content.
      addedRowData.cells.forEach((cell) => {
        const hasContent = (cell.value !== "" && cell.value != null) ||
          isRealFormula(cell.formula);
        if (hasContent) {
          // Treat cell content in newly added rows as user edits.
          result.modifiedCells.push({
            sheet: sheetId,
            address: cell.address,
            changeType: isRealFormula(cell.formula) ? "both" : "value",
            oldValue: "",
            newValue: cell.value,
            oldFormula: "",
            newFormula: cell.formula,
            fromVersionComment,
            toVersionComment,
          });
        }
      });
    } else if (item.type === "deleted") {
      tempDeletedRows.push({
        sheet: sheetId,
        rowIndex: item.oldIndex,
        rowData: oldData[item.oldIndex],
      });
    } else if (item.type === "match") {
      const oldRow = oldData[item.oldIndex];
      const newRow = newData[item.newIndex];

      // Check content hash: If hashes match, the content is identical.
      // This eliminates most ripple-effect changes caused by shifts.
      if (oldRow.hash !== newRow.hash) {
        // Perform the granular comparison using the hybrid logic
        const changes = compareCellsHybrid(
          sheetId,
          oldRow,
          newRow,
          activeFilterIds,
          renames,
          deletions,
          fromVersionComment,
          toVersionComment,
          rangeEditedLookup,
        );
        bufferedModifiedCells.push(...changes);
      }
    }
  }

  // --- PASS 3: Coalesce Results ---
  result.modifiedCells.push(...bufferedModifiedCells);
  result.addedRows.push(...tempAddedRows);
  result.deletedRows.push(...tempDeletedRows);

  // Convert row changes into structural blocks, applying the startRowOffset
  result.structuralChanges.push(
    ...coalesceRowChanges(
      sheetId,
      tempAddedRows,
      "row_insertion",
      startRowOffset,
    ),
    ...coalesceRowChanges(
      sheetId,
      tempDeletedRows,
      "row_deletion",
      startRowOffset,
    ),
  );

  return result;
}
