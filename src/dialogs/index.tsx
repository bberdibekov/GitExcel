// src/dialogs/index.tsx

import * as React from "react";
import * as ReactDOM from "react-dom";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import DialogApp from "./DialogApp";

/* global document, Office */

Office.onReady(() => {
  ReactDOM.render(
    <FluentProvider theme={webLightTheme}>
      <DialogApp />
    </FluentProvider>,
    document.getElementById("container")
  );
});