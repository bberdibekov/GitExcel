// src/taskpane/services/dialog/DialogService.ts

import { crossWindowMessageBus } from '../dialog/CrossWindowMessageBus';
import { MessageType } from "../../types/messaging.types";
import { loggingService } from "../../core/services/LoggingService";

/**
 * Represents the configuration options for opening a new dialog.
 */
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

/**
 * Handles the lifecycle and communication for Office.js dialogs.
 * This service is now a pure "window manager" and has no knowledge of the
 * data being transacted.
 */
class DialogService {
  /**
   * Opens a new dialog window to host a specific React view.
   *
   * @param view The identifier for the component to render (e.g., 'diff-viewer').
   * @param options Optional configuration to override the default dialog appearance.
   * @returns A promise that resolves when the dialog is successfully opened, or rejects on failure.
   */
  public open(view: string, options?: Partial<IDialogOptions>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (activeDialog) {
        loggingService.warn("[DialogService] A dialog is already open.");
        reject(new Error("A dialog is already open."));
        return;
      }

      const finalOptions = { ...DEFAULT_OPTIONS, ...options };
      const dialogUrl = `${window.location.origin}/dialog.html?view=${encodeURIComponent(view)}`;
      loggingService.log(`[DialogService] Opening dialog with URL: ${dialogUrl}`);

      Office.context.ui.displayDialogAsync(dialogUrl, finalOptions, (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          loggingService.logError(asyncResult.error, "[DialogService] Failed to open dialog");
          reject(asyncResult.error);
          return;
        }

        loggingService.log("[DialogService] Dialog opened successfully.");
        activeDialog = asyncResult.value;

        crossWindowMessageBus.__internal_setActiveDialog(activeDialog);
        activeDialog.addEventHandler(Office.EventType.DialogMessageReceived, this.handleDialogMessage);
        activeDialog.addEventHandler(Office.EventType.DialogEventReceived, this.handleDialogEvent);

        resolve();
      });
    });
  }

  private handleDialogMessage(arg: { message: string; origin: any }) {
    // This is the most critical log. It will tell us if the message from the
    // dialog's broadcast() is successfully reaching the task pane's context.
    loggingService.log(`[DialogService] Raw message received from dialog:`, arg.message);

    // forward messages to the bus.
    crossWindowMessageBus.__internal_receive(arg.message);
  }

  private handleDialogEvent = (arg: { error: number }) =>{
    loggingService.log(`[DialogService] handleDialogEvent FIRING! Event Code: ${arg.error}`);
    
    loggingService.log(`[DialogService] Inside handleDialogEvent, 'this' is:`, this);
    loggingService.log(`[DialogService] Type of 'this.cleanup' is:`, typeof this.cleanup);

    switch (arg.error) {
      case 12006:
        loggingService.log("[DialogService] Dialog was closed by the user. Attempting to call cleanup...");
        try {
          this.cleanup();
        } catch (error) {
          loggingService.logError(error, "[DialogService] CRITICAL: An error occurred while trying to call this.cleanup()");
        }
        break;
      default:
        loggingService.warn(`[DialogService] Unhandled dialog event received. Code: ${arg.error}`);
        this.cleanup();
        break;
    }
  }


  private cleanup() {
    loggingService.log(`[DialogService] cleanup() called. State of 'activeDialog' BEFORE cleanup:`, activeDialog);
    if (activeDialog) {
      crossWindowMessageBus.__internal_setActiveDialog(null);
      activeDialog = null;
      loggingService.log("[DialogService] Active dialog has been cleaned up.");
      // Broadcast a generic "closed" message. The logic for what to do with this
      // can be handled by individual hooks or components.
      crossWindowMessageBus.broadcast({ type: MessageType.DIALOG_CLOSED });
    }
    loggingService.log(`[DialogService] cleanup() finished. State of 'activeDialog' AFTER cleanup:`, activeDialog);
  }
}

// Export a singleton instance.
export const dialogService = new DialogService();