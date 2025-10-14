// src/taskpane/hooks/useVersions.ts

import { useState, useEffect } from "react";
import { IVersion } from "../types/types";
import { createWorkbookSnapshot } from "../services/excel.service";
import { diffSnapshots } from "../services/diff.service";

export function useVersions() {
  const [versions, setVersions] = useState<IVersion[]>([]);

  // Load initial data from local storage
  useEffect(() => {
    const savedVersions = localStorage.getItem("excelVersions");
    if (savedVersions) {
      try {
        setVersions(JSON.parse(savedVersions));
      } catch (error) {
        console.error("Failed to parse versions from localStorage. The data may be corrupt or from an older version of the add-in. Clearing stored data.", error);
        // If parsing fails, clear the bad data and start fresh.
        localStorage.removeItem("excelVersions");
        setVersions([]);
      }
    }
  }, []);

  /**
   * This function is safe to be called in rapid succession
   * because it uses a functional update to access the most recent state.
   */
  const addVersion = async (comment: string) => {
    if (!comment) return;
    
    try {
      // Step 1: Perform all async operations that don't depend on the current state.
      const newSnapshot = await createWorkbookSnapshot();

      // Step 2: Use the functional update form of setVersions.
      // 'currentVersions' is guaranteed by React to be the most up-to-date state.
      setVersions(currentVersions => {
        console.log(`[useVersions] Saving "${comment}". Previous version count: ${currentVersions.length}`);

        // Get the most recent version from the guaranteed-fresh state.
        const lastVersion = currentVersions.length > 0 ? currentVersions[currentVersions.length - 1] : null;

        const newVersion: IVersion = {
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          comment: comment,
          snapshot: newSnapshot,
          changeset: lastVersion ? diffSnapshots(lastVersion.snapshot, newSnapshot) : undefined,
        };

        const updatedVersions = [...currentVersions, newVersion];
        
        // Persist the new list to localStorage.
        localStorage.setItem("excelVersions", JSON.stringify(updatedVersions));
        
        // Return the new state for React to set.
        return updatedVersions;
      });
    } catch (error) {
      console.error(`Failed to save version "${comment}":`, error);
    }
  };

  const clearVersions = () => {
    setVersions([]);
    localStorage.removeItem("excelVersions");
    console.log("[useVersions] Version history cleared.");
  };

  return {
    versions,
    addVersion,
    clearVersions,
  };
}