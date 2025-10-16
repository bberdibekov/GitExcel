// src/taskpane/types/messaging.types.ts

import { IDiffResult } from "./types"; // Import the type for our payload

/**
 * Defines the distinct types of messages that can be sent across the window boundary.
 */
export enum MessageType {
  // Navigation Events
  NAVIGATE_TO_CELL = "NAVIGATE_TO_CELL",

  // Excel Grid Interaction Events
  GRID_SELECTION_CHANGED = "GRID_SELECTION_CHANGED",

  // Dialog Lifecycle & Handshake Events
  DIALOG_INITIALIZED = "DIALOG_INITIALIZED", // Still useful for knowing the dialog's JS has loaded
  DIALOG_CLOSED = "DIALOG_CLOSED",
  DIALOG_READY_FOR_DATA = "DIALOG_READY_FOR_DATA", // Dialog sends this to request data
  INITIALIZE_DATA = "INITIALIZE_DATA",             // Task Pane sends this with the data payload
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
  | {
      type: MessageType.DIALOG_CLOSED;
    }
  | {
      type: MessageType.DIALOG_READY_FOR_DATA;
    }
  | {
      type: MessageType.INITIALIZE_DATA;
      payload: InitializeDataPayload;
    };