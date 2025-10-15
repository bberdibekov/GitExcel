// src/taskpane/types/messaging.types.ts

/**
 * Defines the distinct types of messages that can be sent across the window boundary.
 * Using a string enum provides clear, readable identifiers for message types.
 */
export enum MessageType {
  // Navigation Events
  NAVIGATE_TO_CELL = "NAVIGATE_TO_CELL",

  // Excel Grid Interaction Events
  GRID_SELECTION_CHANGED = "GRID_SELECTION_CHANGED",

  // Dialog Lifecycle Events
  DIALOG_INITIALIZED = "DIALOG_INITIALIZED",
  DIALOG_CLOSED = "DIALOG_CLOSED",
}

// --- Payload Definitions ---
// For each message type, we define a corresponding payload interface.
// This ensures that every message carries the correct data.

export interface NavigateToCellPayload {
  sheet: string;
  address: string;
}

export interface GridSelectionChangedPayload {
  sheet: string;
  address: string;
  // We can include more context if needed, like the cell value.
}

// --- The Generic Message Wrapper ---
// This is a discriminated union. The `type` property acts as the discriminant,
// allowing TypeScript to infer the specific payload type.

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
      // This message might not need a payload
    }
  | {
      type: MessageType.DIALOG_CLOSED;
      // This message is broadcast by the DialogService when it detects a close event
    };