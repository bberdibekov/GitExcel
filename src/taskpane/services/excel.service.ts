// src/taskpane/services/excel.service.ts

import { IWorkbookSnapshot, ICellData, IRowData } from "../types/types";
import { generateRowHash } from "./hashing.service";
import { excelFormatService } from "./excel.format.service"; 

export async function createWorkbookSnapshot(): Promise<IWorkbookSnapshot> {
  const workbookSnapshot: IWorkbookSnapshot = {};
  
  await Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");
    await context.sync();

    // --- The properties to load are now simplified. We only need data properties.
    // All format properties are now handled by the excelFormatService.
    const cellPropertiesToLoad = [
      "address", 
      "values", 
      "formulas", 
    ];

    for (const sheet of sheets.items) {
      console.log(`[excel.service] --- Starting snapshot for sheet: ${sheet.name} ---`);

      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load("isNullObject, address");
      await context.sync(); // Sync to check if the range is null AND get its address

      if (usedRange.isNullObject) {
        console.warn(`[excel.service] Sheet ${sheet.name} is empty. Snapshot will be empty.`);
        workbookSnapshot[sheet.name] = { address: null, data: [], mergedCells: [] };
        continue;
      }

      // This call is now safe because usedRange.address has been loaded.
      const actualRange = sheet.getRange(usedRange.address);
      actualRange.load(cellPropertiesToLoad);
      
      const mergedAreas = usedRange.getMergedAreasOrNullObject(); 
      mergedAreas.load("isNullObject, address");

      await context.sync(); // Sync to load cell data and merge info

      // --- Delegate all format reading to the format service ---
      // This single call performs the entire hybrid scan (1 or 2 syncs)
      // and returns a complete, reliable 2D array of format data.
      const allFormats = await excelFormatService.getFormatsForRange(actualRange);

      const sheetData: IRowData[] = [];
      const rowCount = actualRange.values.length;
      const colCount = actualRange.values[0]?.length || 0;

      for (let r = 0; r < rowCount; r++) {
        const cellData: ICellData[] = [];
        for (let c = 0; c < colCount; c++) {
          
          // The complex logic is gone. We just get the pre-fetched format.
          const format = allFormats[r][c];

          const cellToSave: ICellData = {
            value: actualRange.values[r][c],
            formula: actualRange.formulas[r][c],
          };

          // Only attach the format object if it contains data.
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