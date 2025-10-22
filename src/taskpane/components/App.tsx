// src/taskpane/components/App.tsx

import * as React from "react";
import { useEffect, useMemo } from "react";
import { Button } from "@fluentui/react-components";

// --- STEP 1: Import the central Zustand store ---
import { useAppStore } from "../state/appStore";
import { IVersionViewModel } from "../types/types";

// --- All component imports remain the same ---
import NotificationDialog from "./NotificationDialog";
import { RestoreSelectionDialog } from "./RestoreSelectionDialog";
import SaveVersionForm from "./SaveVersionForm";
import VersionHistory from "./VersionHistory";
import TaskPaneComparisonView from "./TaskPaneComparisonView";
import DeveloperTools from "./DeveloperTools";
import { useComparisonDialog } from "../hooks/useComparisonDialog";

const FREE_TIER_VERSION_LIMIT = 3;

/**
 * The root component of the task pane application.
 * After refactoring to Zustand, this component's primary responsibilities are:
 * 1. To orchestrate the overall layout of the application.
 * 2. To trigger initial data loading (like fetching the license).
 * 3. To read state from the central store for rendering major UI elements.
 */
const App = () => {
  // --- Select ALL required state and actions from the store ---
  const {
    versions,
    license,
    isLicenseLoading,
    selectedVersions,
    diffResult,
    isRestoring,
    notification,
    restoreTarget, // We still need this to conditionally render the dialog
  } = useAppStore();

  const fetchLicense = useAppStore((state) => state.fetchLicense);
  const runComparison = useAppStore((state) => state.runComparison);
  const clearNotification = useAppStore((state) => state.clearNotification);

  const { openComparisonInDialog } = useComparisonDialog();

  // --- Trigger initial data fetch on component mount ---
  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  // The logic for this memoized selector remains the same.
  const versionsForView = useMemo((): IVersionViewModel[] => {
    const isPro = license?.tier === 'pro';
    const totalVersions = versions.length;

    return versions.map((version, index) => {
      const isWithinFreeLimit = index >= totalVersions - FREE_TIER_VERSION_LIMIT;
      const isRestorable = isPro || isWithinFreeLimit;

      let restoreTooltip = "Restore sheets from this version";
      if (!isRestorable) {
        restoreTooltip = `Upgrade to Pro to restore versions older than the last ${FREE_TIER_VERSION_LIMIT}.`;
      }

      return {
        ...version,
        isRestorable,
        restoreTooltip,
        showProBadge: !isRestorable,
      };
    });
  }, [versions, license]);

  console.log("[App.tsx] State of 'versions' from store before render:", versions);

  return (
    <div style={{ padding: "10px", fontFamily: "Segoe UI" }}>
      <NotificationDialog notification={notification} onDismiss={clearNotification} />
      
      {/* --- CORRECTED INVOCATION --- */}
      {/* We conditionally render the dialog, but pass it NO PROPS. */}
      {/* It will manage its own state by reading from the store. */}
      {restoreTarget && (
        <RestoreSelectionDialog />
      )}

      <h2>Version Control</h2>
      
      <SaveVersionForm />

      <h3>Version History</h3>
      
      <Button 
        appearance="primary" 
        disabled={selectedVersions.length !== 2 || isLicenseLoading || isRestoring} 
        onClick={() => runComparison()}
        style={{ marginBottom: "10px" }}
      >
        {isLicenseLoading ? "Loading..." : isRestoring ? "Restoring..." : `Compare Selected (${selectedVersions.length}/2)`}
      </Button>

      {/* Pass the calculated view-model as a prop */}
      <VersionHistory versions={versionsForView} />
      
      {diffResult && (
        <TaskPaneComparisonView
          onOpenInWindow={openComparisonInDialog}
        />
      )}

      {process.env.NODE_ENV === 'development' && (
        <DeveloperTools />
      )}
    </div>
  );
};

export default App;