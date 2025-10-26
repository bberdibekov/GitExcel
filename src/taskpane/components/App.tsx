// src/taskpane/components/App.tsx

import * as React from "react";
import { useEffect, useMemo } from "react";
import { Button } from "@fluentui/react-components";
import { useAppStore } from "../state/appStore";
import { IVersionViewModel } from "../types/types";
import { useDialogStore } from "../state/dialogStore";

import NotificationDialog from "../shared/ui/NotificationDialog";
import { RestoreSelectionDialog } from "../features/restore/components/RestoreSelectionDialog";
import SaveVersionForm from "../features/restore/components/SaveVersionForm";
import VersionHistory from "../features/restore/components/VersionHistory";
import TaskPaneComparisonView from "../features/comparison/components/TaskPaneComparisonView";
import DeveloperTools from "../features/developer/components/DeveloperTools";
import { useComparisonDialog } from "../features/comparison/hooks/useComparisonDialog";

const FREE_TIER_VERSION_LIMIT = 3;

/**
 * The root component of the task pane application.
 * this component's primary responsibilities are:
 * 1. To orchestrate the overall layout of the application.
 * 2. To trigger initial data loading (like fetching the license).
 * 3. To read state from the central stores to render major UI elements
 *    and manage the global enabled/disabled state of the UI.
 */
const App = () => {
  // --- Select ALL required state and actions from the main app store ---
  const {
    versions,
    license,
    isLicenseLoading,
    selectedVersions,
    diffResult,
    isRestoring,
    notification,
    restoreTarget,
  } = useAppStore();

  const fetchLicense = useAppStore((state) => state.fetchLicense);
  const runComparison = useAppStore((state) => state.runComparison);
  const clearNotification = useAppStore((state) => state.clearNotification);

  // --- Select state from the new dialog store ---
  // We derive a simple boolean to know if *any* dialog is currently active.
  const isDialogOpen = useDialogStore((state) => state.activeDialog !== null);

  // This hook is now a pure orchestrator, with its logic simplified by the new stores.
  const { openComparisonInDialog } = useComparisonDialog();

  // --- Trigger initial data fetch on component mount ---
  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  // This memoized calculation is unchanged.
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
      
      {/* This dialog is self-managing by reading from the appStore */}
      {restoreTarget && (
        <RestoreSelectionDialog />
      )}

      <h2>Version Control</h2>
      
      {/* Pass disabled prop based on dialog state --- */}
      {/* This prevents saving a new version while a comparison dialog is open. */}
      <SaveVersionForm disabled={isDialogOpen || isRestoring} />

      <h3>Version History</h3>
      
      <Button 
        appearance="primary" 
        // Add 'isDialogOpen' to the disabled condition ---
        disabled={selectedVersions.length !== 2 || isLicenseLoading || isRestoring || isDialogOpen} 
        onClick={() => runComparison()}
        style={{ marginBottom: "10px" }}
      >
        {isLicenseLoading ? "Loading..." : isRestoring ? "Restoring..." : `Compare Selected (${selectedVersions.length}/2)`}
      </Button>

      {/* Pass disabled prop to VersionHistory --- */}
      {/* This prevents selecting/deselecting versions while the dialog is open. */}
      <VersionHistory versions={versionsForView} disabled={isDialogOpen || isRestoring} />
      
      {/* This component now correctly shows a placeholder when the dialog is open */}
      {diffResult && (
        <TaskPaneComparisonView
          onOpenInWindow={openComparisonInDialog}
        />
      )}

      {/* Developer tools are only shown in development builds */}
      {process.env.NODE_ENV === 'development' && (
        <DeveloperTools />
      )}
    </div>
  );
};

export default App;