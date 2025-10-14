// src/taskpane/types/types.ts

// --- NEW (FEAT-004) ---
/** Represents the formatting of a single cell. */
export interface IFormat {
  font?: {
    bold?: boolean;
    color?: string;
    name?: string;
    size?: number;
  };
  fill?: {
    color?: string;
  };
  borders?: {
    /* TBD: Border implementation is complex */
  };
  alignment?: {
    horizontal?: 'General' | 'Left' | 'Center' | 'Right' | 'Fill' | 'Justify' | 'CenterAcrossSelection' | 'Distributed';
    vertical?: 'Top' | 'Center' | 'Bottom' | 'Justify' | 'Distributed';
  };
  numberFormat?: string;
}
// --- END NEW ---


export interface ICellData {
  value: string | number | boolean;
  formula: string | number | boolean;
  format?: IFormat; // MODIFIED (FEAT-004)
}

export interface IRowData {
  hash: string;
  cells: ICellData[];
}

export interface ISheetSnapshot {
  address: string;
  data: IRowData[];
  // --- NEW (FEAT-004) ---
  rowHeights?: { [key: number]: number };
  columnWidths?: { [key: number]: number };
  mergedCells?: string[];
  // --- END NEW ---
}

export interface IWorkbookSnapshot {
  [sheetName: string]: ISheetSnapshot;
}

export type StructuralChangeType =
  | "row_insertion"
  | "row_deletion"
  | "column_insertion"
  | "column_deletion"
  | "sheet_rename"
  | "sheet_addition"
  | "sheet_deletion";

export interface IStructuralChange {
  type: StructuralChangeType;
  sheet: string;
  index?: number;
  count?: number;
  newName?: string;
}

// Represents a single, atomic change event between two adjacent versions.
export interface IChange {
  sheet: string;
  address: string;
  changeType: 'value' | 'formula' | 'both';
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
  oldFormula: string | number | boolean;
  newFormula: string | number | boolean;
}

// Represents the consolidated, final report for a modified cell.
export interface ICombinedChange {
  sheet: string;
  address: string;
  startValue: string | number | boolean;
  endValue: string | number | boolean;
  startFormula: string | number | boolean;
  endFormula: string | number | boolean;
  changeType: 'value' | 'formula' | 'both';
  history: IChange[];
}

export interface IRowChange {
  sheet: string;
  rowIndex: number;
  rowData: IRowData;
  containedChanges?: IChange[];
}

// This type represents the raw output of a diff between two ADJACENT versions.
export interface IChangeset {
  modifiedCells: IChange[];
  addedRows: IRowChange[];
  deletedRows: IRowChange[];
  structuralChanges: IStructuralChange[];
  isPartialResult?: boolean;
  hiddenChangeCount?: number;
}

// This type represents the FINAL, user-facing result from the synthesizer.
export interface IDiffResult {
  modifiedCells: ICombinedChange[];
  addedRows: IRowChange[];
  deletedRows: IRowChange[];
  structuralChanges: IStructuralChange[];
  isPartialResult?: boolean;
  hiddenChangeCount?: number;
}


export interface IVersion {
  id: number;
  timestamp: string;
  comment: string;
  snapshot: IWorkbookSnapshot;
  changeset?: IChangeset;
}

export interface IHighLevelChange {
  type: 'structural' | 'column_insertion' | 'column_deletion';
  sheet: string;
  description: string;
  involvedCells: IChange[];
}

export interface ISummaryResult {
  highLevelChanges: IHighLevelChange[];
  modifiedCells: ICombinedChange[];
  addedRows: IRowChange[];
  deletedRows: IRowChange[];
}

export interface IResolvedTimeline {
  finalChangeHistory: Map<string, IChange[]>;
  netDeletedRows: Map<string, IRowChange>;
  netAddedRows: Map<string, IRowChange>;
  chronologicalStructuralChanges: IStructuralChange[];
}