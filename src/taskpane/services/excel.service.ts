// src/taskpane/services/excel.service.ts

import { IWorkbookSnapshot, ICellData, IRowData, IFormat } from "../types/types";
import { generateRowHash } from "./hashing.service";
import { excelFormatService } from "./excel.format.service"; // NEW: Import the service

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
      "numberFormat",
      "format/fill",
      "format/font",
      "format/horizontalAlignment",
      "format/verticalAlignment",
    ];


    for (const sheet of sheets.items) {
      console.log(`[excel.service] --- Starting snapshot for sheet: ${sheet.name} ---`);

      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load("isNullObject");
      const lastCell = usedRange.getLastCell();
      lastCell.load(["rowIndex", "columnIndex"]);
      await context.sync();

      if (usedRange.isNullObject) {
        console.warn(`[excel.service] Sheet ${sheet.name} is empty. Snapshot will be empty.`);
        workbookSnapshot[sheet.name] = { address: null, data: [], mergedCells: [] };
        continue;
      }

      const rowCount = lastCell.rowIndex + 1;
      const colCount = lastCell.columnIndex + 1;
      const actualRange = sheet.getRangeByIndexes(0, 0, rowCount, colCount);

      actualRange.load(cellPropertiesToLoad);

      const mergedAreas = usedRange.getMergedAreasOrNullObject(); 
      mergedAreas.load("isNullObject, address");

      await context.sync();

      const sheetData: IRowData[] = [];
      for (let r = 0; r < rowCount; r++) {
        const cellData: ICellData[] = [];
        for (let c = 0; c < colCount; c++) {

          const format = excelFormatService.extractFormatFromCell(
            actualRange.format,
            actualRange.numberFormat,
            r,
            c
          );

          const cellToSave: ICellData = {
            value: actualRange.values[r][c],
            formula: actualRange.formulas[r][c],
          };

          // If the service extracted any formats, add them to the cell object.
          if (Object.keys(format).length > 0) {
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