// src/taskpane/components/App.tsx

import * as React from "react";
import { Button } from "@fluentui/react-components";
import { useVersions } from "../hooks/useVersions";
import { useComparison } from "../hooks/useComparison";

import SaveVersionForm from "./SaveVersionForm";
import VersionHistory from "./VersionHistory";
import ComparisonView from "./ComparisonView";
import DeveloperTools from "./DeveloperTools";

// --- PAYWALL-001 DEMO START ---
// 1. Import the new paywall components for demonstration.
import FeatureBadge from "./paywall/FeatureBadge";
import LockOverlay from "./paywall/LockOverlay";
// --- PAYWALL-001 DEMO END ---

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

      {/* --- PAYWALL-001 DEMO START --- */}
      {/* 2. Demonstrate the FeatureBadge by placing it next to a title. */}
      <h3>Version History <FeatureBadge tier="pro" /></h3>
      {/* --- PAYWALL-001 DEMO END --- */}

      <Button 
        appearance="primary" 
        disabled={selectedVersions.length !== 2} 
        onClick={() => compareVersions()}
        style={{ marginBottom: "10px" }}
      >
        Compare Selected ({selectedVersions.length}/2)
      </Button>
      
      {/* --- PAYWALL-001 DEMO START --- */}
      {/* 3. Demonstrate the LockOverlay. */}
      {/* The parent div needs `position: 'relative'` for the overlay to work. */}
      <div style={{ position: 'relative' }}>

        <LockOverlay 
          title="Unlock Full History View"
          message="Gain access to the complete version history and advanced comparison tools by upgrading your plan."
          onUpgradeClick={() => console.log('[Paywall Demo] Upgrade button was clicked!')}
        />

        <VersionHistory 
          versions={versions} 
          selectedVersions={selectedVersions} 
          onVersionSelect={handleVersionSelect}
          // Wire up the new event handler to its corresponding prop.
          onCompareToPrevious={handleCompareToPrevious}
        />

      </div>
      {/* --- PAYWALL-001 DEMO END --- */}
      
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