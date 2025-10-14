// src/taskpane/services/excel.writer.service.ts

import { ISheetSnapshot, IWorkbookSnapshot } from '../types/types';
import { debugService } from './debug.service';
import { excelFormatService } from './excel.format.service'; // NEW: Import the service

/**
 * Defines the granular options for a restore operation.
 */
export interface IRestoreOptions {
  restoreCellFormats: boolean;
  restoreMergedCells: boolean;
}

/**
 * A dedicated service for writing snapshot data back into an Excel workbook.
 */
class ExcelWriterService {

  private _sanitizeArrayForWriting(data: any[][]): any[][] {
    return data.map(row => row.map(cell => (cell === undefined ? null : cell)));
  }

  private _coerceToStringForWriting(data: any[][]): (string | null)[][] {
    return data.map(row => 
      row.map(cell => {
        if (cell === null || typeof cell === 'string') { return cell; }
        return String(cell);
      })
    );
  }
  
  private _generateValidSheetName(baseName: string, versionComment: string): string {
    const sanitizedComment = versionComment.replace(/[\\/*?:[\]]/g, '');
    const prefix = `${baseName} (${sanitizedComment})`;
    if (prefix.length > 31) {
      return prefix.substring(0, 31);
    }
    return prefix;
  }

  public async restoreWorkbookFromSnapshot(workbookSnapshot: IWorkbookSnapshot, versionPrefix: string, options: IRestoreOptions) {
    console.log(`[WriterService] Starting restore for version: "${versionPrefix}"`);
    console.time('Total Restore Time');

    for (const sheetName in workbookSnapshot) {
      const sheetSnapshot = workbookSnapshot[sheetName];
      debugService.capture(`Snapshot for ${sheetName}`, sheetSnapshot);
      await this._restoreSheet(sheetSnapshot, sheetName, versionPrefix, options);
    }

    console.timeEnd('Total Restore Time');
    console.log('[WriterService] Restore operation complete.');
  }

  private async _restoreSheet(snapshot: ISheetSnapshot, originalSheetName: string, versionComment: string, options: IRestoreOptions) {
    const newSheetName = this._generateValidSheetName(originalSheetName, versionComment);
    
    await Excel.run(async (context) => {
      console.log(`[WriterService] Phase 1: Creating new sheet: "${newSheetName}"`);
      const newSheet = context.workbook.worksheets.add(newSheetName);
      await context.sync();
      console.log(`[WriterService] Phase 1: SUCCESS. Sheet "${newSheetName}" created.`);

      if (!snapshot.data || snapshot.data.length === 0) {
        console.log(`[WriterService] Snapshot data for sheet is empty.`);
        return;
      }

      try {
        console.log("[WriterService] Phase 2: Queuing all data and formatting operations...");
        
        this._writeBulkData(newSheet, snapshot);

        if (options.restoreCellFormats) {
          this._applyCellFormatting_Iterative(newSheet, snapshot);
        }

        if (options.restoreMergedCells) {
            this._applyMerges(newSheet, snapshot, newSheetName);
        }

        await context.sync();
        console.log("[WriterService] Phase 2: SUCCESS. All operations applied.");

      } catch (e) {
        console.error("[WriterService] FAILURE during Phase 2.", e);
        debugService.addLogEntry("FAILURE: Data Writing Phase", { error: e.message, stack: e.stack });
        throw e;
      }
    });
  }

  private _writeBulkData(sheet: Excel.Worksheet, snapshot: ISheetSnapshot) {
    const rowCount = snapshot.data.length;
    const colCount = snapshot.data[0]?.cells?.length || 0;
    if (colCount === 0) { return; }

    const formulas = snapshot.data.map(row => (row.cells || []).map(cell => cell.formula));
    const sanitizedFormulas = this._sanitizeArrayForWriting(formulas);
    const coercedFormulas = this._coerceToStringForWriting(sanitizedFormulas);
    
    const dataRange = sheet.getRangeByIndexes(0, 0, rowCount, colCount);
    dataRange.formulas = coercedFormulas;
  }

  private _applyCellFormatting_Iterative(sheet: Excel.Worksheet, snapshot: ISheetSnapshot) {
    const rowCount = snapshot.data.length;
    if (rowCount === 0) return;
    const colCount = snapshot.data[0]?.cells?.length || 0;

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const cellData = snapshot.data[r]?.cells?.[c];
        if (cellData && cellData.format) {
          const range = sheet.getRangeByIndexes(r, c, 1, 1);
          excelFormatService.applyFormatToRange(range, cellData.format);
        }
      }
    }
  }

  private _applyMerges(sheet: Excel.Worksheet, snapshot: ISheetSnapshot, sheetName: string) {
    if (snapshot.mergedCells && snapshot.mergedCells.length > 0) {
      debugService.capture(`Merges for ${sheetName}`, snapshot.mergedCells);
      snapshot.mergedCells.forEach(address => {
          sheet.getRange(address).merge(false);
      });
    }
  }
}

export const excelWriterService = new ExcelWriterService();