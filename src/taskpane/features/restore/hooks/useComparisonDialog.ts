// src/taskpane/hooks/useComparisonDialog.ts

import { useState, useEffect } from "react";
import { IDiffResult } from "../../../types/types";
import { dialogService } from "../../../core/dialog/DialogService";
import { crossWindowMessageBus } from "../../../core/dialog/CrossWindowMessageBus";
import { MessageType } from "../../../types/messaging.types";
import { loggingService } from "../../../core/services/LoggingService";

// --- STEP 1: Import the Zustand store ---
import { useAppStore } from "../../../state/appStore"; 

// --- STEP 2: Remove the old context import ---
// import { useUser } from "../context/UserContext"; // This is no longer needed

/**
 * A custom hook to manage the state and communication lifecycle for the
 * Comparison View dialog. It handles the entire "data handshake" protocol.
 */
export function useComparisonDialog() {
  const [dataToSend, setDataToSend] = useState<IDiffResult | null>(null);
  
  // --- STEP 3: Select the license state directly from the Zustand store ---
  const license = useAppStore((state) => state.license);

  useEffect(() => {
    if (!dataToSend) {
      return () => {};
    }

    loggingService.log("[useComparisonDialog] Data is ready. Setting up handshake listener...");

    const unsubscribe = crossWindowMessageBus.listen(MessageType.DIALOG_READY_FOR_DATA, () => {
      loggingService.log("[useComparisonDialog] Received DIALOG_READY_FOR_DATA. Sending data payload...");
      
      crossWindowMessageBus.broadcast({
        type: MessageType.INITIALIZE_DATA,
        payload: {
          diffResult: dataToSend,
          // Use the license tier from the store's state
          licenseTier: license?.tier ?? 'free',
        },
      });

      setDataToSend(null);
      unsubscribe();
    });

    dialogService.open("diff-viewer").catch((error) => {
      loggingService.logError(error, "[useComparisonDialog] Failed to open dialog");
      setDataToSend(null);
      unsubscribe();
    });

    return () => {
      loggingService.log("[useComparisonDialog] Cleaning up handshake listener due to unmount.");
      unsubscribe();
    };
  }, [dataToSend, license]);

  const openComparisonInDialog = (result: IDiffResult) => {
    loggingService.log("[useComparisonDialog] openComparisonInDialog called. Staging data for handshake.");
    setDataToSend(result);
  };

  return {
    openComparisonInDialog,
  };
}