// src/taskpane/components/App.tsx

import * as React from "react";
import { useEffect, useMemo } from "react";
import { Button } from "@fluentui/react-components";
import { useAppStore } from "../state/appStore";
import { IVersionViewModel } from "../types/types";
import NotificationDialog from "../shared/ui/NotificationDialog";
import { RestoreSelectionDialog } from "../features/restore/components/RestoreSelectionDialog";
import SaveVersionForm from "../features/restore/components/SaveVersionForm";
import VersionHistory from "../features/restore/components/VersionHistory";
import TaskPaneComparisonView from "../features/comparison/components/TaskPaneComparisonView";
import DeveloperTools from "../features/developer/components/DeveloperTools";
import { comparisonWorkflowService } from "../features/comparison/services/comparison.workflow.service";

const FREE_TIER_VERSION_LIMIT = 3;

/**
 * The root component of the task pane application.
 * This component's primary responsibilities are:
 * 1. To act as a router, showing the "home" screen or the "results" screen.
 * 2. To trigger initial data loading (like fetching the license).
 * 3. To read state from the central stores to render major UI elements.
 */
const App = () => {
  // --- Select ALL required state from the main app store ---
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
  const clearNotification = useAppStore((state) => state.clearNotification);

  // --- Trigger initial data fetch on component mount ---
  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

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

      {diffResult ? (
        <TaskPaneComparisonView />
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Compact header section */}
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
          
          {/* Version History - displays all versions naturally */}
          <VersionHistory versions={versionsForView} disabled={isRestoring} />
        </div>
      )}

      {/* Developer tools at the bottom - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ flexShrink: 0, marginTop: '8px' }}>
          <DeveloperTools />
        </div>
      )}
    </div>
  );
};

export default App;