// src/taskpane/hooks/useComparison.ts

import { useState, useEffect, useCallback } from "react"; 
import { IVersion, IDiffResult } from "../types/types";
import { synthesizeChangesets } from "../services/synthesizer.service";
import { debugService } from "../services/debug.service";
import { ILicense } from "../services/AuthService";

/**
 * A custom hook to manage the state and logic for comparing versions.
 * @param versions
 */
export function useComparison(versions: IVersion[]) {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [diffResult, setDiffResult] = useState<IDiffResult | null>(null);
  
  // Add state to remember the indices of the versions currently being viewed.
  // This is crucial for re-running the comparison from the dialog.
  const [lastComparedIndices, setLastComparedIndices] = useState<{ start: number; end: number } | null>(null);

  const handleVersionSelect = (versionId: number) => {
    // ... (this function is unchanged)
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
    setDiffResult(null);
    setLastComparedIndices(null); // Clear the last comparison when selection changes.
  };

  const compareVersions = useCallback(async (
    license: ILicense,
    activeFilterIds: Set<string>,
    startIndex?: number, 
    endIndex?: number
  ) => {
    let startVersion: IVersion | undefined;
    let endVersion: IVersion | undefined;
    let finalStartIndex = startIndex;
    let finalEndIndex = endIndex;

    if (startIndex === undefined || endIndex === undefined) {
      if (selectedVersions.length !== 2) return;
      const sortedIds = [...selectedVersions].sort((a, b) => a - b);
      finalStartIndex = versions.findIndex(v => v.id === sortedIds[0]);
      finalEndIndex = versions.findIndex(v => v.id === sortedIds[1]);
    }

    startVersion = versions[finalStartIndex!];
    endVersion = versions[finalEndIndex!];

    if (startVersion && endVersion) {
      // Store the indices of the versions we are about to compare.
      setLastComparedIndices({ start: finalStartIndex!, end: finalEndIndex! });
      
      const result = synthesizeChangesets(startVersion, endVersion, versions, license, activeFilterIds);
      const description = `Comparison Result: "${startVersion.comment}" vs "${endVersion.comment}"`;
      debugService.addLogEntry(description, result);
      setDiffResult(result);
    } else {
      setLastComparedIndices(null); // Clear on failure.
      const description = `Comparison Failed: Could not find versions for indices ${startIndex} vs ${endIndex}`;
      debugService.addLogEntry(description, { startIndex, endIndex, selectedVersions });
    }
  }, [versions, selectedVersions]);

  return {
    selectedVersions,
    diffResult,
    lastComparedIndices,
    handleVersionSelect,
    compareVersions,
  };
}