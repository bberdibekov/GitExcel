// src/dialogs/index.tsx

import * as React from "react";
import * as ReactDOM from "react-dom";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import DialogApp from "./DialogApp";
import { crossWindowMessageBus } from "../taskpane/core/dialog/CrossWindowMessageBus";
import { loggingService } from "../taskpane/core/services/LoggingService";

/* global document, Office */

Office.onReady(() => {
  Office.context.ui.addHandlerAsync(
    Office.EventType.DialogParentMessageReceived,
    (arg) => {
      loggingService.log("[Dialog Index] Platform event DialogParentMessageReceived fired. Message:", arg.message);
      crossWindowMessageBus.__internal_receive(arg.message);
    },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        loggingService.logError(asyncResult.error, "[Dialog Index] Could not add parent message handler");
      } else {
        loggingService.log("[Dialog Index] Parent message handler added successfully.");
      }
    }
  );

  ReactDOM.render(
    <FluentProvider theme={webLightTheme}>
      <DialogApp />
    </FluentProvider>,
    document.getElementById("container")
  );
});