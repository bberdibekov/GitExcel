// src/taskpane/components/App.tsx

import * as React from "react";

import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";

import { Button } from "@fluentui/react-components";
import { useVersions } from "../hooks/useVersions";
import { useComparison } from "../hooks/useComparison";

import SaveVersionForm from "./SaveVersionForm";
import VersionHistory from "./VersionHistory";
import ComparisonView from "./ComparisonView";
import DeveloperTools from "./DeveloperTools";

const App = () => {
  const { versions, addVersion, clearVersions } = useVersions();
  const { 
    selectedVersions, 
    diffResult, 
    handleVersionSelect, 
    compareVersions 
  } = useComparison(versions);
  
  
  const { license, isLoading: isLicenseLoading } = useUser(); // Get license from context
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // Handler to toggle a filter's state
  const handleFilterChange = (filterId: string) => {
    setActiveFilters(prevFilters => {
      const newFilters = new Set(prevFilters);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      return newFilters;
    });
  };

  // Centralized function to trigger a comparison
  const runComparison = (startIndex?: number, endIndex?: number) => {
    // A comparison can only run if the license is loaded and valid.
    if (!license) return;
    compareVersions(license, activeFilters, startIndex, endIndex);
  };

  // Re-run the comparison automatically whenever filters change, if two versions are selected.
  useEffect(() => {
    if (selectedVersions.length === 2) {
      runComparison();
    }
  }, [activeFilters, selectedVersions, license]); // Rerun if filters, selection, or license change
  

  const handleCompareToPrevious = (versionId: number) => {
    const currentIndex = versions.findIndex(v => v.id === versionId);
    const previousIndex = currentIndex - 1;
    
    if (currentIndex > 0 && previousIndex >= 0) {
      // --- Use the new centralized runComparison function ---
      runComparison(previousIndex, currentIndex);
    }
  };

  return (
    <div style={{ padding: "10px", fontFamily: "Segoe UI" }}>
      <h2>Version Control</h2>
      
      <SaveVersionForm onSave={addVersion} />

      <h3>Version History</h3>
      <Button 
        appearance="primary" 
        disabled={selectedVersions.length !== 2 || isLicenseLoading} // Disable while license loads
        onClick={() => runComparison()} // Use the new centralized function
        style={{ marginBottom: "10px" }}
      >
        {isLicenseLoading ? "Loading..." : `Compare Selected (${selectedVersions.length}/2)`}
      </Button>

      <VersionHistory 
        versions={versions} 
        selectedVersions={selectedVersions} 
        onVersionSelect={handleVersionSelect}
        onCompareToPrevious={handleCompareToPrevious}
      />
      
      {/* --- MODIFICATION START (FEAT-005) --- */}
      {/* Pass the new state and handler down to the ComparisonView */}
      {diffResult && (
        <ComparisonView 
          result={diffResult} 
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
        />
      )}
      {/* --- MODIFICATION END --- */}

      {process.env.NODE_ENV === 'development' && (
        <DeveloperTools 
          onSaveVersion={addVersion} 
          onClearHistory={clearVersions} 
          onCompare={(startIndex, endIndex) => runComparison(startIndex, endIndex)} // Use the new centralized function
        />
      )}
    </div>
  );
};

export default App;