// src/taskpane/index.tsx

import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { UserProvider } from "./context/UserContext";


console.log("[Trace] 1. index.tsx module loaded.");

/* global document, Office, module, require, HTMLElement */

const title = "Contoso Task Pane Add-in";

const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

console.log("[Trace] 2. About to call Office.onReady().");

/* Render application after Office initializes */
Office.onReady(() => {
  console.log("[Trace] 3. Office.onReady() has fired.");
  root?.render(
    <FluentProvider theme={webLightTheme}>
      {/* 2. Wrap the main App component with the UserProvider. */}
      {/* Now, the entire App component tree can access the user's license */}
      {/* state via the useUser() hook. */}
      <UserProvider>
        <App/>
      </UserProvider>
    </FluentProvider>
  );
  console.log("[Trace] 4. React root.render() has been called.");
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(NextApp);
  });
}