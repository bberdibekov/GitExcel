// src/taskpane/core/dialog/DialogService.ts

import { crossWindowMessageBus } from '../dialog/CrossWindowMessageBus';
import { loggingService } from "../../core/services/LoggingService";
import { useDialogStore } from '../../state/dialogStore';

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
 * This version is corrected to use the proper API and type-safe event handlers.
 */
class DialogService {
  public open(view: string, options?: Partial<IDialogOptions>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (activeDialog) {
        loggingService.warn("[DialogService] An 'open' call was ignored because a dialog is already active.");
        reject(new Error("A dialog is already open."));
        return;
      }

      const finalOptions = { ...DEFAULT_OPTIONS, ...options };
      const dialogUrl = `${window.location.origin}/dialog.html?view=${encodeURIComponent(view)}`;
      loggingService.log(`[DialogService] Opening dialog with URL: ${dialogUrl}`);

      Office.context.ui.displayDialogAsync(dialogUrl, finalOptions, (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          loggingService.logError(asyncResult.error, "[DialogService] Failed to open dialog");
          useDialogStore.getState().close(); // Ensure state is clean on failure
          reject(asyncResult.error);
          return;
        }

        loggingService.log("[DialogService] Dialog opened successfully. Registering handlers.");
        activeDialog = asyncResult.value;

        crossWindowMessageBus.__internal_setActiveDialog(activeDialog);

        // --- CORRECTED HANDLER REGISTRATION ---

        // 1. Handler for receiving messages from the dialog.
        // This now correctly handles the UNION type provided by the Office.js API.
        activeDialog.addEventHandler(
          Office.EventType.DialogMessageReceived,
          (arg: { message: string; origin: string } | { error: number }) => {
            // We use a type guard to check which kind of object we received.
            if ("message" in arg) {
              loggingService.log(`[DialogService] Raw message received from dialog:`, arg.message);
              crossWindowMessageBus.__internal_receive(arg.message);
            } else {
              // It's an error object.
              loggingService.logError(new Error(`DialogMessageReceived reported an error.`), `Error code: ${arg.error}`);
            }
          }
        );
        
        // 2. Handler for lifecycle events (like the user closing the window).
        // This handler's signature was correct as it only receives the error object shape.
        activeDialog.addEventHandler(
          Office.EventType.DialogEventReceived,
          (arg: { error: number }) => {
            loggingService.log(`[DialogService] DialogEventReceived FIRING! Event Code: ${arg.error}`);
            
            // The cleanup logic is now directly inside the correctly-typed handler.
            if (activeDialog) {
                crossWindowMessageBus.__internal_setActiveDialog(null);
                activeDialog = null;
                loggingService.log("[DialogService] Physical dialog object has been cleaned up.");
                
                // Notify the global store to reset the application state.
                useDialogStore.getState().close(); 
            }
          }
        );

        resolve();
      });
    });
  }
}

// Export a singleton instance.
export const dialogService = new DialogService();