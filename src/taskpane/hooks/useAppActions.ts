// src/taskpane/hooks/useAppActions.ts

import { useState, useCallback } from "react"; // Removed useEffect as it's no longer used
import { IVersion } from "../types/types";
import { ILicense } from "../services/AuthService";
import { excelWriterService, IRestoreOptions } from "../services/excel.writer.service";
import { INotification } from "../components/NotificationDialog";

// --- Define the threshold for the upgrade nudge ---
const FREE_RESTORE_NUDGE_THRESHOLD = 3;

interface IAppActionsProps {
  versions: IVersion[];
  license: ILicense | null;
  selectedVersions: number[];
  compareVersions: (license: ILicense, activeFilterIds: Set<string>, startIndex?: number, endIndex?: number) => void;
}

export function useAppActions({ versions, license, selectedVersions, compareVersions }: IAppActionsProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<INotification | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<IVersion | null>(null);
  // --- Session-based counter for the freemium nudge ---
  const [freeRestoreCount, setFreeRestoreCount] = useState(0);

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
    // Auto-comparison logic is removed for now, comparison is explicit.
    // if (selectedVersions.length === 2) {
      compareVersions(license, activeFilters, startIndex, endIndex);
    // }
  }, [license, activeFilters, compareVersions, selectedVersions]);

  const handleCompareToPrevious = (versionId: number) => {
    const currentIndex = versions.findIndex(v => v.id === versionId);
    if (currentIndex > 0) {
      // Logic to select the versions should be in useComparison, for now just run it
      runComparison(currentIndex - 1, currentIndex);
    }
  };

  const initiateRestore = (versionId: number) => {
    const versionToRestore = versions.find(v => v.id === versionId);
    if (versionToRestore) {
      setRestoreTarget(versionToRestore);
    } else {
      console.error(`[AppActions] Could not find version with ID: ${versionId}`);
      setNotification({
        severity: 'error',
        title: 'An Error Occurred',
        message: 'The selected version could not be found.',
      });
    }
  };

  const cancelRestore = () => {
    setRestoreTarget(null);
  };

  const executeRestore = async (selection: {
    sheets: string[];
    destinations: { asNewSheets: boolean; asNewWorkbook: boolean };
  }) => {
    if (!restoreTarget) {
      console.error("ExecuteRestore called without a valid restore target.");
      return;
    }

    setNotification(null);
    setIsRestoring(true);

    try {
      if (selection.destinations.asNewSheets) {
        console.log(`[AppActions] Restoring sheets for version ID: ${restoreTarget.id}`);
        const restoreOptions: IRestoreOptions = {
          restoreCellFormats: true,
          restoreMergedCells: true,
        };
        await excelWriterService.restoreWorkbookFromSnapshot(
          restoreTarget.snapshot,
          restoreTarget.comment,
          restoreOptions,
          selection.sheets
        );
      }

      if (selection.destinations.asNewWorkbook) {
        if (license?.tier !== 'pro') {
          throw new Error("Creating a new workbook is a Pro feature.");
        }
        console.log(`[AppActions] Simulating workbook creation for version ID: ${restoreTarget.id}`);
        await new Promise(resolve => setTimeout(resolve, 2500));
        setNotification({
          severity: 'success',
          title: 'Restore Complete',
          message: 'Your workbook has been generated and is now downloading.',
        });
      }

      // --- Upgrade Nudge Logic ---
      if (license?.tier === 'free' && selection.destinations.asNewSheets) {
        const newCount = freeRestoreCount + 1;
        setFreeRestoreCount(newCount);
        if (newCount === FREE_RESTORE_NUDGE_THRESHOLD) {
          // Use setTimeout to show the nudge slightly after the main operation feels complete.
          setTimeout(() => {
            setNotification({
              severity: 'success', // Using 'success' to feel like a helpful tip, not a warning
              title: 'Pro Tip!',
              message: 'Want to restore all sheets at once? Upgrade to Pro to batch-restore entire versions.'
            });
          }, 700);
        }
      }

    } catch (error) {
      console.error("Failed to restore:", error);
      setNotification({
        severity: 'error',
        title: 'Restore Failed',
        message: error.message,
      });
    } finally {
      setIsRestoring(false);
      setRestoreTarget(null);
      console.log("[AppActions] Restore operation finished.");
    }
  };

  const clearNotification = () => setNotification(null);

  return {
    isRestoring,
    activeFilters,
    notification,
    restoreTarget,
    clearNotification,
    handleFilterChange,
    runComparison,
    handleCompareToPrevious,
    initiateRestore,
    cancelRestore,
    executeRestore,
  };
}