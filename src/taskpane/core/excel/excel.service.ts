// src/taskpane/services/excel.service.ts

import { IWorkbookSnapshot, ICellData, IRowData } from "../../types/types";
import { generateRowHash } from "../../shared/lib/hashing.service";
import { excelFormatService } from "./excel.format.service"; 
import { toA1 } from "../../shared/lib/address.converter"; // Ensure toA1 is imported

export async function createWorkbookSnapshot(): Promise<IWorkbookSnapshot> {
  const workbookSnapshot: IWorkbookSnapshot = {};
  
  await Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");
    await context.sync();

    const cellPropertiesToLoad = [
      "address", 
      "values", 
      "formulas", 
    ];

    for (const sheet of sheets.items) {
      console.log(`[excel.service] --- Starting snapshot for sheet: ${sheet.name} ---`);

      // MODIFIED: Load rowIndex and columnIndex to get the range's starting offset
      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load("isNullObject, address, rowIndex, columnIndex");
      await context.sync();

      if (usedRange.isNullObject) {
        console.warn(`[excel.service] Sheet ${sheet.name} is empty. Snapshot will be empty.`);
        workbookSnapshot[sheet.name] = { address: null, data: [], mergedCells: [] };
        continue;
      }
      
      console.log(`[excel.service] Sheet: ${sheet.name}, Used Range Address: ${usedRange.address}`);
      
      // NEW: Store the offsets. These are the 0-based coordinates of the top-left cell.
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
      
      workbookSnapshot[sheet.name] = {
        address: actualRange.address,
        data: sheetData,
        mergedCells: mergedAreas.isNullObject ? [] : mergedAreas.address.split(', '),
      };
    }
  });

  return workbookSnapshot;
}