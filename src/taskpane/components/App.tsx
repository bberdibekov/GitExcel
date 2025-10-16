// src/taskpane/components/App.tsx

import * as React from "react";
import { useMemo } from "react";
import { useUser } from "../context/UserContext";
import { Button } from "@fluentui/react-components";
import { useVersions } from "../hooks/useVersions";
import { useComparison } from "../hooks/useComparison";
import { useAppActions } from "../hooks/useAppActions";
import NotificationDialog from "./NotificationDialog";

import SaveVersionForm from "./SaveVersionForm";
import VersionHistory from "./VersionHistory";
import ComparisonView from "./TaskPaneComparisonView";
import DeveloperTools from "./DeveloperTools";
import { RestoreSelectionDialog } from "./RestoreSelectionDialog";
import { IVersionViewModel } from "../types/types";
    
import { useComparisonDialog } from "../hooks/useComparisonDialog";

const FREE_TIER_VERSION_LIMIT = 3;

/**
 * The root component of the task pane application.
 * It is responsible for composing all the hooks and components together.
 */
const App = () => {
  const { versions, addVersion, clearVersions } = useVersions();
  
  // 1. Destructure the new `lastComparedIndices` state from the useComparison hook.
  const { 
    selectedVersions, 
    diffResult, 
    lastComparedIndices,
    handleVersionSelect, 
    compareVersions 
  } = useComparison(versions);

  const { license, isLoading: isLicenseLoading } = useUser();
  
  // 2. Pass `lastComparedIndices` as a prop to the useAppActions hook.
  const {
    isRestoring,
    activeFilters,
    notification,
    restoreTarget,
    initiateRestore,
    cancelRestore,
    executeRestore,
    clearNotification,
    handleFilterChange,
    runComparison,
    handleCompareToPrevious,
  } = useAppActions({
    versions,
    license,
    lastComparedIndices,
    compareVersions,
  });

  const { openComparisonInDialog } = useComparisonDialog(); 

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

  console.log("[App.tsx] State of 'versions' before render:", versions);

  return (
    <div style={{ padding: "10px", fontFamily: "Segoe UI" }}>
      <NotificationDialog notification={notification} onDismiss={clearNotification} />
      
      {restoreTarget && (
        <RestoreSelectionDialog
          isOpen={!!restoreTarget}
          onDismiss={cancelRestore}
          onRestore={executeRestore}
          tier={license?.tier ?? 'free'}
          availableSheets={Object.keys(restoreTarget.snapshot)}
        />
      )}

      <h2>Version Control</h2>
      
      <SaveVersionForm onSave={addVersion} disabled={isRestoring} />

      <h3>Version History</h3>
      
      <Button 
        appearance="primary" 
        disabled={selectedVersions.length !== 2 || isLicenseLoading || isRestoring} 
        onClick={() => runComparison()}
        style={{ marginBottom: "10px" }}
      >
        {isLicenseLoading ? "Loading..." : isRestoring ? "Restoring..." : `Compare Selected (${selectedVersions.length}/2)`}
      </Button>

      <VersionHistory 
        versions={versionsForView} 
        selectedVersions={selectedVersions} 
        isRestoring={isRestoring}
        onVersionSelect={handleVersionSelect}
        onCompareToPrevious={handleCompareToPrevious}
        onRestore={initiateRestore}
      />
      
      {diffResult && (
        <ComparisonView 
          result={diffResult} 
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onOpenInWindow={openComparisonInDialog}
        />
      )}

      {process.env.NODE_ENV === 'development' && (
        <DeveloperTools 
          versions={versions}
          onSaveVersion={addVersion} 
          onClearHistory={clearVersions} 
          onCompare={(startIndex, endIndex) => runComparison(startIndex, endIndex)}
        />
      )}
    </div>
  );
};

export default App;