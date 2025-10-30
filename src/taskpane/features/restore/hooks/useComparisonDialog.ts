// src/taskpane/features/restore/hooks/useComparisonDialog.ts

import { useState, useEffect } from "react";
// --- FIX: Import the necessary types ---
import { IDiffResult, IWorkbookSnapshot } from "../../../types/types";
import { dialogService } from "../../../core/dialog/DialogService";
import { crossWindowMessageBus } from "../../../core/dialog/CrossWindowMessageBus";
// --- FIX: Import the payload type we will be using ---
import { MessageType, InitializeDataPayload } from "../../../types/messaging.types";
import { loggingService } from "../../../core/services/LoggingService";
import { useAppStore } from "../../../state/appStore"; 

/**
 * A custom hook to manage the state and communication lifecycle for the
 * Comparison View dialog. It handles the entire "data handshake" protocol.
 * @deprecated This hook is architecturally superseded by comparison.workflow.service.ts
 */
export function useComparisonDialog() {
  // --- FIX: The state now holds the entire payload, not just the diffResult ---
  const [dataToSend, setDataToSend] = useState<InitializeDataPayload | null>(null);
  
  const license = useAppStore((state) => state.license);
  // --- FIX: We need access to the versions to retrieve the snapshots ---
  const versions = useAppStore((state) => state.versions);

  useEffect(() => {
    if (!dataToSend) {
      return () => {};
    }

    loggingService.log("[useComparisonDialog] Data is ready. Setting up handshake listener...");

    const unsubscribe = crossWindowMessageBus.listen(MessageType.DIALOG_READY_FOR_DATA, () => {
      loggingService.log("[useComparisonDialog] Received DIALOG_READY_FOR_DATA. Sending data payload...");
      
      crossWindowMessageBus.broadcast({
        type: MessageType.INITIALIZE_DATA,
        payload: dataToSend,
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
  }, [dataToSend]); // No longer need license in dependency array as it's part of dataToSend

  /**
   * --- FIX: The function signature now requires the indices of the compared versions ---
   * This is necessary to look up the snapshots from the main app state.
   */
  const openComparisonInDialog = (result: IDiffResult, indices: { start: number, end: number }) => {
    loggingService.log("[useComparisonDialog] openComparisonInDialog called. Staging data for handshake.");
    
    const startVersion = versions[indices.start];
    const endVersion = versions[indices.end];

    if (!startVersion || !endVersion) {
        loggingService.logError(new Error("Could not find start or end version for comparison dialog."), "Invalid Indices Provided");
        return;
    }

    // --- FIX: Build the complete payload object ---
    setDataToSend({
        diffResult: result,
        licenseTier: license?.tier ?? 'free',
        startSnapshot: startVersion.snapshot,
        endSnapshot: endVersion.snapshot,
    });
  };

  return {
    openComparisonInDialog,
  };
}