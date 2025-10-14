// src/taskpane/types/types.ts

export interface ICellData {
  value: string | number | boolean;
  formula: string | number | boolean;
}

export interface IRowData {
  hash: string;
  cells: ICellData[];
}

export interface ISheetSnapshot {
  address: string;
  data: IRowData[];
}

export interface IWorkbookSnapshot {
  [sheetName: string]: ISheetSnapshot;
}

// NEW: A strict set of recognized structural change types.
// This gives us type safety and prevents magic strings.
export type StructuralChangeType =
  | "row_insertion"
  | "row_deletion"
  | "column_insertion"
  | "column_deletion"
  | "sheet_rename"
  | "sheet_addition"
  | "sheet_deletion";

// NEW: An interface to describe a single, high-level structural change.
// This is the data packet that the CoordinateTransformationService will use.
export interface IStructuralChange {
  type: StructuralChangeType;
  sheet: string;
  // For row/col changes, 'index' is the starting position.
  index?: number;
  // For row/col changes, 'count' is how many were inserted/deleted. Defaults to 1.
  count?: number;
  // For sheet renames, this holds the new name.
  newName?: string;
}

export interface IChange {
  sheet: string;
  address: string;
  changeType: 'value' | 'formula' | 'both';
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
  oldFormula: string | number | boolean;
  newFormula: string | number | boolean;
}

export interface IRowChange {
  sheet: string;
  rowIndex: number;
  rowData: IRowData;
  containedChanges?: IChange[];
}

export interface IDiffResult {
  modifiedCells: IChange[];
  addedRows: IRowChange[];
  deletedRows: IRowChange[];
  // UPDATED: The result of a diff now formally includes a list of structural changes.
  // This makes our diffs much more intelligent.
  structuralChanges: IStructuralChange[];
}

export interface IVersion {
  id: number;
  timestamp: string;
  comment: string;
  snapshot: IWorkbookSnapshot;
  // UPDATED: This is the core of the new architecture.
  // The 'changeset' property stores the diff from the PREVIOUS version.
  // It's optional because the very first version has no preceding changeset.
  changeset?: IDiffResult;
}


// These types are related to the summary/UI, and can remain for now.

export interface IHighLevelChange {
  type: 'structural' | 'column_insertion' | 'column_deletion'; 
  sheet: string;
  description: string;
  involvedCells: IChange[];
}

export interface ISummaryResult {
  highLevelChanges: IHighLevelChange[];
  modifiedCells: IChange[];
  addedRows: IRowChange[];
  deletedRows: IRowChange[];
}

// This is the intermediate data structure produced by the Timeline Resolver
// and consumed by the Report Consolidator. It represents a clean, fully-mapped
// history of all events between two versions.
export interface IResolvedTimeline {
  // Maps a cell's FINAL address to its full history of changes.
  finalChangeHistory: Map<string, IChange[]>;
  // A map of rows that were deleted and never re-added.
  // Crucially, this can include rows that were added AND deleted within the timeline,
  // but only if they contained cell modifications before being deleted.
  netDeletedRows: Map<string, IRowChange>;
  // A map of rows that were added and were never deleted.
  netAddedRows: Map<string, IRowChange>;
  // The complete, ordered list of all structural transformations that occurred.
  chronologicalStructuralChanges: IStructuralChange[];
}