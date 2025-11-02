// src/taskpane/core/dialog/DialogService.ts

import { crossWindowMessageBus } from '../dialog/CrossWindowMessageBus';
import { loggingService } from "../../core/services/LoggingService";
import { useDialogStore } from '../../state/dialogStore';
import { MessageType } from '../../types/messaging.types';

export interface IDialogOptions {
  height?: number;
  width?: number;
  displayInIframe?: boolean;
}

let activeDialog: Office.Dialog | null = null;
type DialogView = 'diff-viewer'; // The only supported view

/**
 * The master orchestrator for the Office.js dialog window.
 */
class DialogService {
  private open(view: DialogView, options?: Partial<IDialogOptions>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (activeDialog) {
        reject(new Error(`Dialog '${view}' is already open.`));
        return;
      }
      const dialogUrl = `${window.location.origin}/diff-viewer.html?view=${view}`;
      loggingService.log(`[DialogService] Opening '${view}' with URL: ${dialogUrl}`);

      Office.context.ui.displayDialogAsync(dialogUrl, options, (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          loggingService.logError(asyncResult.error, `[DialogService] Failed to open '${view}' dialog`);
          useDialogStore.getState().closeAll(); 
          reject(asyncResult.error);
          return;
        }

        const dialog = asyncResult.value;
        activeDialog = dialog;
        loggingService.log(`[DialogService] '${view}' dialog opened. Registering handlers.`);

        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: any) => {
            if ("message" in arg) {
              crossWindowMessageBus.__internal_receive(arg.message);
            } else {
              loggingService.logError(new Error(`DialogMessageReceived error from '${view}'`), `Error code: ${arg.error}`);
            }
          }
        );
        
        const DIALOG_CLOSED_BY_USER = 12006;
        dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg: { error: number }) => {
            loggingService.log(`[DialogService] DialogEventReceived for '${view}'. Code: ${arg.error}`);
            
            if (arg.error === DIALOG_CLOSED_BY_USER) {
              activeDialog = null;
              loggingService.log(`[DialogService] Physical dialog for '${view}' cleaned up.`);
              useDialogStore.getState().closeAll(); 
            }
          }
        );
        resolve();
      });
    });
  }

  public async openDiffViewer(): Promise<void> {
    return this.open('diff-viewer', { height: 80, width: 60, displayInIframe: false });
  }

  public sendInitializationData(view: DialogView): void {
    if (!activeDialog) {
      loggingService.warn(`[DialogService] Tried to send init data to '${view}', but no active dialog was found.`);
      return;
    }

    const state = useDialogStore.getState();
    const { stagedDiffViewerData } = state;
    if (stagedDiffViewerData) {
      loggingService.log("[DialogService] Sending INITIALIZE_DATA to diff viewer.", stagedDiffViewerData);
      crossWindowMessageBus.messageChild(activeDialog, { type: MessageType.INITIALIZE_DATA, payload: stagedDiffViewerData });
      useDialogStore.setState({ stagedDiffViewerData: null });
    }
  }
}

export const dialogService = new DialogService();