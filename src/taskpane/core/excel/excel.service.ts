// src/taskpane/services/excel.service.ts

import { IWorkbookSnapshot, ICellData, IRowData, IFormat } from "../../types/types";
import { generateRowHash } from "../../shared/lib/hashing.service";
import { excelFormatService } from "./excel.format.service"; 
import { toA1 } from "../../shared/lib/address.converter";
import { sheetMetadataService } from "../../features/comparison/services/sheet.metadata.service";

// --- A flag to easily disable expensive format capture ---
// Set this to 'false' to omit all "format" objects from the snapshot,
// drastically reducing log size for debugging purposes.
const CAPTURE_FORMATTING_DATA = false;


/**
 * An isolated function to handle the potentially expensive operation of
 * querying for cell formatting. Controlled by the CAPTURE_FORMATTING_DATA flag.
 */
async function _getFormattingData(range: Excel.Range): Promise<IFormat[][] | null> {
    if (!CAPTURE_FORMATTING_DATA) {
        console.log(`[excel.service] Skipping format capture because CAPTURE_FORMATTING_DATA is false.`);
        return null;
    }
    return await excelFormatService.getFormatsForRange(range);
}


export async function createWorkbookSnapshot(): Promise<IWorkbookSnapshot> {
  const workbookSnapshot: IWorkbookSnapshot = {};
  
  await Excel.run(async (context) => {
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

      const allFormats = await _getFormattingData(actualRange);

      const sheetData: IRowData[] = [];
      const rowCount = actualRange.values.length;
      const colCount = actualRange.values[0]?.length || 0;

      for (let r = 0; r < rowCount; r++) {
        const cellData: ICellData[] = [];
        for (let c = 0; c < colCount; c++) {
          
          const format = allFormats ? allFormats[r][c] : null;

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