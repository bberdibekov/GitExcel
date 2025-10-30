// src/taskpane/types/messaging.types.ts

import { IDiffResult, IWorkbookSnapshot } from "./types"; // Import IWorkbookSnapshot

/**
 * Defines the distinct types of messages that can be sent across the window boundary.
 */
export enum MessageType {
  // Navigation Events
  NAVIGATE_TO_CELL = "NAVIGATE_TO_CELL",

  // Excel Grid Interaction Events
  GRID_SELECTION_CHANGED = "GRID_SELECTION_CHANGED",

  // Dialog Lifecycle & Handshake Events
  DIALOG_INITIALIZED = "DIALOG_INITIALIZED",
  // DIALOG_CLOSED = "DIALOG_CLOSED", // --- REMOVED ---
  DIALOG_READY_FOR_DATA = "DIALOG_READY_FOR_DATA",
  INITIALIZE_DATA = "INITIALIZE_DATA",
  UPDATE_DATA = "UPDATE_DATA", 

  RUN_COMPARISON_WITH_FILTERS = "RUN_COMPARISON_WITH_FILTERS",
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
  // --- ADDED: Pass the full snapshots for the grid view ---
  startSnapshot: IWorkbookSnapshot;
  endSnapshot: IWorkbookSnapshot;
}

export type UpdateDataPayload = InitializeDataPayload;

export interface RunComparisonWithFiltersPayload {
    filterIds: string[];
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
      type: MessageType.DIALOG_INITIALIZED;
    }
  // --- REMOVED { type: MessageType.DIALOG_CLOSED } ---
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
    };