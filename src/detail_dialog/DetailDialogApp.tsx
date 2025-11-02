// src/detail_dialog/DetailDialogApp.tsx

import * as React from "react";
import { useState, useEffect } from "react";
import { Spinner } from "@fluentui/react-components";
import { crossWindowMessageBus } from "../taskpane/core/dialog/CrossWindowMessageBus";
import { MessageType, InitializeDetailDataPayload, UpdateDetailDataPayload } from "../taskpane/types/messaging.types";
import { ICombinedChange } from "../taskpane/types/types";
import { loggingService } from "../taskpane/core/services/LoggingService";
import ChangeDetailViewer from "../taskpane/features/comparison/components/dialog/ChangeDetailViewer";

interface IAppState {
  changeData: ICombinedChange | null;
  isLoading: boolean;
  error: string | null;
}

const DetailDialogApp: React.FC = () => {
  const [state, setState] = useState<IAppState>({
    changeData: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loggingService.log("[DetailDialogApp] Initializing and starting handshake...");

    // Listener for the first data payload
    const unsubscribeInit = crossWindowMessageBus.listen(
      MessageType.INITIALIZE_DETAIL_DATA,
      (payload: InitializeDetailDataPayload) => {
        loggingService.log("[DetailDialogApp] Received INITIALIZE_DETAIL_DATA", payload);
        setState({
          changeData: payload.change,
          isLoading: false,
          error: null,
        });
      }
    );

    // Listener for all subsequent updates
    const unsubscribeUpdate = crossWindowMessageBus.listen(
      MessageType.UPDATE_DETAIL_DATA,
      (payload: UpdateDetailDataPayload) => {
        loggingService.log("[DetailDialogApp] Received UPDATE_DETAIL_DATA", payload);
        // Set state without a loading flash
        setState(prevState => ({ ...prevState, changeData: payload.change }));
      }
    );

    // Announce readiness to the orchestrator
    loggingService.log("[DetailDialogApp] Broadcasting DETAIL_DIALOG_READY_FOR_DATA to task pane.");
    crossWindowMessageBus.messageParent({ type: MessageType.DETAIL_DIALOG_READY_FOR_DATA });

    return () => {
      loggingService.log("[DetailDialogApp] Cleaning up listeners.");
      unsubscribeInit();
      unsubscribeUpdate();
    };
  }, []); // Empty dependency array ensures this runs only once.

  if (state.isLoading) {
    return <Spinner label="Requesting data from task pane..." />;
  }

  if (state.error) {
    return <p style={{ color: "red", padding: "16px" }}>{state.error}</p>;
  }

  return (
    <div style={{ padding: '8px' }}>
      {state.changeData ? (
        <ChangeDetailViewer change={state.changeData} />
      ) : (
        <p>Waiting for data...</p>
      )}
    </div>
  );
};

export default DetailDialogApp;