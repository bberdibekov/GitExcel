// src/taskpane/hooks/useAppActions.ts

import { useState, useEffect, useCallback } from "react";
import { IVersion } from "../types/types";
import { ILicense } from "../services/AuthService";
import { excelWriterService, IRestoreOptions } from "../services/excel.writer.service";
import { NotificationSeverity } from "../components/Notification"; // Import severity type

// Define the shape of our generic notification state
interface INotification {
  severity: NotificationSeverity;
  message: string;
  title: string;
}

interface IAppActionsProps {
  versions: IVersion[];
  license: ILicense | null;
  selectedVersions: number[];
  compareVersions: (license: ILicense, activeFilterIds: Set<string>, startIndex?: number, endIndex?: number) => void;
}

export function useAppActions({ versions, license, selectedVersions, compareVersions }: IAppActionsProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  // Use a structured notification object for state
  const [notification, setNotification] = useState<INotification | null>(null);

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
    // Clear any previous notifications when starting a new operation
    setNotification(null);
    setIsRestoring(true);
    console.log(`[AppActions] Restore requested for version ID: ${versionId}`);
    try {
      if (license?.tier !== 'pro') {
        throw new Error("Restore blocked: User does not have a Pro license.");
      }
      const versionToRestore = versions.find(v => v.id === versionId);
      if (!versionToRestore) {
        throw new Error("Could not find the selected version to restore.");
      }

      // --- Proactive Sheet Name Check ---
      const firstSheetName = Object.keys(versionToRestore.snapshot)[0];
      if (firstSheetName) {
        const prospectiveSheetName = excelWriterService.generateSheetName(firstSheetName, versionToRestore.comment);
        const isConflict = await excelWriterService.isSheetNameTaken(prospectiveSheetName);
        if (isConflict) {
          // If the sheet exists, throw a user-friendly error. This stops the process.
          throw new Error(`A sheet named "${prospectiveSheetName}" already exists. Please rename or delete the existing sheet and try again.`);
        }
      }

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
      // Set a structured notification object for the UI to display
      setNotification({
        severity: 'error',
        title: 'Restore Failed',
        message: error.message,
      });
    } finally {
      setIsRestoring(false);
      console.log("[AppActions] Restore operation finished.");
    }
  };

  // A function to allow the UI to dismiss the notification
  const clearNotification = () => setNotification(null);

  return {
    isRestoring,
    activeFilters,
    notification,       // Expose the new notification object
    clearNotification,  // Expose the handler to clear it
    handleFilterChange,
    runComparison,
    handleCompareToPrevious,
    handleRestoreSheets,
  };
}