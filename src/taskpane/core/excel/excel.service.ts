// src/taskpane/services/excel.service.ts

import { IWorkbookSnapshot, ICellData, IRowData } from "../../types/types";
import { generateRowHash } from "../../shared/lib/hashing.service";
import { excelFormatService } from "./excel.format.service"; 
import { toA1 } from "../../shared/lib/address.converter";
import { sheetMetadataService } from "../../features/comparison/services/sheet.metadata.service";

export async function createWorkbookSnapshot(): Promise<IWorkbookSnapshot> {
  const workbookSnapshot: IWorkbookSnapshot = {};
  
  await Excel.run(async (context) => {
    // --- This is now the authoritative call for sheet identity ---
    const sheetMap = await sheetMetadataService.reconcileAndGetSheetMap(context);
    const allSheetIds = Object.keys(sheetMap);

    const cellPropertiesToLoad = [
      "address", 
      "values", 
      "formulas", 
    ];

    for (const sheetId of allSheetIds) {
      const sheetName = sheetMap[sheetId];
      const sheet = context.workbook.worksheets.getItem(sheetName);
      
      // --- Load sheet position ---
      sheet.load("position");

      console.log(`[excel.service] --- Starting snapshot for sheet: ${sheetName} (ID: ${sheetId}) ---`);

      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load("isNullObject, address, rowIndex, columnIndex");
      await context.sync();

      if (usedRange.isNullObject) {
        console.warn(`[excel.service] Sheet ${sheetName} is empty. Snapshot will be empty.`);
        workbookSnapshot[sheetId] = { name: sheetName, position: sheet.position, address: null, data: [], mergedCells: [] };
        continue;
      }
      
      console.log(`[excel.service] Sheet: ${sheetName}, Used Range Address: ${usedRange.address}`);
      
      const startRow = usedRange.rowIndex;
      const startCol = usedRange.columnIndex;

      const actualRange = sheet.getRange(usedRange.address);
      actualRange.load(cellPropertiesToLoad);
      
      const mergedAreas = usedRange.getMergedAreasOrNullObject(); 
      mergedAreas.load("isNullObject, address");

      await context.sync();

      const allFormats = await excelFormatService.getFormatsForRange(actualRange);

      const sheetData: IRowData[] = [];
      const rowCount = actualRange.values.length;
      const colCount = actualRange.values[0]?.length || 0;

      for (let r = 0; r < rowCount; r++) {
        const cellData: ICellData[] = [];
        for (let c = 0; c < colCount; c++) {
          
          const format = allFormats[r][c];

          const cellToSave: ICellData = {
            address: toA1(startRow + r, startCol + c), 
            value: actualRange.values[r][c],
            formula: actualRange.formulas[r][c],
          };

          if (format && Object.keys(format).length > 0) {
            cellToSave.format = format;
          }

          cellData.push(cellToSave);
        }
        
        const rowToSave: IRowData = {
          hash: generateRowHash(cellData),
          cells: cellData,
        };
        sheetData.push(rowToSave);
      }
      
      workbookSnapshot[sheetId] = {
        name: sheetName,
        position: sheet.position,
        address: actualRange.address,
        data: sheetData,
        mergedCells: mergedAreas.isNullObject ? [] : mergedAreas.address.split(', '),
      };
    }
  });

  return workbookSnapshot;
}