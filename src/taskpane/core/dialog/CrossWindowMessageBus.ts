// src/taskpane/core/dialog/CrossWindowMessageBus.ts

import { BusMessage, MessageType } from "../../types/messaging.types";
import { loggingService } from "../services/LoggingService";

type MessageCallback = (payload: any) => void;
type UnsubscribeFunction = () => void;

/**
 * A stateless pub/sub event bus for communication between the task pane and any dialog window.
 * The task pane is responsible for holding the `Office.Dialog` object and passing it as a target.
 */
class CrossWindowMessageBus {
  private listeners: Map<MessageType, MessageCallback[]> = new Map();
  private isDialog: boolean;

  constructor() {
    this.isDialog = !!(window.Office && Office.context && Office.context.ui.messageParent);
  }

  public listen(type: MessageType, callback: MessageCallback): UnsubscribeFunction {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);

    return () => {
      const allListeners = this.listeners.get(type);
      if (allListeners) {
        const index = allListeners.indexOf(callback);
        if (index > -1) {
          allListeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Broadcasts a message FROM a dialog TO the task pane.
   */
  public messageParent(message: BusMessage): void {
    if (!this.isDialog) {
        loggingService.warn("[MessageBus] messageParent called from task pane context. This is not allowed.");
        return;
    }
    const serializedMessage = JSON.stringify(message);
    loggingService.log(`[MessageBus] Sending to parent:`, message);
    Office.context.ui.messageParent(serializedMessage);
  }

  /**
   * Broadcasts a message FROM the task pane TO a specific dialog.
   * @param targetDialog The Office.Dialog object to send the message to.
   * @param message The message to send.
   */
  public messageChild(targetDialog: Office.Dialog, message: BusMessage): void {
    if (this.isDialog) {
        loggingService.warn("[MessageBus] messageChild called from dialog context. This is not allowed.");
        return;
    }
    const serializedMessage = JSON.stringify(message);
    loggingService.log(`[MessageBus] Sending to child dialog:`, message);
    targetDialog.messageChild(serializedMessage);
  }

  public __internal_receive(rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage) as BusMessage;
      
      const hasListener = message && message.type && this.listeners.has(message.type);

      if (hasListener) {
        const callbacks = this.listeners.get(message.type)!;
        const payload = (message as any).payload;
        callbacks.forEach((cb) => cb(payload));
      } else {
      }
    } catch (error) {
    }
  }
}

export const crossWindowMessageBus = new CrossWindowMessageBus();