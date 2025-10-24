// src/taskpane/types/types.ts

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


export interface ICellData {
  address: string;
  value: string | number | boolean;
  formula: string | number | boolean;
  format?: IFormat;
}

export interface IRowData {
  hash: string;
  cells: ICellData[];
}

export interface ISheetSnapshot {
  name: string;
  position: number;
  address: string;
  data: IRowData[];
  rowHeights?: { [key: number]: number };
  columnWidths?: { [key: number]: number };
  mergedCells?: string[];
}

export interface IWorkbookSnapshot {
  [persistentId: string]: ISheetSnapshot;
}

export type StructuralChangeType =
  | "row_insertion"
  | "row_deletion"
  | "column_insertion"
  | "column_deletion"
  | "sheet_rename"
  | "sheet_addition"
  | "sheet_deletion"
  | "sheet_reorder";

export interface IStructuralChange {
  type: StructuralChangeType;
  sheet: string;
  
  // Properties for row/column changes
  index?: number;
  count?: number;

  // Properties for sheet changes
  sheetId?: string;
  oldName?: string;
  newName?: string;
  oldPosition?: number;
  newPosition?: number;
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
  metadata: {
    [key: string]: any;
  };
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

export interface IVersionViewModel extends IVersion {
    /** Is the user allowed to initiate a restore for this specific version? */
  isRestorable: boolean;
  /** The tooltip to display for the restore button, contextual to the user's permissions. */
  restoreTooltip: string;
  /** Should a "PRO" badge be shown next to the disabled restore button? */
  showProBadge: boolean;
}

export interface IHighLevelChange {
  type: 'structural' | 'column_insertion' | 'column_deletion';
  sheet: string;
  description: string;
  involvedCells: IChange[];
  involvedRows?: IRowChange[];
}

export interface ISummaryResult {
  highLevelChanges: IHighLevelChange[];
  modifiedCells: ICombinedChange[];
}

// +++ NEW (REFACTOR): Represents a single, chronological row event.
export interface IRowEvent {
  type: 'add' | 'delete';
  data: IRowChange;
}

// --- MODIFIED (REFACTOR): The timeline now produces a simple chronological ledger.
export interface IResolvedTimeline {
  finalChangeHistory: Map<string, IChange[]>;
  chronologicalRowEvents: IRowEvent[]; // Replaces netAddedRows and netDeletedRows
  chronologicalStructuralChanges: IStructuralChange[];
}