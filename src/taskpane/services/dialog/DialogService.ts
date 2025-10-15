// src/taskpane/services/dialog/DialogService.ts

import { dialogStateService } from "./DialogStateService";
import { crossWindowMessageBus } from './CrossWindowMessageBus';
import { MessageType } from "../../types/messaging.types";

export interface IDialogOptions {
  height?: number; 
  width?: number; 
  displayInIframe?: boolean;
}

let activeDialog: Office.Dialog | null = null;

const DEFAULT_OPTIONS: IDialogOptions = {
  height: 80,
  width: 60,
  displayInIframe: false,
};

const PAYLOAD_SIZE_THRESHOLD_BYTES = 2048;

class DialogService {
  public open(view: string, initialData?: any, options?: Partial<IDialogOptions>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (activeDialog) {
        console.warn("[DialogService] A dialog is already open.");
        reject(new Error("A dialog is already open."));
        return;
      }

      const finalOptions = { ...DEFAULT_OPTIONS, ...options };
      const dialogUrl = this.constructDialogUrl(view, initialData);

      console.log(`[DialogService] Opening dialog with URL: ${dialogUrl}`);

      Office.context.ui.displayDialogAsync(dialogUrl, finalOptions, (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          console.error("[DialogService] Failed to open dialog.", asyncResult.error.message);
          reject(asyncResult.error);
          return;
        }

        console.log("[DialogService] Dialog opened successfully.");
        activeDialog = asyncResult.value;

        crossWindowMessageBus.__internal_setActiveDialog(activeDialog);

        activeDialog.addEventHandler(Office.EventType.DialogMessageReceived, this.handleDialogMessage);
        activeDialog.addEventHandler(Office.EventType.DialogEventReceived, this.handleDialogEvent);

        resolve();
      });
    });
  }

  private constructDialogUrl(view: string, initialData: any): string {
    const baseUrl = `${window.location.origin}/dialog.html?view=${encodeURIComponent(view)}`;
    if (!initialData) {
      return baseUrl;
    }

    const payloadString = JSON.stringify(initialData);

    if (payloadString.length > PAYLOAD_SIZE_THRESHOLD_BYTES) {
      const sessionId = dialogStateService.storeData(initialData);
      return `${baseUrl}&sessionId=${sessionId}`;
    } else {
      const encodedData = encodeURIComponent(payloadString);
      return `${baseUrl}&data=${encodedData}`;
    }
  }

  private handleDialogMessage(arg: { message: string; origin: any }) {
    console.log(`[DialogService] Message received from dialog: ${arg.message}`);
    crossWindowMessageBus.__internal_receive(arg.message);
  }

  private handleDialogEvent(arg: { error: number }) {
    switch (arg.error) {
      case 12006: // Dialog Closed
        console.log("[DialogService] Dialog was closed by the user.");
        this.cleanup();
        break;
      default:
        console.warn(`[DialogService] Unhandled dialog event received. Code: ${arg.error}`);
        this.cleanup();
        break;
    }
  }

  private cleanup() {
    if (activeDialog) {
      crossWindowMessageBus.__internal_setActiveDialog(null);

      // <<< MODIFIED: The Office.js Dialog object does not have a removeEventHandler method.
      // The handlers are automatically garbage-collected when the dialog is closed and
      // our reference to the object is nulled, which we do in the next step.
      
      activeDialog = null;
      console.log("[DialogService] Active dialog has been cleaned up.");
      
      crossWindowMessageBus.broadcast({ type: MessageType.DIALOG_CLOSED });
    }
  }
}

export const dialogService = new DialogService();