// src/taskpane/services/excel.service.ts

import { IWorkbookSnapshot, ICellData, IRowData } from "../types/types";
import { generateRowHash } from "./hashing.service";

export async function createWorkbookSnapshot(): Promise<IWorkbookSnapshot> {
  const workbookSnapshot: IWorkbookSnapshot = {};
  
  await Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");
    await context.sync();

    for (const sheet of sheets.items) {
      console.log(`[excel.service] --- Starting snapshot for sheet: ${sheet.name} ---`);

      // STEP 1: MEASURE - Find the true boundaries of the data.
      // We get the used range but DO NOT trust its starting point.
      const usedRange = sheet.getUsedRangeOrNullObject();
      usedRange.load("isNullObject");
      // Get the very last cell in the used range to determine the dimensions.
      const lastCell = usedRange.getLastCell();
      lastCell.load(["rowIndex", "columnIndex"]);
      await context.sync();

      // Handle the case where the sheet is completely empty.
      if (usedRange.isNullObject) {
        console.warn(`[excel.service] Sheet ${sheet.name} is empty. Snapshot will be empty.`);
        workbookSnapshot[sheet.name] = { address: null, data: [] };
        continue;
      }

      // Determine the full dimensions of the rectangle from A1 to the last cell.
      const rowCount = lastCell.rowIndex + 1;
      const colCount = lastCell.columnIndex + 1;

      // --- LOGGING TO CONFIRM HYPOTHESIS ---
      console.log(`[excel.service] Measured dimensions: ${rowCount} rows x ${colCount} cols`);
      // --- END LOGGING ---

      // STEP 2: CUT - Get the explicit rectangle of data using the measured boundaries.
      // This is the definitive way to ensure we get a dimensionally stable snapshot.
      const actualRange = sheet.getRangeByIndexes(0, 0, rowCount, colCount);
      actualRange.load(["address", "values", "formulas"]);
      await context.sync();

      // --- LOGGING TO CONFIRM HYPOTHESIS ---
      console.log(`[excel.service] Final stable snapshot address from A1: ${actualRange.address}`);
      // --- END LOGGING ---

      const values = actualRange.values;
      const formulas = actualRange.formulas;

      const sheetData: IRowData[] = [];
      for (let r = 0; r < rowCount; r++) {
        const cellData: ICellData[] = [];
        for (let c = 0; c < colCount; c++) {
          const cellToSave: ICellData = {
            value: values[r][c],
            formula: formulas[r][c],
          };
          cellData.push(cellToSave);
        }
        
        const rowToSave: IRowData = {
          hash: generateRowHash(cellData),
          cells: cellData,
        };
        sheetData.push(rowToSave);
      }
      
      // Log the hash of a specific, absolute row to see if it's stable
      if(sheetData.length > 2) {
        console.log(`[excel.service] Hash of absolute row 3 (index 2): ${sheetData[2].hash}`);
      }


      workbookSnapshot[sheet.name] = {
        address: actualRange.address,
        data: sheetData,
      };
    }
  });

  return workbookSnapshot;
}