// src/taskpane/state/dialogStore.ts

import { create } from 'zustand';
import { ICombinedChange, IDiffResult } from '../types/types';
import { dialogService } from '../core/dialog/DialogService';
import { crossWindowMessageBus } from '../core/dialog/CrossWindowMessageBus';
import { MessageType } from '../types/messaging.types';
import { loggingService } from '../core/services/LoggingService';
import { useAppStore } from './appStore';

type DialogView = 'diff-viewer' | 'detail-dialog';

export interface IDialogState {
  openViews: {
    'diff-viewer': boolean;
    'detail-dialog': boolean;
  };
  stagedDiffViewerData: any | null;
  stagedDetailData: ICombinedChange | null;
}

export interface IDialogActions {
  openDiffViewer: (data: any) => Promise<void>;
  closeAll: () => void;
  __internal_diffViewerHandshakeReady: () => void;
  __internal_detailDialogHandshakeReady: () => void;
}

const initialState: IDialogState = {
  openViews: {
    'diff-viewer': false,
    'detail-dialog': false,
  },
  stagedDiffViewerData: null,
  stagedDetailData: null,
};

export const useDialogStore = create<IDialogState & IDialogActions>((set, get) => ({
  ...initialState,

  openDiffViewer: async (data) => {
    if (get().openViews['diff-viewer']) {
      loggingService.warn("[DialogStore] An openDiffViewer() call was ignored because the dialog is already active.");
      return;
    }
    loggingService.log(`[DialogStore] Staging data for 'diff-viewer'`, data);
    set({ stagedDiffViewerData: data });

    try {
      await dialogService.openDiffViewer(); 
      set((state) => ({ openViews: { ...state.openViews, 'diff-viewer': true } }));
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

  __internal_diffViewerHandshakeReady: () => {
    loggingService.log("[DialogStore] Handshake ready. Notifying DialogService to send diff viewer data.");
    dialogService.sendInitializationData('diff-viewer');
  },

  __internal_detailDialogHandshakeReady: () => {
    loggingService.log("[DialogStore] Handshake ready. Notifying DialogService to send detail dialog data.");
    dialogService.sendInitializationData('detail-dialog');
  }
}));

// --- Permanent listeners, connecting the bus to the store actions ---

loggingService.log("[DialogStore] Setting up permanent listener for DIALOG_READY_FOR_DATA.");
crossWindowMessageBus.listen(MessageType.DIALOG_READY_FOR_DATA, () => {
  loggingService.log("[DialogStore] Received DIALOG_READY_FOR_DATA. Triggering diff viewer handshake.");
  useDialogStore.getState().__internal_diffViewerHandshakeReady();
});

loggingService.log("[DialogStore] Setting up permanent listener for DETAIL_DIALOG_READY_FOR_DATA.");
crossWindowMessageBus.listen(MessageType.DETAIL_DIALOG_READY_FOR_DATA, () => {
    loggingService.log("[DialogStore] Received DETAIL_DIALOG_READY_FOR_DATA. Triggering detail dialog handshake.");
    useDialogStore.getState().__internal_detailDialogHandshakeReady();
});