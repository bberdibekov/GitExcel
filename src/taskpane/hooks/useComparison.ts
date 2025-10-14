// src/taskpane/hooks/useComparison.ts

import { useState, useEffect, useCallback } from "react"; 
import { IVersion, IDiffResult } from "../types/types";
import { synthesizeChangesets } from "../services/synthesizer.service";
import { debugService } from "../services/debug.service";
// --- MODIFICATION START (FEAT-005) ---
import { ILicense } from "../services/AuthService";
// --- MODIFICATION END ---

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
   * Wrapped in useCallback to stabilize its identity.
   */
  // --- MODIFICATION START (FEAT-005) ---
  const compareVersions = useCallback(async (
    license: ILicense,
    activeFilterIds: Set<string>,
    startIndex?: number, 
    endIndex?: number
  ) => {
  // --- MODIFICATION END ---
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
      // --- Pass license and filters to the synthesizer ---
      const result = synthesizeChangesets(startVersion, endVersion, versions, license, activeFilterIds);
      const description = `Comparison Result: "${startVersion.comment}" vs "${endVersion.comment}"`;
      debugService.addLogEntry(description, result);
      setDiffResult(result);
    } else {
      const description = `Comparison Failed: Could not find versions for indices ${startIndex} vs ${endIndex}`;
      debugService.addLogEntry(description, { startIndex, endIndex, selectedVersions });
    }
  }, [versions, selectedVersions]); // Dependencies for the callback

  // The auto-compare feature is removed for now, as it requires more state management.
  // Comparison will be explicitly triggered by the user in App.tsx.
  // useEffect(() => {
  //   if (selectedVersions.length === 2) {
  //     // We would need license and filters here, which complicates this hook.
  //     // compareVersions(); 
  //   }
  // }, [selectedVersions, compareVersions]);

  return {
    selectedVersions,
    diffResult,
    handleVersionSelect,
    compareVersions,
  };
}