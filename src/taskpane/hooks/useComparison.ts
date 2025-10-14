// src/taskpane/hooks/useComparison.ts

import { useState, useEffect, useCallback } from "react"; // Import useEffect and useCallback
import { IVersion, IDiffResult } from "../types/types";
import { synthesizeChangesets } from "../services/synthesizer.service";
import { debugService } from "../services/debug.service";

/**
 * A custom hook to manage the state and logic for comparing versions.
 * @param versions
 */
export function useComparison(versions: IVersion[]) {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [diffResult, setDiffResult] = useState<IDiffResult | null>(null);

  /**
   * Handles toggling the selection of a version for comparison.
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
    setDiffResult(null);
  };

  /**
   * The core business logic for running a comparison.
   * Wrapped in useCallback to stabilize its identity for the useEffect hook.
   * This prevents the effect from running on every render.
   */
  const compareVersions = useCallback(async (startIndex?: number, endIndex?: number) => {
    let startVersion: IVersion | undefined;
    let endVersion: IVersion | undefined;

    if (startIndex !== undefined && endIndex !== undefined) {
      startVersion = versions[startIndex];
      endVersion = versions[endIndex];
    } else {
      if (selectedVersions.length !== 2) return;
      const sortedIds = [...selectedVersions].sort((a, b) => a - b);
      startVersion = versions.find(v => v.id === sortedIds[0]);
      endVersion = versions.find(v => v.id === sortedIds[1]);
    }

    if (startVersion && endVersion) {
      const result = synthesizeChangesets(startVersion, endVersion, versions);
      const description = `Comparison Result: "${startVersion.comment}" vs "${endVersion.comment}"`;
      debugService.addLogEntry(description, result);
      setDiffResult(result);
    } else {
      const description = `Comparison Failed: Could not find versions for indices ${startIndex} vs ${endIndex}`;
      debugService.addLogEntry(description, { startIndex, endIndex, selectedVersions });
    }
  }, [versions, selectedVersions]); // Dependencies for the callback

  // A useEffect hook to implement the "auto-compare" feature.
  // It runs whenever the selection changes.
  useEffect(() => {
    // If exactly two versions are selected, run the comparison automatically.
    if (selectedVersions.length === 2) {
      compareVersions();
    }
  }, [selectedVersions, compareVersions]); // It depends on the selection and the compare function itself.

  return {
    selectedVersions,
    diffResult,
    handleVersionSelect,
    compareVersions,
  };
}