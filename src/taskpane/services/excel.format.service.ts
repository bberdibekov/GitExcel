// src/taskpane/services/excel.format.service.ts

import { IFormat } from "../types/types";

/**
 * A dedicated service for safely extracting and applying cell formatting.
 * This centralizes the logic for translating between the Office.js RangeFormat
 * object and our internal IFormat data model.
 */
class ExcelFormatService {
  /**
   * Safely extracts the IFormat data for a single cell from a larger RangeFormat object.
   * @param rangeFormat The RangeFormat object loaded from a range.
   * @param numberFormat A 2D array of number formats for the range.
   * @param r The zero-based row index of the cell within the range.
   * @param c The zero-based column index of the cell within the range.
   * @returns An IFormat object. It will be empty if no specific formats are found.
   */
  public extractFormatFromCell(
    rangeFormat: Excel.RangeFormat,
    numberFormat: string[][],
    r: number,
    c: number
  ): IFormat {
    const format: IFormat = {};

    // --- Number Format ---
    // This check is simple as it's a direct 2D array.
    if (numberFormat && numberFormat[r] && typeof numberFormat[r][c] !== 'undefined') {
      format.numberFormat = numberFormat[r][c];
    }

    // --- Fill Color ---
    // This is a robust check: ensure parent, the 2D array, the row, and the value exist.
    if (rangeFormat.fill && rangeFormat.fill.color && rangeFormat.fill.color[r] && rangeFormat.fill.color[r][c]) {
      format.fill = { color: rangeFormat.fill.color[r][c] };
    }

    // --- Font ---
    const font: IFormat["font"] = {};
    if (rangeFormat.font) {
      if (rangeFormat.font.bold && rangeFormat.font.bold[r] && typeof rangeFormat.font.bold[r][c] !== 'undefined') {
        font.bold = rangeFormat.font.bold[r][c];
      }
      if (rangeFormat.font.color && rangeFormat.font.color[r] && rangeFormat.font.color[r][c]) {
        font.color = rangeFormat.font.color[r][c];
      }
      if (rangeFormat.font.name && rangeFormat.font.name[r] && rangeFormat.font.name[r][c]) {
        font.name = rangeFormat.font.name[r][c];
      }
      if (rangeFormat.font.size && rangeFormat.font.size[r] && rangeFormat.font.size[r][c]) {
        font.size = rangeFormat.font.size[r][c];
      }
    }
    if (Object.keys(font).length > 0) {
      format.font = font;
    }

    // --- Alignment ---
    const alignment: IFormat["alignment"] = {};
    // Note: Alignment properties are directly on rangeFormat, not a nested object.
    if (rangeFormat.horizontalAlignment && rangeFormat.horizontalAlignment[r] && rangeFormat.horizontalAlignment[r][c]) {
      alignment.horizontal = rangeFormat.horizontalAlignment[r][c] as IFormat['alignment']['horizontal'];
    }
    if (rangeFormat.verticalAlignment && rangeFormat.verticalAlignment[r] && rangeFormat.verticalAlignment[r][c]) {
      alignment.vertical = rangeFormat.verticalAlignment[r][c] as IFormat['alignment']['vertical'];
    }
    if (Object.keys(alignment).length > 0) {
      format.alignment = alignment;
    }

    return format;
  }

  /**
   * Applies a given IFormat object to a single-cell Excel Range.
   * @param range The single-cell Excel.Range object to format.
   * @param format The IFormat object from our snapshot.
   */
  public applyFormatToRange(range: Excel.Range, format: IFormat) {
    if (format.font) {
      if (format.font.bold !== undefined) range.format.font.bold = format.font.bold;
      if (format.font.color) range.format.font.color = format.font.color;
      // Add other font properties here if needed (name, size, etc.)
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