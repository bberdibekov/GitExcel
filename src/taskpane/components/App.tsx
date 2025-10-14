// src/taskpane/components/App.tsx

import * as React from "react";
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

  // NEW: Handler for the "Compare to Previous" action emitted by VersionHistory.
  const handleCompareToPrevious = (versionId: number) => {
    // Find the index of the selected version in the original, un-reversed array.
    const currentIndex = versions.findIndex(v => v.id === versionId);
    // The previous version is simply the one at the prior index.
    const previousIndex = currentIndex - 1;
    
    // Ensure both indices are valid before triggering the comparison.
    if (currentIndex > 0 && previousIndex >= 0) {
      // Call the core logic function with specific start and end indices.
      compareVersions(previousIndex, currentIndex);
    }
  };

  return (
    <div style={{ padding: "10px", fontFamily: "Segoe UI" }}>
      <h2>Version Control</h2>
      
      <SaveVersionForm onSave={addVersion} />

      <h3>Version History</h3>
      <Button 
        appearance="primary" 
        disabled={selectedVersions.length !== 2} 
        onClick={() => compareVersions()}
        style={{ marginBottom: "10px" }}
      >
        Compare Selected ({selectedVersions.length}/2)
      </Button>

      <VersionHistory 
        versions={versions} 
        selectedVersions={selectedVersions} 
        onVersionSelect={handleVersionSelect}
        // Wire up the new event handler to its corresponding prop.
        onCompareToPrevious={handleCompareToPrevious}
      />
      
      {diffResult && <ComparisonView result={diffResult} />}

      {process.env.NODE_ENV === 'development' && (
        <DeveloperTools 
          onSaveVersion={addVersion} 
          onClearHistory={clearVersions} 
          onCompare={compareVersions}
        />
      )}
    </div>
  );
};

export default App;