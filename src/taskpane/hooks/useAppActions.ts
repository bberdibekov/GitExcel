// src/taskpane/hooks/useAppActions.ts

import { useState, useCallback, useEffect } from "react";
import { IVersion } from "../types/types";
import { ILicense } from "../services/AuthService";
import { excelWriterService, IRestoreOptions } from "../services/excel.writer.service";
import { INotification } from "../components/NotificationDialog";
import { crossWindowMessageBus } from "../services/dialog/CrossWindowMessageBus";
import { MessageType, NavigateToCellPayload } from "../types/messaging.types";
import { navigateToCell } from "../services/excel.interaction.service";

const FREE_RESTORE_NUDGE_THRESHOLD = 3;

interface IAppActionsProps {
  versions: IVersion[];
  license: ILicense | null;
  compareVersions: (license: ILicense, activeFilterIds: Set<string>, startIndex?: number, endIndex?: number) => void;
}

export function useAppActions({ versions, license, compareVersions }: IAppActionsProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<INotification | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<IVersion | null>(null);
  const [freeRestoreCount, setFreeRestoreCount] = useState(0);

  useEffect(() => {
    const unsubscribe = crossWindowMessageBus.listen(
      MessageType.NAVIGATE_TO_CELL,
      (payload: NavigateToCellPayload) => {
        console.log(`[TaskPane-App] Received navigate request to: ${payload.sheet}!${payload.address}`);
        try {
          navigateToCell(payload.sheet, payload.address);
        } catch (error) {
          console.error("Failed to navigate from dialog message:", error);
        }
      }
    );

    return () => unsubscribe();
  }, []);

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

  const handleCompareToPrevious = (versionId: number) => {
    const currentIndex = versions.findIndex(v => v.id === versionId);
    if (currentIndex > 0) {
      runComparison(currentIndex - 1, currentIndex);
    }
  };

  const initiateRestore = (versionId: number) => {
    const versionToRestore = versions.find(v => v.id === versionId);
    if (versionToRestore) {
      setRestoreTarget(versionToRestore);
    } else {
      console.error(`[AppActions] Could not find version with ID: ${versionId}`);
    }
  };

  // ... (the rest of the file is unchanged) ...
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
        const restoreOptions: IRestoreOptions = { restoreCellFormats: true, restoreMergedCells: true };
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
        await new Promise(resolve => setTimeout(resolve, 2500));
        setNotification({
          severity: 'success',
          title: 'Restore Complete',
          message: 'Your workbook has been generated and is now downloading.',
        });
      }
      if (license?.tier === 'free' && selection.destinations.asNewSheets) {
        const newCount = freeRestoreCount + 1;
        setFreeRestoreCount(newCount);
        if (newCount === FREE_RESTORE_NUDGE_THRESHOLD) {
          setTimeout(() => {
            setNotification({
              severity: 'success',
              title: 'Pro Tip!',
              message: 'Want to restore all sheets at once? Upgrade to Pro to batch-restore entire versions.'
            });
          }, 700);
        }
      }
    } catch (error) {
      console.error("Failed to restore:", error);
      setNotification({ severity: 'error', title: 'Restore Failed', message: error.message });
    } finally {
      setIsRestoring(false);
      setRestoreTarget(null);
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