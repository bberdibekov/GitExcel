// src/taskpane/core/dialog/DialogService.ts

// The message bus is still the primary communication channel
import { crossWindowMessageBus } from '../../core/dialog/CrossWindowMessageBus';
// Logging is essential for debugging this interaction
import { loggingService } from "../../core/services/LoggingService";
// --- MODIFIED: We now import the dedicated dialog store ---
import { useDialogStore } from '../../state/dialogStore';

/**
 * Represents the configuration options for opening a new dialog.
 */
export interface IDialogOptions {
  height?: number;
  width?: number;
  displayInIframe?: boolean;
}

// This remains a module-level variable to track the active Office.js Dialog object.
let activeDialog: Office.Dialog | null = null;

const DEFAULT_OPTIONS: IDialogOptions = {
  height: 80,
  width: 60,
  displayInIframe: false,
};

/**
 * A standalone cleanup function that is not dependent on the 'this' context of the class.
 * This makes it more robust when used as an event handler. It now has the single
 * responsibility of resetting the physical dialog state and notifying the new dialogStore.
 */
function cleanupDialog() {
  loggingService.log(`[DialogService] cleanupDialog() called. State of 'activeDialog' BEFORE cleanup:`, activeDialog);
  if (activeDialog) {
    // Clear the message bus's reference to the dialog object.
    crossWindowMessageBus.__internal_setActiveDialog(null);
    // Clear our own module-level reference.
    activeDialog = null;
    loggingService.log("[DialogService] Physical dialog object has been cleaned up.");
    
    // --- CRITICAL CHANGE: Notify the dedicated dialogStore that the dialog has closed. ---
    // This updates the global application state from the single source of truth.
    useDialogStore.getState().close(); 
  }
  loggingService.log(`[DialogService] cleanupDialog() finished. State of 'activeDialog' AFTER cleanup:`, activeDialog);
}


/**
 * Handles the lifecycle and communication for Office.js dialogs.
 * This service acts as a "window manager" and an adapter between the Office.js API
 * and our application's state management (via the dialogStore). It has no knowledge
 * of the specific data being transacted.
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
          // Ensure state is clean if the open fails.
          cleanupDialog();
          reject(asyncResult.error);
          return;
        }

        loggingService.log("[DialogService] Dialog opened successfully. Registering handlers.");
        activeDialog = asyncResult.value;

        // Register the dialog with the message bus so the task pane can send messages to it.
        crossWindowMessageBus.__internal_setActiveDialog(activeDialog);
        
        // Register platform event handlers for messages and lifecycle events.
        activeDialog.addEventHandler(Office.EventType.DialogMessageReceived, this.handleDialogMessage);
        activeDialog.addEventHandler(Office.EventType.DialogEventReceived, this.handleDialogEvent);

        resolve();
      });
    });
  }

  /**
   * This handler is called by the Office.js platform when a message arrives from the dialog.
   * It forwards the raw message to our cross-window message bus for processing.
   */
  private handleDialogMessage(arg: { message: string; origin: any }) {
    loggingService.log(`[DialogService] Raw message received from dialog:`, arg.message);
    // Forward the message to the bus for listeners to process.
    crossWindowMessageBus.__internal_receive(arg.message);
  }

  /**
   * This handler is called by the Office.js platform for lifecycle events, most importantly
   * when the user closes the dialog window via the 'X' button.
   */
  private handleDialogEvent = (arg: { error: number }) => {
    loggingService.log(`[DialogService] handleDialogEvent FIRING! Event Code: ${arg.error}`);
    
    switch (arg.error) {
      case 12006: // This is the official code for "Dialog closed by user".
        loggingService.log("[DialogService] Dialog was closed by the user. Calling cleanup...");
        cleanupDialog();
        break;
      default:
        loggingService.warn(`[DialogService] Unhandled dialog event received. Code: ${arg.error}. Forcing cleanup.`);
        cleanupDialog();
        break;
    }
  }
}

// Export a singleton instance for use throughout the application.
export const dialogService = new DialogService();