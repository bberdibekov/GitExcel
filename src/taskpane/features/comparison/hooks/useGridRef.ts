// src/taskpane/features/comparison/hooks/useGridRef.ts
import { useRef } from "react";

// The API for the Grid, based on the List API and previous compiler errors.
export interface GridApi {
  readonly element: HTMLDivElement | null;
  scrollTo(config: { scrollLeft?: number; scrollTop?: number; behavior?: "auto" | "instant" | "smooth" }): void;
  scrollToCell(config: {
    align?: "auto" | "center" | "end" | "smart" | "start";
    behavior?: "auto" | "instant" | "smooth";
    columnIndex: number;
    rowIndex: number;
  }): void;
}

export function useGridRef(initialValue: GridApi | null) {
  return useRef<GridApi>(initialValue);
}