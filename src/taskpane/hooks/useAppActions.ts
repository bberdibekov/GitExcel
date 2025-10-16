// src/taskpane/hooks/useAppActions.ts

import { useState, useCallback, useEffect } from "react";
import { IVersion } from "../types/types";
import { ILicense } from "../services/AuthService";
import { excelWriterService, IRestoreOptions } from "../services/excel.writer.service";
import { INotification } from "../components/NotificationDialog";
import { crossWindowMessageBus } from "../services/dialog/CrossWindowMessageBus";
import { MessageType, NavigateToCellPayload, RunComparisonWithFiltersPayload } from "../types/messaging.types";
import { navigateToCell } from "../services/excel.interaction.service";

const FREE_RESTORE_NUDGE_THRESHOLD = 3;

interface IAppActionsProps {
  versions: IVersion[];
  license: ILicense | null;
  lastComparedIndices: { start: number; end: number } | null;
  compareVersions: (license: ILicense, activeFilterIds: Set<string>, startIndex?: number, endIndex?: number) => void;
}

/**
 * An orchestrator hook that connects UI events and cross-window messages
 * to the core business logic contained in other hooks and services.
 */
export function useAppActions({ versions, license, lastComparedIndices, compareVersions }: IAppActionsProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<INotification | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<IVersion | null>(null);
  const [freeRestoreCount, setFreeRestoreCount] = useState(0);

  // This useEffect sets up all listeners for messages incoming from the dialog window.
  useEffect(() => {
    const unsubNavigate = crossWindowMessageBus.listen(
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

    // Add a listener for when the dialog user changes a PRO filter setting.
    const unsubRunCompare = crossWindowMessageBus.listen(
      MessageType.RUN_COMPARISON_WITH_FILTERS,
      (payload: RunComparisonWithFiltersPayload) => {
        console.log(`[TaskPane-App] Received request to re-run comparison with filters:`, payload.filterIds);
        if (!license) {
          console.error("Cannot re-run comparison: license is not available.");
          return;
        }
        if (!lastComparedIndices) {
          console.error("Cannot re-run comparison: lastComparedIndices are not available.");
          return;
        }

        const newFilters = new Set(payload.filterIds);
        
        // 1. Update the local state so the task pane's UI is in sync with the dialog.
        setActiveFilters(newFilters);
        
        // 2. Immediately trigger a new comparison using the new filters and the stored indices.
        compareVersions(license, newFilters, lastComparedIndices.start, lastComparedIndices.end);
      }
    );

    // The cleanup function unsubscribes from both listeners when the component unmounts.
    return () => {
      unsubNavigate();
      unsubRunCompare();
    };
  }, [license, lastComparedIndices, compareVersions]); // Dependencies are crucial for the listeners to have the latest state.

  const handleFilterChange = (filterId: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId);
    } else {
      newFilters.add(filterId);
    }
    setActiveFilters(newFilters);
    
    // If a comparison is already active, re-run it immediately with the new filter.
    if (lastComparedIndices) {
        if (!license) return;
        compareVersions(license, newFilters, lastComparedIndices.start, lastComparedIndices.end);
    }
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