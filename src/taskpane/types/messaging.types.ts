// src/taskpane/types/messaging.types.ts

import { IDiffResult, IWorkbookSnapshot, ICombinedChange } from "./types"; // Import ICombinedChange

/**
 * Defines the distinct types of messages that can be sent across the window boundary.
 */
export enum MessageType {
  // Navigation Events
  NAVIGATE_TO_CELL = "NAVIGATE_TO_CELL",

  // Excel Grid Interaction Events
  GRID_SELECTION_CHANGED = "GRID_SELECTION_CHANGED",

  // Main Comparison Dialog Lifecycle & Handshake Events
  DIALOG_READY_FOR_DATA = "DIALOG_READY_FOR_DATA",
  INITIALIZE_DATA = "INITIALIZE_DATA",
  UPDATE_DATA = "UPDATE_DATA", 

  // Main Comparison Dialog Actions
  RUN_COMPARISON_WITH_FILTERS = "RUN_COMPARISON_WITH_FILTERS",

  // --- [NEW] Detail Dialog Lifecycle & Data Transfer ---
  /**
   * Fired from the Comparison Dialog grid when a user clicks a cell,
   * requesting that the orchestrator show the detail view for that change.
   */
  SHOW_CHANGE_DETAIL = "SHOW_CHANGE_DETAIL",
  
  /**
   * Fired from the new Detail Dialog after it has loaded, signaling to the
   * orchestrator that it is ready to receive its initial data.
   */
  DETAIL_DIALOG_READY_FOR_DATA = "DETAIL_DIALOG_READY_FOR_DATA",

  /**
   * Fired from the Task Pane orchestrator to the Detail Dialog to provide
   * the first set of cell change data.
   */
  INITIALIZE_DETAIL_DATA = "INITIALIZE_DETAIL_DATA",

  /**
   * Fired from the Task Pane orchestrator to an *existing* Detail Dialog
   * to provide updated cell change data.
   */
  UPDATE_DETAIL_DATA = "UPDATE_DETAIL_DATA",
}

// --- Payload Definitions ---

export interface NavigateToCellPayload {
  sheet: string;
  address: string;
}

export interface GridSelectionChangedPayload {
  sheet: string;
  address: string;
}

export interface InitializeDataPayload {
  diffResult: IDiffResult;
  licenseTier: 'free' | 'pro';
  startSnapshot: IWorkbookSnapshot;
  endSnapshot: IWorkbookSnapshot;
}

export type UpdateDataPayload = InitializeDataPayload;

export interface RunComparisonWithFiltersPayload {
    filterIds: string[];
}

// --- [NEW] Detail Dialog Payloads ---

export interface ShowChangeDetailPayload {
  change: ICombinedChange;
}

export interface InitializeDetailDataPayload {
  change: ICombinedChange;
}

export interface UpdateDetailDataPayload {
  change: ICombinedChange;
}


// --- The Generic Message Wrapper ---

export type BusMessage =
  | {
      type: MessageType.NAVIGATE_TO_CELL;
      payload: NavigateToCellPayload;
    }
  | {
      type: MessageType.GRID_SELECTION_CHANGED;
      payload: GridSelectionChangedPayload;
    }
  | {
      type: MessageType.DIALOG_READY_FOR_DATA;
    }
  | {
      type: MessageType.INITIALIZE_DATA;
      payload: InitializeDataPayload;
    }
  | {
      type: MessageType.UPDATE_DATA;
      payload: UpdateDataPayload;
    }
  | {
      type: MessageType.RUN_COMPARISON_WITH_FILTERS;
      payload: RunComparisonWithFiltersPayload;
    }
  // --- [NEW] Detail Dialog Messages ---
  | {
      type: MessageType.SHOW_CHANGE_DETAIL;
      payload: ShowChangeDetailPayload;
  }
  | {
      type: MessageType.DETAIL_DIALOG_READY_FOR_DATA;
  }
  | {
      type: MessageType.INITIALIZE_DETAIL_DATA;
      payload: InitializeDetailDataPayload;
  }
  | {
      type: MessageType.UPDATE_DETAIL_DATA;
      payload: UpdateDetailDataPayload;
  };