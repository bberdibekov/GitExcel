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

const FREE_TIER_VERSION_LIMIT = 3;

/**
 * The root component of the task pane application.
 * This component's primary responsibilities are:
 * 1. To act as a router, showing the "home" screen or the "results" screen.
 * 2. To trigger initial data loading (like fetching the license).
 */
const App = () => {
  const {
    versions,
    license,
    isLicenseLoading,
    selectedVersions,
    isRestoring,
    notification,
    restoreTarget,
  } = useAppStore();
  
  // --- Simplified state selection ---
  const isDiffViewerOpen = useDialogStore((state) => state.isDiffViewerOpen);
  
  const fetchLicense = useAppStore((state) => state.fetchLicense);
  const clearNotification = useAppStore((state) => state.clearNotification);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  // --- The root listener for SHOW_CHANGE_DETAIL has been removed ---

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

  const renderContent = () => {
    if (isDiffViewerOpen) {
      return <ComparisonDialogPlaceholder />;
    }

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