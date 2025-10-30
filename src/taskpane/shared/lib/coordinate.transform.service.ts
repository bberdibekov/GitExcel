// src/taskpane/services/coordinate.transform.service.ts

import { IStructuralChange } from "../../types/types";
import { fromA1, toA1 } from "./address.converter";

// A simple internal coordinate object for easier calculations.
interface ICoordinates {
  sheet: string;
  row: number;
  col: number;
}

/**
 * Transforms a single cell address based on an ordered series of structural changes.
 * This is the core logic engine for the changeset synthesizer.
 * @param initialAddress The original A1-style address (e.g., "Sheet1!C5").
 * @param changes An ordered array of structural changes to apply.
 * @returns The new A1-style address, or null if the cell was part of a deleted row/column/sheet.
 */
export function transformAddress(initialAddress: string, changes: IStructuralChange[]): string | null {
  const initialCoords = fromA1(initialAddress);

  // If the address is invalid or doesn't have a sheet, we cannot transform it reliably.
  if (!initialCoords || !initialCoords.sheet) {
    return initialAddress;
  }

  let currentCoords: ICoordinates = {
    sheet: initialCoords.sheet,
    row: initialCoords.row,
    col: initialCoords.col,
  };

  for (const change of changes) {
    // Only apply changes that are relevant to the cell's current sheet.
    if (change.sheet !== currentCoords.sheet) {
      continue;
    }

    switch (change.type) {
      case "row_insertion":
        // If a row is inserted at or before the cell's current position, shift the cell down.
        if (change.index! <= currentCoords.row) {
          currentCoords.row += change.count || 1;
        }
        break;

      case "row_deletion":
        {
          const delStartIndex = change.index!;
          const delCount = change.count || 1;
          const delEndIndex = delStartIndex + delCount;

          // Case 1: The cell is *inside* the deleted range. It's gone.
          if (currentCoords.row >= delStartIndex && currentCoords.row < delEndIndex) {
            return null;
          }

          // Case 2: The deletion happened *before* the cell. Shift the cell up.
          if (delStartIndex < currentCoords.row) {
            currentCoords.row -= delCount;
          }
        }
        break;
      
      // --- START: ADDED COLUMN LOGIC ---
      case "column_insertion":
        // If a column is inserted at or before the cell's current position, shift the cell right.
        if (change.index! <= currentCoords.col) {
          currentCoords.col += change.count || 1;
        }
        break;

      case "column_deletion":
        {
          const delStartIndex = change.index!;
          const delCount = change.count || 1;
          const delEndIndex = delStartIndex + delCount;
          
          // Case 1: The cell is *inside* the deleted range. It's gone.
          if (currentCoords.col >= delStartIndex && currentCoords.col < delEndIndex) {
            return null;
          }

          // Case 2: The deletion happened *before* the cell. Shift the cell left.
          if (delStartIndex < currentCoords.col) {
            currentCoords.col -= delCount;
          }
        }
        break;
      // --- END: ADDED COLUMN LOGIC ---
      
      // NOTE: Sheet logic would follow a similar pattern if needed.
      // case "sheet_rename": ...
    }
  }

  // Convert the final coordinates back into an A1 string.
  return `${currentCoords.sheet}!${toA1(currentCoords.row, currentCoords.col)}`;
}