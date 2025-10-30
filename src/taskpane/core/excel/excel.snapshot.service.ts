// src/taskpane/core/excel/excel.snapshot.service.ts

import { IWorkbookSnapshot, ISheetSnapshot, ICellData, IFormulaPrecedent, SheetId, IRowData } from "../../types/types";
import { sheetMetadataService } from "../../features/comparison/services/sheet.metadata.service";
import { generateRowHash } from "../../shared/lib/hashing.service";
import { toA1 } from "../../shared/lib/address.converter";
import { loggingService } from "../services/LoggingService";

// A small helper to identify formulas, consistent with other services.
function isRealFormula(formula: any): boolean {
  return typeof formula === "string" && formula.startsWith("=");
}

class ExcelSnapshotService {
  /**
   * Creates a high-fidelity JSON snapshot of the entire workbook.
   * This is the "read" operation.
   * @param context The current Excel.RequestContext.
   * @returns A promise that resolves to the IWorkbookSnapshot.
   */
  public async createWorkbookSnapshot(context: Excel.RequestContext): Promise<IWorkbookSnapshot> {
    const workbookSnapshot: IWorkbookSnapshot = {};
    
    const sheetIdToNameMap = await sheetMetadataService.reconcileAndGetSheetMap(context);

    const nameToSheetIdMap = new Map<string, SheetId>();
    for (const id in sheetIdToNameMap) {
      if (Object.prototype.hasOwnProperty.call(sheetIdToNameMap, id)) {
        const name = sheetIdToNameMap[id];
        nameToSheetIdMap.set(name, id as SheetId);
      }
    }

    const sheets = context.workbook.worksheets;
    sheets.load("items/name,position");
    await context.sync();

    for (const sheet of sheets.items) {
      const sheetId = nameToSheetIdMap.get(sheet.name);
      if (!sheetId) {
        console.warn(`[SnapshotService] Sheet "${sheet.name}" was found but has no persistent ID. Skipping.`);
        continue;
      }
      
      const usedRange = sheet.getUsedRangeOrNullObject();
      const mergedAreas = usedRange.getMergedAreasOrNullObject();
      
      // --- START: CORRECT AND FINAL FIX ---
      // Load the top-level properties of the range first, including columnCount.
      usedRange.load("isNullObject, address, rowIndex, columnIndex, values, formulas, columnCount");
      mergedAreas.load("isNullObject, address");
      
      await context.sync();

      if (usedRange.isNullObject) {
        workbookSnapshot[sheetId] = { name: sheet.name, position: sheet.position, address: "", data: [], mergedCells: [], columnWidths: [] };
        continue;
      }

      // Now that we have the column count, we can iterate to get each column's width.
      // This requires a second batch call and sync, which is a necessary performance trade-off
      // due to the structure of the Excel JS API.
      const columnRanges = [];
      for (let i = 0; i < usedRange.columnCount; i++) {
        const column = usedRange.getColumn(i);
        column.load("format/columnWidth");
        columnRanges.push(column);
      }
      await context.sync();

      const columnWidths: number[] = columnRanges.map(col => col.format.columnWidth);
      // --- END: CORRECT AND FINAL FIX ---
      
      const formulas = usedRange.formulas as (string | number | boolean)[][];

      let precedentsMap = new Map<string, IFormulaPrecedent[]>();
      try {
        precedentsMap = await this.getPrecedentsForSheet(context, sheet, formulas, usedRange.rowIndex, usedRange.columnIndex, nameToSheetIdMap);
      } catch (error) {
        loggingService.logError(error, `[SnapshotService] Failed to get precedents for sheet "${sheet.name}". Continuing without them.`);
      }
      
      const sheetSnapshot: ISheetSnapshot = {
        name: sheet.name,
        position: sheet.position,
        address: usedRange.address,
        data: this.buildRowData(
            usedRange.values, 
            formulas,
            precedentsMap,
            usedRange.rowIndex,
            usedRange.columnIndex
        ),
        mergedCells: mergedAreas.isNullObject ? [] : mergedAreas.address.split(', '),
        columnWidths: columnWidths,
      };
      
      workbookSnapshot[sheetId] = sheetSnapshot;
    }
    
    return workbookSnapshot;
  }

  /**
   * Builds the final IRowData[] structure by combining values, formulas, and the precedents map.
   */
  private buildRowData(
    values: (string | number | boolean)[][],
    formulas: (string | number | boolean)[][],
    precedentsMap: Map<string, IFormulaPrecedent[]>,
    startRow: number,
    startCol: number
  ): IRowData[] {
    return values.map((row, r) => {
      const cellData: ICellData[] = row.map((value, c) => {
        const address = toA1(startRow + r, startCol + c);
        const cell: ICellData = {
          address: address,
          value: value,
          formula: formulas[r][c],
        };
        
        if (precedentsMap.has(address)) {
          cell.precedents = precedentsMap.get(address);
        }
        
        return cell;
      });
      return {
        hash: generateRowHash(cellData),
        cells: cellData,
      };
    });
  }

  /**
   * Iterates through cells with formulas and queries for their precedents in a single batch.
   * @returns A Map where the key is a cell's A1 address and the value is its parsed precedents.
   */
  private async getPrecedentsForSheet(
    context: Excel.RequestContext,
    sheet: Excel.Worksheet,
    formulas: (string | number | boolean)[][],
    startRow: number,
    startCol: number,
    nameToSheetIdMap: Map<string, SheetId>
  ): Promise<Map<string, IFormulaPrecedent[]>> {
    const precedentRequests: { address: string; request: Excel.WorkbookRangeAreas }[] = [];
    
    for (let r = 0; r < formulas.length; r++) {
      for (let c = 0; c < formulas[r].length; c++) {
        const formula = formulas[r][c];
        if (isRealFormula(formula) && !String(formula).includes("#REF!")) {
          const address = toA1(startRow + r, startCol + c);
          const range = sheet.getRange(address);
          const precedents = range.getPrecedents();
          precedents.load("areas/items/areas/items/address");
          precedentRequests.push({ address: address, request: precedents });
        }
      }
    }

    if (precedentRequests.length > 0) {
      await context.sync();
    }
    
    const resultMap = new Map<string, IFormulaPrecedent[]>();
    for (const req of precedentRequests) {
      const parsedPrecedents = this.parsePrecedents(req.request.areas.items, sheet.name, nameToSheetIdMap);
      resultMap.set(req.address, parsedPrecedents);
    }

    return resultMap;
  }

  /**
   * Parses the raw Excel.RangeAreas[] object from the API into our simplified IFormulaPrecedent[] array.
   */
  private parsePrecedents(
    rangeAreasItems: Excel.RangeAreas[],
    currentSheetName: string,
    nameToSheetIdMap: Map<string, SheetId>
  ): IFormulaPrecedent[] {
    const precedents: IFormulaPrecedent[] = [];

    for (const rangeArea of rangeAreasItems) {
      for (const range of rangeArea.areas.items) {
        const addressParts = range.address.split('!');
        const address = addressParts.pop()!;
        const sheetName = addressParts.pop() || currentSheetName; 
        
        const precedentSheetId = nameToSheetIdMap.get(sheetName);
        
        if (precedentSheetId) {
            precedents.push({
              sheetId: precedentSheetId,
              address: address,
            });
        }
      }
    }
    return precedents;
  }
}

export const excelSnapshotService = new ExcelSnapshotService();