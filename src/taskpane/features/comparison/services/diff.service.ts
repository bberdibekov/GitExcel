// src/taskpane/features/comparison/services/diff.service.ts

import { IChangeset, IWorkbookSnapshot, SheetId, IStructuralChange } from "../../../types/types";
import { ILicense } from "../../../core/services/AuthService";
import { sheetDiffService, ISheetRename } from "./sheet.diff.service";
import { diffSheetContent } from "./sheet-content-diff.service";
import { applyPaywall } from "./comparison-paywall.service";

// A small, local helper is acceptable here for clarity.
function isRealFormula(formula: any): boolean {
  return typeof formula === "string" && formula.startsWith("=");
}

/**
 * The high-level "Orchestrator" for creating a diff between two adjacent snapshots.
 * Its sole responsibility is to coordinate the diffing process by calling specialized services.
 */
export function diffSnapshots(
  oldSnapshot: IWorkbookSnapshot,
  newSnapshot: IWorkbookSnapshot,
  license: ILicense,
  activeFilterIds: Set<string>
): IChangeset {
  // 1. Get high-level workbook structure changes (add/delete/rename).
  const sheetDiffResult = sheetDiffService.diffSheets(oldSnapshot, newSnapshot);

  // Isolate the rename events to pass down for formula normalization.
  const renames = sheetDiffResult.structuralChanges.filter(
    (c): c is ISheetRename => c.type === 'sheet_rename'
  );

  const deletions = sheetDiffResult.structuralChanges.filter(
    (c): c is IStructuralChange & { type: 'sheet_deletion', sheetId: SheetId } => c.type === 'sheet_deletion'
  );

  // 2. Initialize the master changeset with the structural changes.
  const result: IChangeset = {
    modifiedCells: [],
    addedRows: [],
    deletedRows: [],
    structuralChanges: sheetDiffResult.structuralChanges,
  };

  // 3. Process the content of newly ADDED sheets.
  const addedSheetChanges = sheetDiffResult.structuralChanges.filter(c => c.type === 'sheet_addition');
  for (const addedSheet of addedSheetChanges) {
    const sheetId = addedSheet.sheetId!;
    const newSheet = newSnapshot[sheetId];
    if (!newSheet || !newSheet.data) continue;

    newSheet.data.forEach((rowData, rowIndex) => {
      result.addedRows.push({ sheet: sheetId, rowIndex: rowIndex, rowData: rowData });
      rowData.cells.forEach(cell => {
        console.log(`[DEBUG] New content found in added sheet. Should be a modifiedCell:`, { sheetId, address: cell.address, value: cell.value });
        const hasContent = (cell.value !== "" && cell.value != null) || isRealFormula(cell.formula);
        if (hasContent) {
          result.modifiedCells.push({
            sheet: sheetId,
            address: cell.address,
            changeType: isRealFormula(cell.formula) ? 'both' : 'value',
            oldValue: "", newValue: cell.value,
            oldFormula: "", newFormula: cell.formula,
          });
        }
      });
    });
  }

  // 4. Perform a deep, cell-by-cell diff on sheets that existed in both versions.
  for (const sheetIdStr of sheetDiffResult.modifiedSheetIds) {
    const sheetId = sheetIdStr as SheetId;
    const oldSheet = oldSnapshot[sheetId];
    const newSheet = newSnapshot[sheetId];
    
    // Delegate the complex work to the specialized service, now with rename context.
    const sheetContentResult = diffSheetContent(sheetId, oldSheet, newSheet, activeFilterIds, renames, deletions);
    
    // Merge the granular results into the master changeset.
    result.modifiedCells.push(...sheetContentResult.modifiedCells);
    result.addedRows.push(...sheetContentResult.addedRows);
    result.deletedRows.push(...sheetContentResult.deletedRows);
    result.structuralChanges.push(...sheetContentResult.structuralChanges);
  }

  // 5. Apply business logic / paywall rules before returning.
  return applyPaywall(result, license, activeFilterIds);
}