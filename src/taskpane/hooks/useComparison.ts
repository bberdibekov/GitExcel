// src/taskpane/hooks/useComparison.ts

import { useState } from "react";
import { IVersion, IDiffResult } from "../types/types";
import { synthesizeChangesets } from "../services/synthesizer.service";
import { debugService } from "../services/debug.service"; // <-- 1. Import the debug service

/**
 * A custom hook to manage the state and logic for comparing versions.
 * @param versions - The complete list of all available versions.
 */
export function useComparison(versions: IVersion[]) {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [diffResult, setDiffResult] = useState<IDiffResult | null>(null);

  /**
   * Handles toggling the selection of a version for comparison.
   * Manages a queue of up to 2 selected versions.
   */
  const handleVersionSelect = (versionId: number) => {
    const newSelection = [...selectedVersions];
    const currentIndex = newSelection.indexOf(versionId);
    if (currentIndex === -1) {
      newSelection.push(versionId);
    } else {
      newSelection.splice(currentIndex, 1);
    }
    if (newSelection.length > 2) {
      newSelection.shift();
    }
    setSelectedVersions(newSelection);
    setDiffResult(null); // Clear old results whenever the selection changes.
  };

  /**
   * The core business logic for running a comparison.
   * This function can now be called in two ways:
   * 1. With no arguments (from the UI), it uses the selected versions.
   * 2. With indices (from the test harness), it uses the specified versions.
   */
  const compareVersions = async (startIndex?: number, endIndex?: number) => {
    let startVersion: IVersion | undefined;
    let endVersion: IVersion | undefined;

    // --- 2. Determine which versions to compare ---
    if (startIndex !== undefined && endIndex !== undefined) {
      // Programmatic call from the test harness (using array indices)
      startVersion = versions[startIndex];
      endVersion = versions[endIndex];
    } else {
      // UI-driven call (using version IDs stored in state)
      if (selectedVersions.length !== 2) return;
      const sortedIds = [...selectedVersions].sort((a, b) => a - b);
      startVersion = versions.find(v => v.id === sortedIds[0]);
      endVersion = versions.find(v => v.id === sortedIds[1]);
    }

    if (startVersion && endVersion) {
      // --- 3. Run the synthesis and log the result ---
      const result = synthesizeChangesets(startVersion, endVersion, versions);
      
      const description = `Comparison Result: "${startVersion.comment}" vs "${endVersion.comment}"`;
      debugService.addLogEntry(description, result);
      
      setDiffResult(result);
    } else {
        const description = `Comparison Failed: Could not find versions for indices ${startIndex} vs ${endIndex}`;
        debugService.addLogEntry(description, { startIndex, endIndex, selectedVersions });
    }
  };

  // Return the state and the handlers for the UI component to use.
  return {
    selectedVersions,
    diffResult,
    handleVersionSelect,
    compareVersions,
  };
}