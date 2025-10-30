// src/taskpane/types/types.ts

export type SheetId = string & { readonly __brand: 'SheetId' };
export type SheetName = string;

export interface IFormulaPrecedent {
  sheetId: SheetId; // The persistent ID of the sheet the precedent is on.
  address: string;  // The A1-style address of the precedent cell(s) (e.g., "A1", "C2:D4").
}

export interface IInteractionChange extends Omit<IChange, 'sheet'> {
  sheet: SheetName;
}
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
  precedents?: IFormulaPrecedent[];
}

export interface IRowData {
  hash: string;
  cells: ICellData[];
}

export interface ISheetSnapshot {
  name: SheetName;
  position: number;
  address: string;
  data: IRowData[];
  rowHeights?: { [key: number]: number };
  columnWidths?: number[];
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
  sheet: SheetId;
  
  // Properties for row/column changes
  index?: number;
  count?: number;

  // Properties for sheet changes
  sheetId?: SheetId;
  oldName?: SheetName;
  newName?: SheetName;
  oldPosition?: number;
  newPosition?: number;
}

// Represents a single, atomic change event between two adjacent versions.
export interface IChange {
  sheet: SheetId;
  address: string;
  changeType: 'value' | 'formula' | 'both';
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
  oldFormula: string | number | boolean;
  newFormula: string | number | boolean;
  metadata?: { [key: string]: any; };
}

// Represents the consolidated, final report for a modified cell.
export interface ICombinedChange {
  sheet: SheetName;
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
  sheet: SheetId;
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
  addedRows: IReportRowChange[];
  deletedRows: IReportRowChange[];
  structuralChanges: IReportStructuralChange[];
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
  sheet: SheetName;
  description: string;
  involvedCells: IChange[];
  involvedRows?: IReportRowChange[];
}

export interface ISummaryResult {
  highLevelChanges: IHighLevelChange[];
  modifiedCells: ICombinedChange[];
}

// Represents a single, chronological row event.
export interface IRowEvent {
  type: 'add' | 'delete';
  data: IRowChange;
}

// --- The timeline now produces a simple chronological ledger.
export interface IResolvedTimeline {
  finalChangeHistory: Map<string, IChange[]>;
  chronologicalRowEvents: IRowEvent[]; // Replaces netAddedRows and netDeletedRows
  chronologicalStructuralChanges: IStructuralChange[];
}

export interface IReportRowChange extends Omit<IRowChange, 'sheet'> {
    sheet: SheetName;
}

export interface IReportStructuralChange extends Omit<IStructuralChange, 'sheet' | 'oldName' | 'newName'> {
    sheet: SheetName;
    oldName?: SheetName;
    newName?: SheetName;
}