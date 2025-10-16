// src/taskpane/services/dialog/CrossWindowMessageBus.ts

import { BusMessage, MessageType } from "../../types/messaging.types";
import { loggingService } from "../LoggingService";

type MessageCallback = (payload: any) => void;
type UnsubscribeFunction = () => void;

class CrossWindowMessageBus {
  private listeners: Map<MessageType, MessageCallback[]> = new Map();
  private activeDialog: Office.Dialog | null = null;
  private isDialog: boolean;

  constructor() {
    this.isDialog = !!(window.Office && Office.context && Office.context.ui.messageParent);
    loggingService.log(`[MessageBus] Initialized in ${this.isDialog ? "Dialog" : "TaskPane"} context.`);
  }

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

  public __internal_receive(rawMessage: string): void {
    loggingService.log(`[MessageBus] Raw message received for processing:`, rawMessage);
    try {
      const message = JSON.parse(rawMessage) as BusMessage;
      
      const hasListener = message && message.type && this.listeners.has(message.type);
      loggingService.log(`[MessageBus] Parsed message. Type: ${message?.type}. Has Listener? ${hasListener}`);

      if (hasListener) {
        const callbacks = this.listeners.get(message.type)!;
        const payload = (message as any).payload;
        callbacks.forEach((cb) => cb(payload));
      } else {
        loggingService.warn(`[MessageBus] No active listener for received message type: ${message?.type}`);
      }
    } catch (error) {
      loggingService.logError(error, `[MessageBus] Failed to parse or process incoming message: ${rawMessage}`);
    }
  }

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

export const crossWindowMessageBus = new CrossWindowMessageBus();