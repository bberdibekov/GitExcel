// src/taskpane/hooks/useComparison.ts

// 1. Add useRef and useEffect to the React import
import { useState, useEffect, useCallback, useRef } from "react"; 
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
  
  const [lastComparedIndices, setLastComparedIndices] = useState<{ start: number; end: number } | null>(null);

  // 2. Create a ref to hold the latest versions array.
  const versionsRef = useRef(versions);
  
  // This effect ensures the ref is always up-to-date after every render.
  useEffect(() => {
    versionsRef.current = versions;
  }, [versions]);

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
    setLastComparedIndices(null);
  };

  const compareVersions = useCallback(async (
    license: ILicense,
    activeFilterIds: Set<string>,
    startIndex?: number, 
    endIndex?: number
  ) => {
    // 3. Read from the ref's .current property to get the FRESH array.
    const currentVersions = versionsRef.current;
    console.log(`[useComparison] Firing compareVersions. Versions array length in this closure: ${currentVersions.length}`);

    let startVersion: IVersion | undefined;
    let endVersion: IVersion | undefined;
    let finalStartIndex = startIndex;
    let finalEndIndex = endIndex;

    if (startIndex === undefined || endIndex === undefined) {
      if (selectedVersions.length !== 2) return;
      const sortedIds = [...selectedVersions].sort((a, b) => a - b);
      finalStartIndex = currentVersions.findIndex(v => v.id === sortedIds[0]);
      finalEndIndex = currentVersions.findIndex(v => v.id === sortedIds[1]);
    }

    startVersion = currentVersions[finalStartIndex!];
    endVersion = currentVersions[finalEndIndex!];

    if (startVersion && endVersion) {
      setLastComparedIndices({ start: finalStartIndex!, end: finalEndIndex! });
      
      const result = synthesizeChangesets(startVersion, endVersion, currentVersions, license, activeFilterIds);
      const description = `Comparison Result: "${startVersion.comment}" vs "${endVersion.comment}"`;
      debugService.addLogEntry(description, result);
      setDiffResult(result);
    } else {
      setLastComparedIndices(null);
      const description = `Comparison Failed: Could not find versions for indices ${startIndex} vs ${endIndex}`;
      debugService.addLogEntry(description, { startIndex, endIndex, selectedVersions });
    }
  // 4. IMPORTANT: Remove `versions` from the dependency array. The function no longer
  //    depends on the `versions` from its closure; it uses the ref instead.
  }, [selectedVersions]);

  return {
    selectedVersions,
    diffResult,
    lastComparedIndices,
    handleVersionSelect,
    compareVersions,
  };
}