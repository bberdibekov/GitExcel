// src/taskpane/services/summary.service.ts

import {
  IDiffResult,
  IHighLevelChange,
  IRowChange,
  ISummaryResult,
} from "../types/types";
import { fromA1 } from "./address.converter";

/**
Coalesces a list of individual row changes into blocks and generates human-readable
descriptions for them.
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

    let currentBlockStart = sheetRows[0].rowIndex;
    let currentBlockSize = 1;

    for (let i = 1; i < sheetRows.length; i++) {
      const prevIndex = sheetRows[i - 1].rowIndex;
      const currentIndex = sheetRows[i].rowIndex;

      if (currentIndex === prevIndex + 1) {
        currentBlockSize++;
      } else {
        const description = currentBlockSize > 1
          ? `Rows ${currentBlockStart + 1}-${currentBlockStart + currentBlockSize} were ${action}.`
          : `Row ${currentBlockStart + 1} was ${action}.`;

        highLevelChanges.push({ type: "structural", sheet: sheetName, description, involvedCells: [] });
        currentBlockStart = currentIndex;
        currentBlockSize = 1;
      }
    }

    const description = currentBlockSize > 1
      ? `Rows ${currentBlockStart + 1}-${currentBlockStart + currentBlockSize} were ${action}.`
      : `Row ${currentBlockStart + 1} was ${action}.`;

    highLevelChanges.push({ type: "structural", sheet: sheetName, description, involvedCells: [] });
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

  return {
    highLevelChanges,
    modifiedCells: result.modifiedCells,
    addedRows: trueAddedRows,
    deletedRows: result.deletedRows,
  };
}