// src/taskpane/hooks/useAppActions.ts

import { useState, useEffect, useCallback } from "react";
import { IVersion } from "../types/types";
import { ILicense } from "../services/AuthService";
import { excelWriterService, IRestoreOptions } from "../services/excel.writer.service";

interface IAppActionsProps {
  versions: IVersion[];
  license: ILicense | null;
  selectedVersions: number[];
  compareVersions: (license: ILicense, activeFilterIds: Set<string>, startIndex?: number, endIndex?: number) => void;
}

export function useAppActions({ versions, license, selectedVersions, compareVersions }: IAppActionsProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const handleFilterChange = (filterId: string) => {
    setActiveFilters(prevFilters => {
      const newFilters = new Set(prevFilters);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      return newFilters;
    });
  };

  const runComparison = useCallback((startIndex?: number, endIndex?: number) => {
    if (!license) return;
    compareVersions(license, activeFilters, startIndex, endIndex);
  }, [license, activeFilters, compareVersions]);

  useEffect(() => {
    if (selectedVersions.length === 2) {
      runComparison();
    }
  }, [activeFilters, selectedVersions, runComparison]);

  const handleCompareToPrevious = (versionId: number) => {
    const currentIndex = versions.findIndex(v => v.id === versionId);
    if (currentIndex > 0) {
      runComparison(currentIndex - 1, currentIndex);
    }
  };

  const handleRestoreSheets = async (versionId: number) => {
    setIsRestoring(true);
    console.log(`[AppActions] Restore requested for version ID: ${versionId}`); // This is our entry point log.
    try {
      if (license?.tier !== 'pro') {
        throw new Error("Restore blocked: User does not have a Pro license.");
      }
      const versionToRestore = versions.find(v => v.id === versionId);
      
      // --- DIAGNOSTIC LOG 2.1 ---
      // Let's see which version object the .find() method actually returned.
      console.log('[AppActions] Found version object to restore:', versionToRestore);

      if (!versionToRestore) {
        throw new Error("Could not find the selected version to restore.");
      }

      // --- DIAGNOSTIC LOG 2.2 ---
      // This is the definitive test. We'll check a key value inside the snapshot
      // before it gets sent to the writer service.
      const snapshotSampleData = versionToRestore.snapshot?.Sheet1?.data[1]?.cells[0]?.value;
      console.log(`[AppActions] Verifying snapshot data before restore. Sample value for Sheet1!A2 is:`, snapshotSampleData);

      const restoreOptions: IRestoreOptions = {
        restoreCellFormats: true,
        restoreMergedCells: true,
      };
      
      await excelWriterService.restoreWorkbookFromSnapshot(
        versionToRestore.snapshot, 
        versionToRestore.comment, 
        restoreOptions
      );
    } catch (error) {
      console.error("Failed to restore sheets:", error);
    } finally {
      setIsRestoring(false);
      console.log("[AppActions] Restore operation finished.");
    }
  };

  return {
    isRestoring,
    activeFilters,
    handleFilterChange,
    runComparison,
    handleCompareToPrevious,
    handleRestoreSheets,
  };
}