// src/dialogs/DialogApp.tsx

import * as React from "react";
import { useState, useEffect } from "react";
import { Spinner } from "@fluentui/react-components";
import { crossWindowMessageBus } from "../taskpane/core/dialog/CrossWindowMessageBus";
import { MessageType, InitializeDataPayload } from "../taskpane/types/messaging.types";
import DialogComparisonView from "../taskpane/features/comparison/components/dialog/DialogComparisonView";
import { IDiffResult, IWorkbookSnapshot } from "../taskpane/types/types";
import { loggingService } from "../taskpane/core/services/LoggingService";

interface IAppState {
  view: string | null;
  initialData: {
    diffResult: IDiffResult;
    startSnapshot: IWorkbookSnapshot;
    endSnapshot: IWorkbookSnapshot;
    // --- [NEW] Add state for version comments ---
    startVersionComment: string;
    endVersionComment: string;
  } | null;
  licenseTier: 'free' | 'pro';
  isLoading: boolean;
  error: string | null;
}

const renderView = (view: string, data: IAppState['initialData'], licenseTier: 'free' | 'pro') => {
  if (!data) return <p>Error: Data is missing.</p>;
  switch (view) {
    case "diff-viewer":
      return <DialogComparisonView 
                result={data.diffResult} 
                startSnapshot={data.startSnapshot}
                endSnapshot={data.endSnapshot}
                licenseTier={licenseTier}
                // --- [NEW] Pass comments as props ---
                startVersionComment={data.startVersionComment}
                endVersionComment={data.endVersionComment}
             />;
    default:
      return <p>Error: Unknown view '{view}' requested.</p>;
  }
};

const DialogApp: React.FC = () => {
  const [state, setState] = useState<IAppState>({
    view: null,
    initialData: null,
    licenseTier: 'free',
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loggingService.log("[DialogApp] Initializing and starting handshake...");

    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    loggingService.log(`[DialogApp] URL Param 'view' found: ${view}`);

    if (!view) {
      const errorMsg = "Initialization failed: No 'view' parameter found in URL.";
      loggingService.warn(`[DialogApp] ${errorMsg}`);
      setState({ view: null, initialData: null, licenseTier: 'free', isLoading: false, error: errorMsg });
      return () => {};
    }
    
    setState(prevState => ({ ...prevState, view }));

    const unsubscribe = crossWindowMessageBus.listen(
      MessageType.INITIALIZE_DATA,
      (payload: InitializeDataPayload) => {
        loggingService.log("[DialogApp] Received INITIALIZE_DATA message with payload:", payload);
        setState({
          view,
          initialData: {
            diffResult: payload.diffResult,
            startSnapshot: payload.startSnapshot,
            endSnapshot: payload.endSnapshot,
            // --- [NEW] Store comments from payload ---
            startVersionComment: payload.startVersionComment,
            endVersionComment: payload.endVersionComment,
          },
          licenseTier: payload.licenseTier,
          isLoading: false,
          error: null,
        });
      }
    );

    loggingService.log("[DialogApp] Broadcasting DIALOG_READY_FOR_DATA to task pane.");
    // --- FIX: Use 'messageParent' when communicating from a dialog to the task pane ---
    crossWindowMessageBus.messageParent({ type: MessageType.DIALOG_READY_FOR_DATA });
    
    return () => {
      loggingService.log("[DialogApp] Cleaning up listener for INITIALIZE_DATA.");
      unsubscribe();
    };
  }, []);

  loggingService.log("[DialogApp] Rendering component with current state:", state);

  if (state.isLoading) {
    return <Spinner label="Requesting data from task pane..." />;
  }

  if (state.error) {
    return <p style={{ color: "red", padding: "16px" }}>{state.error}</p>;
  }

  return (
    <div>
      {state.view && state.initialData ? renderView(state.view, state.initialData, state.licenseTier) : <p>Waiting for data...</p>}
    </div>
  );
};

export default DialogApp;