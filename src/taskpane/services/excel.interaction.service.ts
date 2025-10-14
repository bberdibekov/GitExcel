// src/taskpane/services/excel.interaction.service.ts

import { IChange } from "../types/types";

const HIGHLIGHT_COLOR = "#FFC7CE"; // A bleak red

let selectionChangedHandler: any = null;


/**
 * Navigates the user's selection to a specific cell in the workbook.
 * @param sheetName The name of the worksheet to activate.
 * @param address The A1-style address of the cell to select.
 */
export async function navigateToCell(sheetName: string, address: string) {
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const range = sheet.getRange(address);
    // This command activates the sheet and selects the specified range.
    range.select();
    await context.sync();
  });
}


/**
 * Applies both highlights and comments to the changed cells.
 */
export async function showChangesOnSheet(changes: IChange[]) {
  await Excel.run(async (context) => {
    const changesBySheet = groupChangesBySheet(changes);
    for (const sheetName in changesBySheet) {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      for (const change of changesBySheet[sheetName]) {
        const range = sheet.getRange(change.address);
        range.format.fill.color = HIGHLIGHT_COLOR;
        const commentText = formatComment(change);
        sheet.comments.add(change.address, commentText);
      }
    }
    await context.sync();
  });
}

/**
 * Clears both highlights and comments from the changed cells.
 */
export async function clearChangesFromSheet(changes: IChange[]) {
  await Excel.run(async (context) => {
    const changesBySheet = groupChangesBySheet(changes);
    for (const sheetName in changesBySheet) {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      for (const change of changesBySheet[sheetName]) {
        try {
          const range = sheet.getRange(change.address);
          range.clear(Excel.ClearApplyTo.formats);
          sheet.comments.getItemByCell(change.address).delete();
        } catch (error) {
          console.warn(`Could not clear cell ${change.sheet}!${change.address}.`, error);
        }
      }
    }
    await context.sync();
  });
}

/**
 * Sets up a listener that fires when the user selects a new cell.
 */
export async function setupSelectionListener(
  changes: IChange[],
  onSelectionCallback: (change: IChange | null) => void
) {
  await Excel.run(async (context) => {
    // If a handler already exists, remove it before adding a new one.
    if (selectionChangedHandler) {
      context.workbook.onSelectionChanged.remove(selectionChangedHandler);
    }

    // Define the handler function.
    const eventHandler = async () => {
      await Excel.run(async (ctx) => {
        const selectedRange = ctx.workbook.getSelectedRange();
        selectedRange.load("address");
        const sheet = ctx.workbook.worksheets.getActiveWorksheet();
        sheet.load("name");
        await ctx.sync();

        const fullAddress = `${sheet.name}!${selectedRange.address}`;
        const foundChange = changes.find(c => `${c.sheet}!${c.address}` === fullAddress);
        onSelectionCallback(foundChange || null);
      });
    };

    // Add the handler.
    context.workbook.onSelectionChanged.add(eventHandler);
    // Store the function itself for later removal.
    selectionChangedHandler = eventHandler;
    
    await context.sync();
  });
}

/**
 * Removes the selection event listener.
 */
export async function removeSelectionListener() {
  await Excel.run(async (context) => {
    if (selectionChangedHandler) {
      // Pass the stored function directly to the remove method.
      context.workbook.onSelectionChanged.remove(selectionChangedHandler);
      selectionChangedHandler = null; // Clear our variable
      await context.sync();
    }
  });
}

// --- HELPER FUNCTIONS ---

function formatComment(change: IChange): string {
  let text = "--- Change Details ---\n\n";
  if (change.changeType === 'value' || change.changeType === 'both') {
    text += `Old Value:\n${change.oldValue}\n\n`;
    text += `New Value:\n${change.newValue}\n\n`;
  }
  if (change.changeType === 'formula' || change.changeType === 'both') {
    text += `Old Formula:\n${change.oldFormula}\n\n`;
    text += `New Formula:\n${change.newFormula}`;
  }
  return text.trim();
}

function groupChangesBySheet(changes: IChange[]): Record<string, IChange[]> {
  return changes.reduce((acc, change) => {
    if (!acc[change.sheet]) { acc[change.sheet] = []; }
    acc[change.sheet].push(change);
    return acc;
  }, {} as Record<string, IChange[]>);
}