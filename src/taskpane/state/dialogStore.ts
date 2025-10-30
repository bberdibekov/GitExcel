// src/taskpane/state/dialogStore.ts

import { create } from 'zustand';
import { IDiffResult } from '../types/types';
import { dialogService } from '../core/dialog/DialogService';
import { crossWindowMessageBus } from '../core/dialog/CrossWindowMessageBus';
import { MessageType } from '../types/messaging.types';
import { loggingService } from '../core/services/LoggingService';

type DialogView = 'diff-viewer' | 'settings';

export interface IDialogState {
  activeDialog: DialogView | null;
  dataForDialog: any | null;
}

export interface IDialogActions {
  open: (view: DialogView, data: any) => Promise<void>;
  close: () => void;
  updateData: (data: any) => void;
  __internal_handshakeReady: () => void;
}

const initialState: IDialogState = {
  activeDialog: null,
  dataForDialog: null,
};

export const useDialogStore = create<IDialogState & IDialogActions>((set, get) => ({
  ...initialState,

  open: async (view, data) => {
    if (get().activeDialog) {
      loggingService.warn("[DialogStore] An open() call was ignored because a dialog is already active.");
      return;
    }
    loggingService.log(`[DialogStore] Staging data for dialog view: ${view}`, data);
    set({ dataForDialog: data });

    try {
      await dialogService.open(view);
      set({ activeDialog: view });
      loggingService.log(`[DialogStore] Dialog view '${view}' is now open and active.`);
    } catch (error) {
      loggingService.logError(error, `[DialogStore] Failed to open dialog view: ${view}`);
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

    loggingService.log("[DialogStore] Handshake ready. Sending INITIALIZE_DATA payload to dialog.");
    crossWindowMessageBus.broadcast({
      type: MessageType.INITIALIZE_DATA,
      payload: dataForDialog,
    });

    set({ dataForDialog: null });
  },
}));


// --- FIX: Add the permanent listener for the handshake ---
// This code runs once when the module is loaded, setting up the connection
// between the message bus and the store for the entire application lifecycle.
loggingService.log("[DialogStore] Setting up permanent listener for DIALOG_READY_FOR_DATA.");
crossWindowMessageBus.listen(MessageType.DIALOG_READY_FOR_DATA, () => {
  loggingService.log("[DialogStore] Received DIALOG_READY_FOR_DATA from a dialog window. Triggering handshake.");
  // Get the current state's internal action and call it.
  useDialogStore.getState().__internal_handshakeReady();
});