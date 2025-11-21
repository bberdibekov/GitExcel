// src/taskpane/features/comparison/services/sheet-content-diff.service.ts

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
 * Robust helper to extract a 1-based row index from an address string.
 * Handles standard "A1" syntax via fromA1, and falls back to manual parsing for "Row:Row" syntax (e.g., "5:5").
 */
function safeGetRow(address: string): number {
  const parsed = fromA1(address);
  if (parsed) return parsed.row;

  // Handle "5:5" or "5"
  const match = address.match(/^(\d+):(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Last resort check if it's just a number
  if (!isNaN(Number(address))) {
    return Number(address);
  }

  console.warn(`[DiffService] safeGetRow failed to parse: ${address}`);
  return 0;
}

function buildRowAlignmentMap(
  sheetId: SheetId,
  oldDataLength: number,
  newDataLength: number,
  sanitizedEvents: IRawEvent[],
  startRowOffset: number,
): IRowAlignmentItem[] {
  const map: IRowAlignmentItem[] = [];

  // === DEBUG: INSPECT EVENT MATCHING ===
  if (sanitizedEvents.length > 0) {
    console.group(`[RowAlignment Debug] Filtering events for Target Sheet: "${sheetId}"`);
    sanitizedEvents.forEach((e, i) => {
      const isSheetMatch = e.sheetId === sheetId;
      const isWorksheetMatch = e.worksheetId === sheetId;
      const isTypeMatch =
        e.changeType === "RowInserted" || e.changeType === "RowDeleted";

      // Only log if it's a relevant type, to reduce noise
      if (isTypeMatch) {
        console.log(`Event[${i}] (${e.changeType}):`);
        console.log(
          `  - Event SheetID: "${e.sheetId}" (Len: ${e.sheetId?.length})`
        );
        console.log(
          `  - Target SheetID: "${sheetId}" (Len: ${sheetId?.length})`
        );
        console.log(
          `  - Match Result: SheetID=${isSheetMatch}, WorksheetID=${isWorksheetMatch}`
        );
      }
    });
    console.groupEnd();
  }
  // =====================================

  // FIX: Filter events using the persistent sheetId (GUID) OR the session worksheetId.
  const events = sanitizedEvents.filter(
    (e) =>
      (e.sheetId === sheetId || e.worksheetId === sheetId) &&
      (e.changeType === "RowInserted" || e.changeType === "RowDeleted"),
  );

  // === DEBUG: DIAGNOSE ROW ALIGNMENT INPUTS ===
  console.group(`[RowAlignment Debug] Sheet: ${sheetId.substring(0, 6)}...`);
  console.log(`Lengths -> Old: ${oldDataLength}, New: ${newDataLength}`);
  console.log(`Relevant Structural Events Found: ${events.length}`, events);
  // ===========================================

  let currentOldRow = 0;
  let currentNewRow = 0;

  // Sort by row index using safe helper
  events.sort((a, b) => {
    const aRow = safeGetRow(a.address);
    const bRow = safeGetRow(b.address);
    return aRow - bRow;
  });

  const insertionLogicalIndices = events
    .filter((e) => e.changeType === "RowInserted")
    .map((e) => safeGetRow(e.address));

  const deletionLogicalIndices = events
    .filter((e) => e.changeType === "RowDeleted")
    .map((e) => safeGetRow(e.address));

  // Calculate boundaries.
  // Note: Logical Rows are 1-based Excel Indices.
  const maxLogicalRow = Math.max(
    oldDataLength + startRowOffset,
    newDataLength + startRowOffset,
    ...insertionLogicalIndices,
    ...deletionLogicalIndices,
  );

  for (
    let logicalRowIndex = 1;
    logicalRowIndex <= maxLogicalRow;
    logicalRowIndex++
  ) {
    // FIX: ROW OFFSET CHECK
    // Ensure we don't touch the data arrays until we reach the actual used range start.
    // Example: If UsedRange starts at Row 3 (offset 2), logical rows 1 and 2 should be skipped/ignored by the pointer.
    const isPastStart = logicalRowIndex > startRowOffset;

    const isInsertionPoint = insertionLogicalIndices.includes(logicalRowIndex);
    const isDeletionPoint = deletionLogicalIndices.includes(logicalRowIndex);

    if (isDeletionPoint) {
      // Only consume from Old Data if we are effectively inside the data range
      if (isPastStart && currentOldRow < oldDataLength) {
        map.push({ type: "deleted", oldIndex: currentOldRow, newIndex: -1 });
        currentOldRow++;
      }
    }

    if (isInsertionPoint) {
      // Only consume from New Data if we are effectively inside the data range
      if (isPastStart && currentNewRow < newDataLength) {
        map.push({ type: "inserted", oldIndex: -1, newIndex: currentNewRow });
        currentNewRow++;
      }
    }

    const oldExists = currentOldRow < oldDataLength;
    const newExists = currentNewRow < newDataLength;

    if (!isInsertionPoint && !isDeletionPoint) {
      // If we haven't reached the start of data yet, do nothing.
      // (Unless we want to support matching header rows outside used range? Unlikely for snapshot data).
      if (isPastStart) {
        if (oldExists && newExists) {
          map.push({
            type: "match",
            oldIndex: currentOldRow,
            newIndex: currentNewRow,
          });
          currentOldRow++;
          currentNewRow++;
        } else if (oldExists) {
          // Implicit Deletion / Truncation
          // Old data continues, but new data ran out (and no event triggered)
          map.push({ type: "deleted", oldIndex: currentOldRow, newIndex: -1 });
          currentOldRow++;
        } else if (newExists) {
          // Implicit Insertion / Extension
          // New data continues, but old data ran out
           map.push({
            type: "match",
            oldIndex: -1, // Virtual Empty Row
            newIndex: currentNewRow,
          });
          currentNewRow++;
        }
      }
    }
  }

  // === DEBUG: BEFORE TAIL FILLING ===
  console.log(
    `Status before tail filling -> CurrentOld: ${currentOldRow}, OldLen: ${oldDataLength}, CurrentNew: ${currentNewRow}, NewLen: ${newDataLength}`,
  );
  // ==================================

  // Handle any remaining rows (Tail Filling)
  while (currentOldRow < oldDataLength) {
    map.push({ type: "deleted", oldIndex: currentOldRow++, newIndex: -1 });
  }

  while (currentNewRow < newDataLength) {
    // Treat extra new rows as matching against empty space (Range Extension)
    map.push({
      type: "match",
      oldIndex: -1,
      newIndex: currentNewRow++,
    });
  }

  console.groupEnd();
  return map;
}

/**
 * Creates a fast lookup map for all cell addresses modified by a user (RangeEdited events).
 */
function getRangeEditedLookup(
  sheetId: SheetId,
  sanitizedEvents: IRawEvent[],
): Set<string> {
  const lookup = new Set<string>();
  const rangeEditedEvents = sanitizedEvents.filter((e) => {
    if (e.sheetId === sheetId) return e.changeType === "RangeEdited";
    return e.worksheetId === sheetId && e.changeType === "RangeEdited";
  });

  for (const event of rangeEditedEvents) {
    const normalizedAddress = event.address.toUpperCase();
    lookup.add(normalizedAddress);
  }

  return lookup;
}

// === END: HYBRID DIFF HELPERS ===

// ... [Keep existing analyzeColumnChanges, isRealFormula, applyFilters, normalizeSheetData, normalizeFormula, coalesceRowChanges] ...
const COLUMN_CHANGE_CONFIDENCE_THRESHOLD = 0.7;

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

  candidates.forEach((rowCandidates) => {
    if (rowCandidates.length === 1) {
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

  if (
    dominantCandidateKey &&
    maxVotes >= modifiedRowCount * COLUMN_CHANGE_CONFIDENCE_THRESHOLD
  ) {
    const [type, indexStr, countStr] = dominantCandidateKey.split(":");
    const index = parseInt(indexStr, 10);
    const count = parseInt(countStr, 10);

    return [
      {
        type: type === "add" ? "column_insertion" : "column_deletion",
        sheet: "" as SheetId,
        index: index,
        count: count,
      },
    ];
  }

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
  return filterRegistry.some(
    (filter) =>
      activeFilterIds.has(filter.id) && filter.apply(oldValue, newValue),
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
    const searchForQuoted = new RegExp(`'${rename.oldName}'!`, "g");
    const searchForUnquoted = new RegExp(
      `(?<!')\\b${rename.oldName}\\b!`,
      "g",
    );
    const replaceWith = "${rename.newName}"!;

    normalizedFormula = normalizedFormula.replace(searchForQuoted, replaceWith);
    normalizedFormula = normalizedFormula.replace(
      searchForUnquoted,
      replaceWith,
    );
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
  rangeEditedLookup: Set<string>,
): IChange[] {
  const modifiedCells: IChange[] = [];
  const maxCols = Math.max(oldRow.cells.length, newRow.cells.length);
  for (let c = 0; c < maxCols; c++) {
    const oldCell = oldRow.cells[c];
    const newCell = newRow.cells[c];

    const canonicalAddress = newCell?.address || oldCell?.address;
    if (!canonicalAddress) continue;

    const lookupKey = canonicalAddress.toUpperCase();

    const _oldCell = oldCell || { value: "", formula: "", precedents: [] };
    const _newCell = newCell || { value: "", formula: "" };

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
      ) &&
      normalizedOldFormula !== String(_newCell.formula);

    if (valueChanged || formulaChanged) {
      const isUserEdit = rangeEditedLookup.has(lookupKey);

      // --- HYBRID DIFF: NEGATIVE PROOF FILTER ---
      if (!isUserEdit && (valueChanged || formulaChanged)) {
        // Case 2: System Recalc (Old != New BUT Log is Empty)
        modifiedCells.push({
          sheet: sheetId,
          address: canonicalAddress,
          changeType: formulaChanged
            ? valueChanged
              ? "both"
              : "formula"
            : "value",
          oldValue: _oldCell.value,
          newValue: _newCell.value,
          oldFormula: _oldCell.formula,
          newFormula: _newCell.formula,
          fromVersionComment,
          toVersionComment,
          metadata: { source: "system_recalc", isConsequential: true },
        });
        continue;
      }

      // Case 1: User Edit (Old != New AND Log Contains Event)
      modifiedCells.push({
        sheet: sheetId,
        address: canonicalAddress,
        changeType: formulaChanged
          ? valueChanged
            ? "both"
            : "formula"
          : "value",
        oldValue: _oldCell.value,
        newValue: _newCell.value,
        oldFormula: _oldCell.formula,
        newFormula: _newCell.formula,
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
  const startRowOffset = oldSheet.startRow;
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

      addedRowData.cells.forEach((cell) => {
        const hasContent =
          (cell.value !== "" && cell.value != null) ||
          isRealFormula(cell.formula);
        if (hasContent) {
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
      // Handle "Implicit Match" where we extended past the old range.
      // If oldIndex is -1 (or out of bounds), create a virtual empty row.
      const oldRow =
        item.oldIndex !== -1 && oldData[item.oldIndex]
          ? oldData[item.oldIndex]
          : { hash: "", cells: [] }; // Virtual Empty Row

      const newRow = newData[item.newIndex];

      if (oldRow.hash !== newRow.hash) {
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