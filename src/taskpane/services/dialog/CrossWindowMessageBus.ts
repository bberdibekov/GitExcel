// src/taskpane/services/dialog/CrossWindowMessageBus.ts

import { BusMessage, MessageType } from "../../types/messaging.types";
// <<< NEW: Import the logging service.
import { loggingService } from "../LoggingService";

type MessageCallback = (payload: any) => void;
type UnsubscribeFunction = () => void;

/**
 * A type-safe, isomorphic pub/sub event bus that works across the Office.js
 * dialog's iframe boundary. It allows the task pane and dialog to communicate
 * without holding direct references to each other, promoting a decoupled architecture.
 */
class CrossWindowMessageBus {
  private listeners: Map<MessageType, MessageCallback[]> = new Map();
  private activeDialog: Office.Dialog | null = null;
  private isDialog: boolean;

  constructor() {
    this.isDialog = !!(window.Office && Office.context && Office.context.ui.messageParent);
    // <<< MODIFIED: Use the logging service.
    loggingService.log(`[MessageBus] Initialized in ${this.isDialog ? "Dialog" : "TaskPane"} context.`);
  }

  /**
   * Registers a callback to be executed when a message of a specific type is received.
   */
  public listen(type: MessageType, callback: MessageCallback): UnsubscribeFunction {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
    loggingService.log(`[MessageBus] Listener added for type: ${type}`);

    return () => {
      const allListeners = this.listeners.get(type);
      if (allListeners) {
        const index = allListeners.indexOf(callback);
        if (index > -1) {
          allListeners.splice(index, 1);
          loggingService.log(`[MessageBus] Listener removed for type: ${type}`);
        }
      }
    };
  }

  /**
   * Broadcasts a message to the other window (task pane -> dialog, or dialog -> task pane).
   */
  public broadcast(message: BusMessage): void {
    const serializedMessage = JSON.stringify(message);
    loggingService.log(`[MessageBus] Broadcasting:`, message);

    if (this.isDialog) {
      Office.context.ui.messageParent(serializedMessage);
    } else {
      if (!this.activeDialog) {
        loggingService.logError(new Error("No active dialog to broadcast to."), "[MessageBus] Cannot broadcast");
        return;
      }
      this.activeDialog.messageChild(serializedMessage);
    }
  }

  /**
   * This method is called by the message-receiving logic to process an incoming message.
   */
  public __internal_receive(rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage) as BusMessage;
      if (message && message.type && this.listeners.has(message.type)) {
        loggingService.log(`[MessageBus] Processing received message of type: ${message.type}`, message);
        const callbacks = this.listeners.get(message.type)!;
        const payload = (message as any).payload;
        callbacks.forEach((cb) => cb(payload));
      } else {
        loggingService.warn(`[MessageBus] Received message with unknown or unhandled type: ${message?.type}`);
      }
    } catch (error) {
      loggingService.logError(error, `[MessageBus] Failed to parse or process incoming message: ${rawMessage}`);
    }
  }

  /**
   * [Task Pane Context Only]
   * Called by the DialogService to provide a reference to the active dialog.
   */
  public __internal_setActiveDialog(dialog: Office.Dialog | null): void {
    if (this.isDialog) {
      loggingService.warn("[MessageBus] setActiveDialog should only be called from the task pane context.");
      return;
    }
    this.activeDialog = dialog;
    const status = dialog ? "set" : "cleared";
    loggingService.log(`[MessageBus] Active dialog reference has been ${status}.`);
  }
}

// Export a singleton instance for the entire application to use.
export const crossWindowMessageBus = new CrossWindowMessageBus();