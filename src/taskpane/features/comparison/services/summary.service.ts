// src/taskpane/services/summary.service.ts

import {
  IDiffResult,
  IHighLevelChange,
  IRowChange,
  ISummaryResult,
} from "../../../types/types";
import { fromA1 } from "../../../shared/lib/address.converter";

/**
Coalesces a list of individual row changes into blocks and generates human-readable
descriptions for them, now including the row data itself.
*/
function coalesceAndDescribe(
  rows: IRowChange[],
  action: "added" | "deleted",
): IHighLevelChange[] {
  if (rows.length === 0) {
    return [];
  }

  const highLevelChanges: IHighLevelChange[] = [];
  const rowsBySheet = new Map<string, IRowChange[]>();

  for (const row of rows) {
    if (!rowsBySheet.has(row.sheet)) {
      rowsBySheet.set(row.sheet, []);
    }
    rowsBySheet.get(row.sheet)!.push(row);
  }

  rowsBySheet.forEach((sheetRows, sheetName) => {
    sheetRows.sort((a, b) => a.rowIndex - b.rowIndex);

    let blockStartIndex = 0; // --- MODIFIED: Use index to track start of a block
    for (let i = 1; i <= sheetRows.length; i++) {
      // --- MODIFIED: Loop condition and logic to correctly handle the end of the array
      if (i === sheetRows.length || sheetRows[i].rowIndex !== sheetRows[i - 1].rowIndex + 1) {
        
        const currentBlockRows = sheetRows.slice(blockStartIndex, i);
        const currentBlockSize = currentBlockRows.length;
        const startRow = currentBlockRows[0].rowIndex;

        const description = currentBlockSize > 1
          ? `Rows ${startRow + 1}-${startRow + currentBlockSize} were ${action}.`
          : `Row ${startRow + 1} was ${action}.`;

        // --- MODIFIED: Attach the actual row data for this block
        highLevelChanges.push({ 
            type: "structural", 
            sheet: sheetName, 
            description, 
            involvedCells: [],
            involvedRows: currentBlockRows 
        });

        blockStartIndex = i; // Start the next block
      }
    }
  });

  return highLevelChanges;
}


/**
Transforms a raw, technically-correct diff result into a human-readable summary
for display in the UI.
*/
export function generateSummary(result: IDiffResult): ISummaryResult {
  const creationRowKeys = new Set<string>();
  for (const cell of result.modifiedCells) {
    const isCreation = cell.startValue === "" && cell.startFormula === "";
    if (isCreation) {
      const coords = fromA1(`${cell.sheet}!${cell.address}`);
      if (coords) {
        creationRowKeys.add(`${cell.sheet}!${coords.row}`);
      }
    }
  }

  const trueAddedRows = result.addedRows.filter(row => {
    const rowKey = `${row.sheet}!${row.rowIndex}`;
    return !creationRowKeys.has(rowKey);
  });

  const addedDescriptions = coalesceAndDescribe(trueAddedRows, "added");
  const deletedDescriptions = coalesceAndDescribe(result.deletedRows, "deleted");
  const highLevelChanges = [...addedDescriptions, ...deletedDescriptions];

  // --- MODIFIED: Return the clean, authoritative result without raw row data.
  return {
    highLevelChanges,
    modifiedCells: result.modifiedCells,
  };
}