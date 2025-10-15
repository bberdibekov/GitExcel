// src/taskpane/hooks/useVersions.ts

import { useState, useEffect } from "react";
import { IVersion } from "../types/types";
import { createWorkbookSnapshot } from "../services/excel.service";

// The diff.service is no longer needed here as we are not pre-computing changesets.
// import { diffSnapshots } from "../services/diff.service"; 

export function useVersions() {
  const [versions, setVersions] = useState<IVersion[]>([]);

  // Load initial data from local storage
  useEffect(() => {
    const savedVersions = localStorage.getItem("excelVersions");
    console.log("[useVersions Hook] Raw data from localStorage:", savedVersions);
    if (savedVersions) {
      try {
        const parsedVersions = JSON.parse(savedVersions);
        console.log("[useVersions Hook] Parsed versions from localStorage:", parsedVersions);
        // Simple migration: if old versions have a 'changeset', remove it.
        // This ensures data consistency moving forward.
        const migratedVersions = parsedVersions.map(v => {
          delete v.changeset;
          return v;
        });
        setVersions(migratedVersions);
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

        
        // We no longer pre-compute the changeset. It will be computed on-demand
        // by the synthesizer service when a comparison is requested.
        const newVersion: IVersion = {
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          comment: comment,
          snapshot: newSnapshot,
          // changeset property is now removed from the IVersion object.
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