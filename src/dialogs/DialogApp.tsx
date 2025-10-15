// src/dialogs/DialogApp.tsx

import * as React from "react";
import { useState, useEffect } from "react";
import { Spinner } from "@fluentui/react-components";
import { dialogStateService } from "../taskpane/services/dialog/DialogStateService";
import { crossWindowMessageBus } from "../taskpane/services/dialog/CrossWindowMessageBus";
import { MessageType } from "../taskpane/types/messaging.types";
import DialogComparisonView from "../taskpane/components/dialogs/DialogComparisonView";
import { IDiffResult } from "../taskpane/types/types";
import { loggingService } from "../taskpane/services/LoggingService";

interface IAppState {
  view: string | null;
  initialData: any | null;
  isLoading: boolean;
  error: string | null;
}

const renderView = (view: string, data: any) => {
  switch (view) {
    case "diff-viewer":
      return <DialogComparisonView result={data as IDiffResult} />;
    default:
      return <p>Error: Unknown view '{view}' requested.</p>;
  }
};

const DialogApp: React.FC = () => {
  const [state, setState] = useState<IAppState>({
    view: null,
    initialData: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loggingService.log("[DialogApp] Initializing component...");
    
    // <<< NEW: Diagnostic log to capture the storage state.
    loggingService.log("[DialogApp] Dialog sessionStorage snapshot BEFORE read:", { ...sessionStorage });

    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const sessionId = params.get("sessionId");
    
    loggingService.log(`[DialogApp] URL Params found: view=${view}, sessionId=${sessionId}`);

    if (!view) {
      const errorMsg = "Initialization failed: No 'view' parameter found in URL.";
      loggingService.warn(`[DialogApp] ${errorMsg}`);
      setState({ ...state, isLoading: false, error: errorMsg });
      return;
    }

    let data = null;
    try {
      if (sessionId) {
        loggingService.log(`[DialogApp] Attempting to retrieve data for sessionId: ${sessionId}`);
        data = dialogStateService.retrieveAndClearData(sessionId);
        loggingService.log("[DialogApp] Data retrieved from state service:", data);
      } else {
        loggingService.warn("[DialogApp] No sessionId found in URL. Cannot load data.");
      }
    } catch (e) {
      const errorMsg = "Failed to parse initialization data.";
      loggingService.logError(e, `[DialogApp] ${errorMsg}`);
      setState({ ...state, isLoading: false, error: errorMsg });
      return;
    }

    loggingService.log("[DialogApp] Setting final component state with view and data.", { view, data });
    setState({ view, initialData: data, isLoading: false, error: null });

    crossWindowMessageBus.broadcast({ type: MessageType.DIALOG_INITIALIZED });
  }, []);

  loggingService.log("[DialogApp] Rendering component with current state:", state);

  if (state.isLoading) {
    return <Spinner label="Loading..." />;
  }

  if (state.error) {
    return <p style={{ color: "red", padding: "16px" }}>{state.error}</p>;
  }

  return (
    <div>
      {state.view ? renderView(state.view, state.initialData) : <p>No view specified.</p>}
    </div>
  );
};

export default DialogApp;