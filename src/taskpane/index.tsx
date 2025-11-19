import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { excelInteractionService } from "./core/excel/excel.interaction.service";

/* global document, Office, module, require */

const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

/* Render application */
const render = (Component: typeof App) => {
  root?.render(
    <FluentProvider theme={webLightTheme}>
      {/* Props removed to match your App component definition */}
      <Component />
    </FluentProvider>
  );
};

/* Initial render */
Office.onReady(async (info) => {
  if (info.host === Office.HostType.Excel) {
    
    // --- SHARED RUNTIME BOOTSTRAP ---
    console.log("[LifeCycle] Office.onReady fired. Shared Runtime is active.");
    
    try {
      // 1. Start the continuous event listener immediately.
      await excelInteractionService.startChangeTracking();
      console.log("[LifeCycle] Background change tracking started.");
    } catch (e) {
      console.error("[LifeCycle] Failed to start background tracking:", e);
    }

    // 2. Render the React UI.
    render(App);
  }
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    render(NextApp);
  });
}