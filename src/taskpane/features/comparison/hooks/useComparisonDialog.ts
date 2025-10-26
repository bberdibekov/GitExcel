// src/taskpane/hooks/useComparisonDialog.ts

import { useEffect } from "react";
import { IDiffResult } from "../../../types/types";
import { crossWindowMessageBus } from "../../../core/dialog/CrossWindowMessageBus";
import { MessageType } from "../../../types/messaging.types";
import { loggingService } from "../../../core/services/LoggingService";
import { useAppStore } from "../../../state/appStore";
import { useDialogStore } from "../../../state/dialogStore";

/**
 * A custom hook to manage the state and communication lifecycle for the
 * Comparison View dialog. It orchestrates between the UI and the stores.
 */
export function useComparisonDialog() {
  // Select state and actions from the new dialog store
  const openDialog = useDialogStore((state) => state.open);
  const handshakeReady = useDialogStore((state) => state.__internal_handshakeReady);
  const activeDialog = useDialogStore((state) => state.activeDialog);

  // Select required state from the app store
  const license = useAppStore((state) => state.license);

  // This effect runs once to set up the handshake listener.
  useEffect(() => {
    loggingService.log("[useComparisonDialog] Setting up handshake listener...");

    const unsubscribe = crossWindowMessageBus.listen(MessageType.DIALOG_READY_FOR_DATA, () => {
      loggingService.log("[useComparisonDialog] Received DIALOG_READY_FOR_DATA.");
      handshakeReady();
    });

    return () => {
      loggingService.log("[useComparisonDialog] Cleaning up handshake listener due to unmount.");
      unsubscribe();
    };
  }, [handshakeReady]);

  const openComparisonInDialog = (result: IDiffResult) => {
    if (activeDialog) {
      loggingService.warn("[useComparisonDialog] openComparisonInDialog called, but a dialog is already active.");
      return;
    }
    loggingService.log("[useComparisonDialog] openComparisonInDialog called.");
    
    openDialog("diff-viewer", {
      diffResult: result,
      licenseTier: license?.tier ?? "free",
    });
  };

  return {
    openComparisonInDialog,
  };
}