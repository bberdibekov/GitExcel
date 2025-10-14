// src/taskpane/components/App.tsx

import * as React from "react";
import { useUser } from "../context/UserContext";
import { Button } from "@fluentui/react-components";
import { useVersions } from "../hooks/useVersions";
import { useComparison } from "../hooks/useComparison";
import { useAppActions } from "../hooks/useAppActions"; // NEW: Import the new hook

import SaveVersionForm from "./SaveVersionForm";
import VersionHistory from "./VersionHistory";
import ComparisonView from "./ComparisonView";
import DeveloperTools from "./DeveloperTools";

const App = () => {
  // --- Data Hooks ---
  const { versions, addVersion, clearVersions } = useVersions();
  const { 
    selectedVersions, 
    diffResult, 
    handleVersionSelect, 
    compareVersions 
  } = useComparison(versions);
  
  const { license, isLoading: isLicenseLoading } = useUser();

  // --- Action & State Logic Hook ---
  // All complex logic is now cleanly encapsulated in the useAppActions hook.
  const {
    isRestoring,
    activeFilters,
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

  // The App component is now purely responsible for layout and composition.
  return (
    <div style={{ padding: "10px", fontFamily: "Segoe UI" }}>
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
          onSaveVersion={addVersion} 
          onClearHistory={clearVersions} 
          onCompare={(startIndex, endIndex) => runComparison(startIndex, endIndex)}
        />
      )}
    </div>
  );
};

export default App;