// src/taskpane/services/hashing.service.ts

import { ICellData } from "../../types/types";

/**
 * The single, canonical hashing function for generating a row's content hash.
 * Both the snapshot creation service and the diffing service MUST use this
 * function to ensure that hashes are always consistent.
 */
export function generateRowHash(rowData: ICellData[]): string {
  const rowContent = rowData.map(cell => `${cell.value}|${cell.formula}`).join('||');
  let hash = 0;
  for (let i = 0; i < rowContent.length; i++) {
    const char = rowContent.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return String(hash);
}