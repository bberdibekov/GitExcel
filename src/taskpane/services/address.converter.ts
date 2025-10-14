// src/taskpane/services/address.converter.ts

/**
 * Converts a zero-based row and column index to an A1-style cell address.
 * Example: (0, 0) => "A1"
 * Example: (1, 27) => "AB2"
 */
export function toA1(row: number, col: number): string {
  let colStr = "";
  let tempCol = col;
  while (tempCol >= 0) {
    colStr = String.fromCharCode((tempCol % 26) + 65) + colStr;
    tempCol = Math.floor(tempCol / 26) - 1;
  }
  return `${colStr}${row + 1}`;
}

// NEW: This is the inverse of toA1, providing the structured data
// needed for coordinate transformation calculations.
/**
 * Converts an A1-style address string to a zero-based coordinate object.
 * Handles both "C5" and "Sheet1!C5" formats.
 * @param address The A1-style address string.
 * @returns A structured object with sheet, row, and column, or null if invalid.
 */
export function fromA1(address: string): { sheet: string | null; row: number; col: number } | null {
  const addressParts = address.split('!');
  const cellPart = addressParts.length > 1 ? addressParts[1] : addressParts[0];
  const sheet = addressParts.length > 1 ? addressParts[0] : null;

  // Regular expression to capture the column letters and row number.
  const match = cellPart.match(/([A-Z]+)(\d+)/i);
  if (!match) {
    return null; // Invalid A1 address format.
  }

  const colStr = match[1].toUpperCase();
  const row = parseInt(match[2], 10) - 1; // Convert to 0-based index.

  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col -= 1; // Adjust to be 0-based index.

  return { sheet, row, col };
}