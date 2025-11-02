// src/taskpane/core/dialog/DialogService.ts

import { crossWindowMessageBus } from '../dialog/CrossWindowMessageBus';
import { loggingService } from "../../core/services/LoggingService";
import { useDialogStore } from '../../state/dialogStore';
import { ICombinedChange } from '../../types/types';
import { MessageType } from '../../types/messaging.types';

export interface IDialogOptions {
  height?: number;
  width?: number;
  displayInIframe?: boolean;
}

const activeDialogs: {
  'diff-viewer': Office.Dialog | null,
  'detail-dialog': Office.Dialog | null,
} = {
  'diff-viewer': null,
  'detail-dialog': null,
};

type DialogView = keyof typeof activeDialogs;

/**
 * The master orchestrator for all Office.js dialog windows.
 */
class DialogService {
  private open(view: DialogView, options?: Partial<IDialogOptions>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (activeDialogs[view]) {
        reject(new Error(`Dialog '${view}' is already open.`));
        return;
      }
      // Append the 'view' query parameter so the dialog app knows what to render.
      const dialogUrl = `${window.location.origin}/${view}.html?view=${view}`;
      
      loggingService.log(`[DialogService] Opening '${view}' with URL: ${dialogUrl}`);

      Office.context.ui.displayDialogAsync(dialogUrl, options, (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          loggingService.logError(asyncResult.error, `[DialogService] Failed to open '${view}' dialog`);
          useDialogStore.getState().closeAll(); 
          reject(asyncResult.error);
          return;
        }

        const dialog = asyncResult.value;
        activeDialogs[view] = dialog;
        loggingService.log(`[DialogService] '${view}' dialog opened. Registering handlers.`);

        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: any) => {
            if ("message" in arg) {
              crossWindowMessageBus.__internal_receive(arg.message);
            } else {
              loggingService.logError(new Error(`DialogMessageReceived error from '${view}'`), `Error code: ${arg.error}`);
            }
          }
        );
        
        // --- THIS IS THE CORRECTED LOGIC ---
        // The error code for a user-initiated close is 12006.
        const DIALOG_CLOSED_BY_USER = 12006;

        dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg: { error: number }) => {
            loggingService.log(`[DialogService] DialogEventReceived for '${view}'. Code: ${arg.error}`);
            
            // Only trigger the full close-down logic if the user explicitly closed the dialog.
            // Other events (like opening a second dialog) will be logged but ignored here.
            if (arg.error === DIALOG_CLOSED_BY_USER) {
              
              // Coordinated close: if the main viewer is closed, also close the detail view.
              if (view === 'diff-viewer' && activeDialogs['detail-dialog']) {
                loggingService.log("[DialogService] Main diff viewer closed, also closing detail dialog.");
                activeDialogs['detail-dialog'].close();
                activeDialogs['detail-dialog'] = null;
              }
  
              activeDialogs[view] = null;
              loggingService.log(`[DialogService] Physical dialog for '${view}' cleaned up.`);
              
              // This is the call that was causing the problem. Now it's correctly guarded.
              useDialogStore.getState().closeAll(); 
            }
          }
        );
        // --- END OF CORRECTION ---

        resolve();
      });
    });
  }

  public async openDiffViewer(): Promise<void> {
    return this.open('diff-viewer', { height: 80, width: 60, displayInIframe: false });
  }

  public async showChangeDetail(change: ICombinedChange): Promise<void> {
    const detailDialog = activeDialogs['detail-dialog'];
    if (detailDialog) {
      loggingService.log("[DialogService] Detail dialog open. Sending UPDATE message.");
      crossWindowMessageBus.messageChild(
        detailDialog, 
        { type: MessageType.UPDATE_DETAIL_DATA, payload: { change } }
      );
    } else {
      loggingService.log("[DialogService] Creating new detail dialog.");
      useDialogStore.setState({ stagedDetailData: change });
      try {
        // For the detail dialog, we will also need to update webpack to output 'detail-dialog.html'
        await this.open('detail-dialog', { height: 50, width: 40, displayInIframe: false });
        useDialogStore.setState(state => ({ openViews: { ...state.openViews, 'detail-dialog': true }}));
      } catch (error) {
        loggingService.logError(error, "[DialogService] Failed to create detail dialog.");
        useDialogStore.setState({ stagedDetailData: null });
      }
    }
  }

  public sendInitializationData(view: DialogView): void {
    const dialog = activeDialogs[view];
    if (!dialog) {
      loggingService.warn(`[DialogService] Tried to send init data to '${view}', but no active dialog was found.`);
      return;
    }

    const state = useDialogStore.getState();
    if (view === 'diff-viewer') {
      const { stagedDiffViewerData } = state;
      if (stagedDiffViewerData) {
        loggingService.log("[DialogService] Sending INITIALIZE_DATA to diff viewer.", stagedDiffViewerData);
        crossWindowMessageBus.messageChild(dialog, { type: MessageType.INITIALIZE_DATA, payload: stagedDiffViewerData });
        useDialogStore.setState({ stagedDiffViewerData: null });
      }
    } else if (view === 'detail-dialog') {
      const { stagedDetailData } = state;
      if (stagedDetailData) {
        loggingService.log("[DialogService] Sending INITIALIZE_DETAIL_DATA to detail dialog.", stagedDetailData);
        crossWindowMessageBus.messageChild(dialog, { type: MessageType.INITIALIZE_DETAIL_DATA, payload: { change: stagedDetailData } });
        useDialogStore.setState({ stagedDetailData: null });
      }
    }
  }
}

export const dialogService = new DialogService();