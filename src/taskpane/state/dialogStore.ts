// src/taskpane/state/dialogStore.ts

import { create } from 'zustand';
import { dialogService } from '../core/dialog/DialogService';
import { crossWindowMessageBus } from '../core/dialog/CrossWindowMessageBus';
import { MessageType } from '../types/messaging.types';
import { loggingService } from '../core/services/LoggingService';
import { useAppStore } from './appStore';

export interface IDialogState {
  isDiffViewerOpen: boolean;
  stagedDiffViewerData: any | null;
}

export interface IDialogActions {
  openDiffViewer: (data: any) => Promise<void>;
  closeAll: () => void;
  __internal_handshakeReady: () => void;
}

const initialState: IDialogState = {
  isDiffViewerOpen: false,
  stagedDiffViewerData: null,
};

export const useDialogStore = create<IDialogState & IDialogActions>((set, get) => ({
  ...initialState,

  openDiffViewer: async (data) => {
    if (get().isDiffViewerOpen) {
      loggingService.warn("[DialogStore] An openDiffViewer() call was ignored because the dialog is already active.");
      return;
    }
    loggingService.log(`[DialogStore] Staging data for 'diff-viewer'`, data);
    set({ stagedDiffViewerData: data });

    try {
      await dialogService.openDiffViewer(); 
      set({ isDiffViewerOpen: true });
      loggingService.log(`[DialogStore] 'diff-viewer' is now open and active.`);
    } catch (error) {
      loggingService.logError(error, `[DialogStore] Failed to open 'diff-viewer'`);
      set({ ...initialState });
    }
  },

  closeAll: () => {
    loggingService.log("[DialogStore] closeAll() action called. Resetting all dialog state.");
    useAppStore.getState().clearComparison();
    set({ ...initialState });
  },

  __internal_handshakeReady: () => {
    loggingService.log("[DialogStore] Handshake ready. Notifying DialogService to send initialization data.");
    dialogService.sendInitializationData('diff-viewer');
  },
}));

// --- Permanent listener, connecting the bus to the store actions ---

loggingService.log("[DialogStore] Setting up permanent listener for DIALOG_READY_FOR_DATA.");
crossWindowMessageBus.listen(MessageType.DIALOG_READY_FOR_DATA, () => {
  loggingService.log("[DialogStore] Received DIALOG_READY_FOR_DATA. Triggering handshake.");
  useDialogStore.getState().__internal_handshakeReady();
});