// src/detail_dialog/index.tsx

import * as React from "react";
import * as ReactDOM from "react-dom";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import DetailDialogApp from "./DetailDialogApp";
import { crossWindowMessageBus } from "../taskpane/core/dialog/CrossWindowMessageBus";
import { loggingService } from "../taskpane/core/services/LoggingService";

/* global document, Office */

Office.onReady(() => {
  Office.context.ui.addHandlerAsync(
    Office.EventType.DialogParentMessageReceived,
    (arg) => {
      loggingService.log("[Detail Dialog Index] Platform event DialogParentMessageReceived fired.", arg.message);
      crossWindowMessageBus.__internal_receive(arg.message);
    },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        loggingService.logError(asyncResult.error, "[Detail Dialog Index] Could not add parent message handler");
      } else {
        loggingService.log("[Detail Dialog Index] Parent message handler added successfully.");
      }
    }
  );

  ReactDOM.render(
    <FluentProvider theme={webLightTheme}>
      <DetailDialogApp />
    </FluentProvider>,
    document.getElementById("container")
  );
});