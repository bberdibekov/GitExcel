// src/taskpane/services/summary.service.ts

import {
  IDiffResult,
  IHighLevelChange,
  IRowChange,
  ISummaryResult,
} from "../types/types";

/**
Coalesces a list of individual row changes into blocks and generates human-readable
descriptions for them. For example, three contiguous added rows become "Rows 5-7 were added."
@param rows The list of added or deleted rows.
@param action A string, either "added" or "deleted", for the description.
@returns An array of high-level change objects for the summary.
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

  // Step 1: Group all row changes by their sheet name.
  for (const row of rows) {
    if (!rowsBySheet.has(row.sheet)) {
      rowsBySheet.set(row.sheet, []);
    }
    rowsBySheet.get(row.sheet)!.push(row);
  }

  // Step 2: For each sheet, find contiguous blocks of rows.
  rowsBySheet.forEach((sheetRows, sheetName) => {
    // Sort rows by index to ensure they are in order.
    sheetRows.sort((a, b) => a.rowIndex - b.rowIndex);

    let currentBlockStart = sheetRows[0].rowIndex;
    let currentBlockSize = 1;

    for (let i = 1; i < sheetRows.length; i++) {
      const prevIndex = sheetRows[i - 1].rowIndex;
      const currentIndex = sheetRows[i].rowIndex;

      if (currentIndex === prevIndex + 1) {
        // This row is part of the current block, so extend the block.
        currentBlockSize++;
      } else {
        // The block has ended. Generate its description.
        const description = currentBlockSize > 1
          ? `Rows ${currentBlockStart + 1}-${
            currentBlockStart + currentBlockSize
          } were ${action}.`
          : `Row ${currentBlockStart + 1} was ${action}.`;

        highLevelChanges.push({
          type: "structural",
          sheet: sheetName,
          description,
          involvedCells: [],
        });

        // Start a new block for the current row.
        currentBlockStart = currentIndex;
        currentBlockSize = 1;
      }
    }

    // After the loop, generate the description for the very last block.
    const description = currentBlockSize > 1
      ? `Rows ${currentBlockStart + 1}-${
        currentBlockStart + currentBlockSize
      } were ${action}.`
      : `Row ${currentBlockStart + 1} was ${action}.`;

    highLevelChanges.push({
      type: "structural",
      sheet: sheetName,
      description,
      involvedCells: [],
    });
  });

  return highLevelChanges;
}

/**

Transforms a raw, technically-correct diff result into a human-readable summary
for display in the UI. It generates high-level descriptions by analyzing the final
lists of added and deleted rows.

@param result The raw IDiffResult from the consolidator service.
@returns An ISummaryResult containing formatted high-level changes.
*/
export function generateSummary(result: IDiffResult): ISummaryResult {
  const addedDescriptions = coalesceAndDescribe(result.addedRows, "added");
  const deletedDescriptions = coalesceAndDescribe(
    result.deletedRows,
    "deleted",
  );

  const highLevelChanges = [...addedDescriptions, ...deletedDescriptions];

  return {
    highLevelChanges,
    // Pass the rest of the data through directly for the detailed view lists.
    modifiedCells: result.modifiedCells,
    addedRows: result.addedRows,
    deletedRows: result.deletedRows,
  };
}
