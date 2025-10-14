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
  // Logic for managing the VERSION LIST is in useVersions.
  const { versions, addVersion, clearVersions } = useVersions();
  
  // Logic for handling COMPARISON is now in useComparison.
  // We pass it the list of versions it needs to operate on.
  const { 
    selectedVersions, 
    diffResult, 
    handleVersionSelect, 
    compareVersions 
  } = useComparison(versions);

  // This component now has NO business logic. It only renders children
  // and wires up props and event handlers. This is its single responsibility.

  return (
    <div style={{ padding: "10px", fontFamily: "Segoe UI" }}>
      <h2>Version Control</h2>
      
      <SaveVersionForm onSave={addVersion} />

      <h3>Version History</h3>
      <Button 
        appearance="primary" 
        disabled={selectedVersions.length !== 2} 
        onClick={() => compareVersions()} // <-- Call with no args for UI-driven comparison
        style={{ marginBottom: "10px" }}
      >
        Compare Selected ({selectedVersions.length}/2)
      </Button>

      <VersionHistory 
        versions={versions} 
        selectedVersions={selectedVersions} 
        onVersionSelect={handleVersionSelect}
      />
      
      {diffResult && <ComparisonView result={diffResult} />}

      {process.env.NODE_ENV === 'development' && (
        <DeveloperTools 
          onSaveVersion={addVersion} 
          onClearHistory={clearVersions} 
          onCompare={compareVersions} // <-- This is the new, critical connection
        />
      )}
    </div>
  );
};

export default App;