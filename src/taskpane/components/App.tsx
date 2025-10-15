// src/taskpane/components/App.tsx

import * as React from "react";
import { useUser } from "../context/UserContext";
import { Button } from "@fluentui/react-components";
import { useVersions } from "../hooks/useVersions";
import { useComparison } from "../hooks/useComparison";
import { useAppActions } from "../hooks/useAppActions";
import NotificationDialog from "./NotificationDialog"; // Import our new, clean component

import SaveVersionForm from "./SaveVersionForm";
import VersionHistory from "./VersionHistory";
import ComparisonView from "./ComparisonView";
import DeveloperTools from "./DeveloperTools";

const App = () => {
  // All hooks remain exactly the same. No logic changes needed here.
  const { versions, addVersion, clearVersions } = useVersions();
  const { 
    selectedVersions, 
    diffResult, 
    handleVersionSelect, 
    compareVersions 
  } = useComparison(versions);
  const { license, isLoading: isLicenseLoading } = useUser();
  const {
    isRestoring,
    activeFilters,
    notification,
    clearNotification,
    handleFilterChange,
    runComparison,
    handleCompareToPrevious,
    handleRestoreSheets,
  } = useAppActions({
    versions,
    license,
    selectedVersions,
    compareVersions,
  });

  console.log("[App.tsx] State of 'versions' before render:", versions);

  return (
    <div style={{ padding: "10px", fontFamily: "Segoe UI" }}>
      {/* The cluttered dialog logic is gone, replaced by this single clean line. */}
      <NotificationDialog notification={notification} onDismiss={clearNotification} />

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
        versions={versions} 
        selectedVersions={selectedVersions} 
        isRestoring={isRestoring}
        onVersionSelect={handleVersionSelect}
        onCompareToPrevious={handleCompareToPrevious}
        onRestore={handleRestoreSheets}
      />
      
      {diffResult && (
        <ComparisonView 
          result={diffResult} 
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
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