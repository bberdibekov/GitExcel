// src/taskpane/features/comparison/hooks/useComparisonDialog.ts

import { useEffect } from "react";
import { crossWindowMessageBus } from "../../../core/dialog/CrossWindowMessageBus";
import { MessageType } from "../../../types/messaging.types";
import { loggingService } from "../../../core/services/LoggingService";
import { useDialogStore } from "../../../state/dialogStore";

/**
 * A custom hook to manage the communication lifecycle for the
 * Comparison View dialog. Its SOLE responsibility is to listen for the
 * "ready" signal from the dialog and complete the data handshake.
 */
export function useComparisonDialog() {
  // Select the action to call when the handshake is ready
  const handshakeReady = useDialogStore((state) => state.__internal_handshakeReady);

  // This effect runs once to set up the crucial handshake listener.
  useEffect(() => {
    loggingService.log("[useComparisonDialog] Setting up handshake listener...");

    const unsubscribe = crossWindowMessageBus.listen(MessageType.DIALOG_READY_FOR_DATA, () => {
      loggingService.log("[useComparisonDialog] Received DIALOG_READY_FOR_DATA. Completing handshake.");
      handshakeReady();
    });

    return () => {
      loggingService.log("[useComparisonDialog] Cleaning up handshake listener due to unmount.");
      unsubscribe();
    };
  }, [handshakeReady]);

  // This hook has no UI-facing return value; its only job is to run the effect.
}