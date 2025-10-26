// src/taskpane/state/dialogStore.ts

import { create } from 'zustand';
import { IDiffResult } from '../types/types';
import { dialogService } from '../core/dialog/DialogService';
import { crossWindowMessageBus } from '../core/dialog/CrossWindowMessageBus';
import { MessageType } from '../types/messaging.types';
import { loggingService } from '../core/services/LoggingService';

type DialogView = 'diff-viewer' | 'settings'; // Scalable for future dialogs

/**
 * Interface defining the shape of our dialog state.
 */
export interface IDialogState {
  activeDialog: DialogView | null;
  dataForDialog: any | null; // A temporary staging area for the initial payload
}

/**
 * Interface defining all actions that can modify the dialog state.
 */
export interface IDialogActions {
  /**
   * Opens a new dialog and stages the data for the handshake.
   */
  open: (view: DialogView, data: any) => Promise<void>;
  /**
   * Called by the DialogService when the window is physically closed. Resets the state.
   */
  close: () => void;
  /**
   * Pushes a new data payload to an already-open dialog.
   */
  updateData: (data: any) => void;
  /**
   * An internal action that completes the handshake, sending the staged data.
   */
  __internal_handshakeReady: () => void;
}

const initialState: IDialogState = {
  activeDialog: null,
  dataForDialog: null,
};

export const useDialogStore = create<IDialogState & IDialogActions>((set, get) => ({
  ...initialState,

  open: async (view, data) => {
    // Prevent opening a dialog if one is already active.
    if (get().activeDialog) {
      loggingService.warn("[DialogStore] An open() call was ignored because a dialog is already active.");
      return;
    }

    loggingService.log(`[DialogStore] Staging data for dialog view: ${view}`, data);
    set({ dataForDialog: data });

    try {
      await dialogService.open(view);
      // Once the window is open, we can update our state.
      set({ activeDialog: view });
      loggingService.log(`[DialogStore] Dialog view '${view}' is now open and active.`);
    } catch (error) {
      loggingService.logError(error, `[DialogStore] Failed to open dialog view: ${view}`);
      // If opening fails, clean up the state.
      set({ ...initialState });
    }
  },

  close: () => {
    loggingService.log("[DialogStore] close() action called. Resetting state.");
    set({ ...initialState });
  },

  updateData: (data) => {
    if (!get().activeDialog) {
      loggingService.warn("[DialogStore] updateData() called, but no dialog is active.");
      return;
    }
    loggingService.log("[DialogStore] Pushing updated data to active dialog.", data);
    crossWindowMessageBus.broadcast({
      type: MessageType.UPDATE_DATA,
      payload: data,
    });
  },

  __internal_handshakeReady: () => {
    const { dataForDialog } = get();
    if (!dataForDialog) {
      loggingService.warn("[DialogStore] Handshake ready, but no data was staged.");
      return;
    }

    loggingService.log("[DialogStore] Handshake ready. Sending INITIALIZE_DATA payload.");
    crossWindowMessageBus.broadcast({
      type: MessageType.INITIALIZE_DATA,
      payload: dataForDialog,
    });

    // Clear the staged data after sending it.
    set({ dataForDialog: null });
  },
}));