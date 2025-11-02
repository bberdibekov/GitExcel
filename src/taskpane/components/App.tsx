// src/taskpane/components/App.tsx

import * as React from "react";
import { useEffect, useMemo } from "react";
import { Button } from "@fluentui/react-components";
import { useAppStore } from "../state/appStore";
import { useDialogStore } from "../state/dialogStore";
import { IVersionViewModel } from "../types/types";
import NotificationDialog from "../shared/ui/NotificationDialog";
import { RestoreSelectionDialog } from "../features/restore/components/RestoreSelectionDialog";
import SaveVersionForm from "../features/restore/components/SaveVersionForm";
import VersionHistory from "../features/restore/components/VersionHistory";
import DeveloperTools from "../features/developer/components/DeveloperTools";
import { comparisonWorkflowService } from "../features/comparison/services/comparison.workflow.service";
import ComparisonDialogPlaceholder from "../features/comparison/components/ComparisonDialogPlaceholder";
import { crossWindowMessageBus } from "../core/dialog/CrossWindowMessageBus";
import { MessageType, ShowChangeDetailPayload } from "../types/messaging.types";
import { dialogService } from "../core/dialog/DialogService";
import { loggingService } from "../core/services/LoggingService";

const FREE_TIER_VERSION_LIMIT = 3;

/**
 * The root component of the task pane application.
 * This component's primary responsibilities are:
 * 1. To act as a router, showing the "home" screen or the "results" screen.
 * 2. To trigger initial data loading (like fetching the license).
 * 3. To establish root-level message bus listeners for orchestration.
 */
const App = () => {
  // --- Select ALL required state from the central stores ---
  const {
    versions,
    license,
    isLicenseLoading,
    selectedVersions,
    isRestoring,
    notification,
    restoreTarget,
  } = useAppStore();
  
  // --- Subscribe to the new dialog store state shape ---
  const isDiffViewerOpen = useDialogStore((state) => state.openViews['diff-viewer']);
  
  const fetchLicense = useAppStore((state) => state.fetchLicense);
  const clearNotification = useAppStore((state) => state.clearNotification);

  // --- Trigger initial data fetch on component mount ---
  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  useEffect(() => {
    loggingService.log("[App.tsx] Setting up root listener for SHOW_CHANGE_DETAIL messages.");
    
    const unsubscribe = crossWindowMessageBus.listen(
      MessageType.SHOW_CHANGE_DETAIL,
      (payload: ShowChangeDetailPayload) => {
        loggingService.log("[App.tsx] Received SHOW_CHANGE_DETAIL. Invoking DialogService.", payload);
        // This is the connection point: the message from the dialog UI
        // triggers the central orchestrator service.
        dialogService.showChangeDetail(payload.change);
      }
    );

    // Cleanup function to prevent memory leaks when the component unmounts.
    return () => {
      loggingService.log("[App.tsx] Cleaning up root listener for SHOW_CHANGE_DETAIL.");
      unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount and unmount.


  // --- This memoized calculation maps raw versions to view models for the UI ---
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

  // --- Main Render Logic ---
  const renderContent = () => {
    // Priority 1: If the main dialog is open, show the placeholder.
    // Use the new state variable ---
    if (isDiffViewerOpen) {
      return <ComparisonDialogPlaceholder />;
    }

    // Priority 2: Otherwise, show the main version history view.
    return (
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Version Control</h2>
          <SaveVersionForm disabled={isRestoring} />
          <h3 style={{ margin: '8px 0 6px 0', fontSize: '14px', fontWeight: 600 }}>Version History</h3>
          <Button
            appearance="primary"
            disabled={selectedVersions.length !== 2 || isLicenseLoading || isRestoring}
            onClick={() => comparisonWorkflowService.runComparison()}
            style={{ marginBottom: "8px" }}
            size="small"
          >
            {isLicenseLoading ? "Loading..." : `Compare (${selectedVersions.length}/2)`}
          </Button>
        </div>
        <VersionHistory versions={versionsForView} disabled={isRestoring} />
      </div>
    );
  };

  return (
    <div style={{ 
      padding: "8px", 
      fontFamily: "Segoe UI", 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <NotificationDialog notification={notification} onDismiss={clearNotification} />
      {restoreTarget && <RestoreSelectionDialog />}

      {renderContent()}

      {process.env.NODE_ENV === 'development' && (
        <div style={{ flexShrink: 0, marginTop: '8px' }}>
          <DeveloperTools />
        </div>
      )}
    </div>
  );
};

export default App;