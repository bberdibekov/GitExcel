// src/taskpane/services/excel.format.service.ts

import { IFormat } from "../../types/types";

class ExcelFormatService {

  public async getFormatsForRange(range: Excel.Range): Promise<IFormat[][]> {
    return this._getFormatsViaHybridScan(range);
  }

  private async _getFormatsViaHybridScan(range: Excel.Range): Promise<IFormat[][]> {
    const context = range.context;

    // --- Phase 1: High-Level Summary Load ---
    // Load 'tintAndShade' as our signal for "No Fill" vs "White Fill"
    range.format.fill.load("color, tintAndShade");
    range.format.font.load("bold, color, name, size");
    range.format.load("horizontalAlignment, verticalAlignment");
    range.load("numberFormat, rowCount, columnCount");

    await context.sync(); // SYNC #1

    // --- Phase 2: Analyze Summary & Prepare for Detailed Load (if needed) ---
    const rowCount = range.rowCount;
    const colCount = range.columnCount;
    
    const formatPropertiesToLoad: string[] = [];
    const rangePropertiesToLoad: string[] = [];

    // We now check tintAndShade for fill uniformity.
    if (range.format.fill.tintAndShade === null) {
        formatPropertiesToLoad.push("fill/color", "fill/tintAndShade");
    }
    if (range.format.font.bold === null) formatPropertiesToLoad.push("font/bold");
    if (range.format.font.color === null) formatPropertiesToLoad.push("font/color");
    if (range.format.font.name === null) formatPropertiesToLoad.push("font/name");
    if (range.format.font.size === null) formatPropertiesToLoad.push("font/size");
    if (range.format.horizontalAlignment === null) formatPropertiesToLoad.push("horizontalAlignment");
    if (range.format.verticalAlignment === null) formatPropertiesToLoad.push("verticalAlignment");
    if (range.numberFormat[0][0] === null) rangePropertiesToLoad.push("numberFormat");

    let perCellFormats: Excel.Range[][] | null = null;

    // --- Phase 3: Detailed Per-Cell Load (only if necessary) ---
    if (formatPropertiesToLoad.length > 0 || rangePropertiesToLoad.length > 0) {
      const cellProxies: Excel.Range[][] = [];
      for (let r = 0; r < rowCount; r++) {
        const rowProxies: Excel.Range[] = [];
        for (let c = 0; c < colCount; c++) {
          const cell = range.getCell(r, c);
          if (formatPropertiesToLoad.length > 0) cell.format.load(formatPropertiesToLoad);
          if (rangePropertiesToLoad.length > 0) cell.load(rangePropertiesToLoad);
          rowProxies.push(cell);
        }
        cellProxies.push(rowProxies);
      }
      
      await context.sync(); // SYNC #2 (only happens if needed)
      perCellFormats = cellProxies;
    }
    
    // --- Phase 4: Merge Summary and Detailed Data into Final IFormat Array ---
    const finalFormats: IFormat[][] = [];
    for (let r = 0; r < rowCount; r++) {
      const rowFormats: IFormat[] = [];
      for (let c = 0; c < colCount; c++) {
        // --- START: ENHANCED DIAGNOSTIC LOG ---
        if (perCellFormats) {
            // console.log(`--- DIAGNOSTIC LOG (Fill Analysis) Cell(${r},${c}) ---`);
            // console.log(`Summary Fill Color:`, range.format.fill.color);
            // console.log(`Summary TintAndShade:`, range.format.fill.tintAndShade);
            const cellProxy = perCellFormats[r][c];
            // console.log(`Detailed Fill Color:`, cellProxy.format.fill.color);
            // console.log(`Detailed TintAndShade:`, cellProxy.format.fill.tintAndShade);
            // console.log(`----------------------------------------------------`);
        }
        // --- END: ENHANCED DIAGNOSTIC LOG ---

        const format: IFormat = {};
        
        // Start with summary values
        const summaryFont = range.format.font;
        if (summaryFont.bold !== undefined || summaryFont.color || summaryFont.name || summaryFont.size) {
            format.font = { bold: summaryFont.bold, color: summaryFont.color, name: summaryFont.name, size: summaryFont.size };
        }
        const summaryAlign = range.format;
        if (summaryAlign.horizontalAlignment || summaryAlign.verticalAlignment) {
            format.alignment = { horizontal: summaryAlign.horizontalAlignment, vertical: summaryAlign.verticalAlignment };
        }
        if (range.numberFormat[r][c]) {
            format.numberFormat = range.numberFormat[r][c];
        }

        // Use tintAndShade as the gatekeeper for fill color from summary
        if (range.format.fill.tintAndShade !== null) {
            format.fill = { color: range.format.fill.color };
        }
        
        // Merge detailed per-cell data if it was loaded
        if (perCellFormats) {
          const cellProxy = perCellFormats[r][c];
          const cellFormat = cellProxy.format;

          if (formatPropertiesToLoad.includes("fill/tintAndShade")) {
              if (cellFormat.fill.tintAndShade !== null) {
                  if (!format.fill) format.fill = {};
                  format.fill.color = cellFormat.fill.color;
              } else {
                  delete format.fill; // Ensure no fill is saved if detailed view confirms "No Fill"
              }
          }
          if (formatPropertiesToLoad.includes("font/bold")) {
            if (!format.font) format.font = {};
            format.font.bold = cellFormat.font.bold;
          }
          if (formatPropertiesToLoad.includes("font/color")) {
            if (!format.font) format.font = {};
            format.font.color = cellFormat.font.color;
          }
          if (formatPropertiesToLoad.includes("font/name")) {
            if (!format.font) format.font = {};
            format.font.name = cellFormat.font.name;
          }
          if (formatPropertiesToLoad.includes("font/size")) {
            if (!format.font) format.font = {};
            format.font.size = cellFormat.font.size;
          }
          if (formatPropertiesToLoad.includes("horizontalAlignment")) {
            if (!format.alignment) format.alignment = {};
            format.alignment.horizontal = cellFormat.horizontalAlignment;
          }
          if (formatPropertiesToLoad.includes("verticalAlignment")) {
            if (!format.alignment) format.alignment = {};
            format.alignment.vertical = cellFormat.verticalAlignment;
          }
          if (rangePropertiesToLoad.includes("numberFormat")) {
              format.numberFormat = cellProxy.numberFormat[0][0];
          }
        }
        rowFormats.push(format);
      }
      finalFormats.push(rowFormats);
    }

    return finalFormats;
  }

  public applyFormatToRange(range: Excel.Range, format: IFormat) {
    if (format.font) {
      if (format.font.bold !== undefined) range.format.font.bold = format.font.bold;
      if (format.font.color) range.format.font.color = format.font.color;
      if (format.font.name) range.format.font.name = format.font.name;
      if (format.font.size) range.format.font.size = format.font.size;
    }
    if (format.fill && format.fill.color) {
      range.format.fill.color = format.fill.color;
    }
    if (format.alignment) {
      if (format.alignment.horizontal) range.format.horizontalAlignment = format.alignment.horizontal;
      if (format.alignment.vertical) range.format.verticalAlignment = format.alignment.vertical;
    }
    if (format.numberFormat) {
      range.numberFormat = [[format.numberFormat]];
    }
  }
}

export const excelFormatService = new ExcelFormatService();