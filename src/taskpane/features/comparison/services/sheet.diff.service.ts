import { IWorkbookSnapshot, IStructuralChange, SheetId, SheetName } from "../../../types/types";

/**
 * The result from comparing the sheet structure of two workbooks.
 */
export interface ISheetDiffResult {
  /** A list of all sheet additions, deletions, and renames. */
  structuralChanges: IStructuralChange[];
  /** A list of persistent IDs for sheets that exist in both snapshots and may have content changes. */
  modifiedSheetIds: string[];
}

/**
 * A type-safe representation of a sheet rename structural change.
 */
export interface ISheetRename extends IStructuralChange {
  type: "sheet_rename";
  sheetId: SheetId;
  oldName: SheetName;
  newName: SheetName;
}

class SheetDiffService {
  /**
   * Compares the sheet structure of two workbook snapshots.
   * @param oldSnapshot The starting version snapshot.
   * @param newSnapshot The ending version snapshot.
   * @returns An ISheetDiffResult object.
   */
  public diffSheets(oldSnapshot: IWorkbookSnapshot, newSnapshot: IWorkbookSnapshot): ISheetDiffResult {
    const result: ISheetDiffResult = {
      structuralChanges: [],
      modifiedSheetIds: [],
    };

    const oldSheetIds = new Set(Object.keys(oldSnapshot));
    const newSheetIds = new Set(Object.keys(newSnapshot));

    // 1. Find Deletions: Sheets in old but not in new
    for (const id of oldSheetIds) {
      if (!newSheetIds.has(id)) {
        result.structuralChanges.push({
          type: "sheet_deletion",
          sheet: oldSnapshot[id].name as any,  // The last known name
          sheetId: id as SheetId,
        });
      }
    }

    // 2. Find Additions: Sheets in new but not in old
    for (const id of newSheetIds) {
      if (!oldSheetIds.has(id)) {
        result.structuralChanges.push({
          type: "sheet_addition",
          sheet: newSnapshot[id].name as any,
          sheetId: id as SheetId,
        });
      }
    }

    // 3. Find Modifications/Renames: Sheets in both
    for (const id of oldSheetIds) {
      if (newSheetIds.has(id)) {
        const oldSheet = oldSnapshot[id];
        const newSheet = newSnapshot[id];

        // Check for renames
        if (oldSheet.name !== newSheet.name) {
          result.structuralChanges.push({
            type: "sheet_rename",
            sheet: newSheet.name as any, // Use the new name as the primary identifier
            sheetId: id as SheetId,
            oldName: oldSheet.name,
            newName: newSheet.name,
          });
        }
        
        // This sheet existed in both versions, so it needs a cell-level diff.
        result.modifiedSheetIds.push(id);
      }
    }

    return result;
  }
}

export const sheetDiffService = new SheetDiffService();