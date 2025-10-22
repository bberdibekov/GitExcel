// src/taskpane/state/appStore.ts

import { create } from 'zustand'; // <-- CORRECTED IMPORT
import { IVersion, IDiffResult } from '../types/types';
import { INotification } from '../components/NotificationDialog';
import { ILicense, authService } from '../services/AuthService';
import { createWorkbookSnapshot } from '../services/excel.service';
import { synthesizeChangesets } from '../services/synthesizer.service';
import { excelWriterService, IRestoreOptions } from '../services/excel.writer.service';
import { debugService } from '../services/debug.service';

/**
 * Interface defining the shape of our application's state.
 */
export interface IAppState {
  // From useVersions
  versions: IVersion[];
  // From useComparison
  selectedVersions: number[];
  diffResult: IDiffResult | null;
  lastComparedIndices: { start: number; end: number } | null;
  // From useAppActions
  isRestoring: boolean;
  activeFilters: Set<string>;
  notification: INotification | null;
  restoreTarget: IVersion | null;
  // From UserContext
  license: ILicense | null;
  isLicenseLoading: boolean;
}

/**
 * Interface defining all the actions that can modify the state.
 */
export interface IAppActions {
  fetchLicense: () => Promise<void>;
  addVersion: (comment: string) => Promise<void>;
  clearVersions: () => void;
  selectVersion: (versionId: number) => void;
  runComparison: (startIndex?: number, endIndex?: number) => void;
  compareWithPrevious: (versionId: number) => void;
  handleFilterChange: (filterId: string) => void;
  initiateRestore: (versionId: number) => void;
  cancelRestore: () => void;
  executeRestore: (selection: {
    sheets: string[];
    destinations: { asNewSheets: boolean; asNewWorkbook: boolean };
  }) => Promise<void>;
  clearNotification: () => void;
}

/**
 * The initial, default state of the application.
 */
const initialState: IAppState = {
  versions: [],
  selectedVersions: [],
  diffResult: null,
  lastComparedIndices: null,
  isRestoring: false,
  activeFilters: new Set(),
  notification: null,
  restoreTarget: null,
  license: null,
  isLicenseLoading: true,
};

/**
 * The Zustand store.
 * It combines the state and actions into a single hook.
 * `set` is used to update state.
 * `get` is used to access the current state within an action.
 */
export const useAppStore = create<IAppState & IAppActions>((set, get) => ({
  ...initialState,

  // --- License Actions (from UserContext) ---
  fetchLicense: async () => {
    set({ isLicenseLoading: true });
    try {
      const userLicense = await authService.getVerifiedLicense();
      set({ license: userLicense });
    } catch (error) {
      console.error("Failed to fetch license:", error);
      set({ license: null }); // Default to free tier on error
    } finally {
      set({ isLicenseLoading: false });
    }
  },

  // --- Version Actions (from useVersions) ---
  addVersion: async (comment) => {
    if (!comment) return;
    try {
      const newSnapshot = await createWorkbookSnapshot();
      const newVersion: IVersion = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        comment: comment,
        snapshot: newSnapshot,
      };
      const updatedVersions = [...get().versions, newVersion];
      localStorage.setItem("excelVersions", JSON.stringify(updatedVersions));
      set({ versions: updatedVersions });
    } catch (error) {
        console.error(`Failed to save version "${comment}":`, error);
        set({ notification: { severity: 'error', title: 'Save Failed', message: `Could not create a snapshot. ${error.message}` } });
    }
  },

  clearVersions: () => {
    localStorage.removeItem("excelVersions");
    set({ versions: [], selectedVersions: [], diffResult: null, lastComparedIndices: null });
    console.log("[AppStore] Version history cleared.");
  },

  // --- Comparison Actions (from useComparison) ---
  selectVersion: (versionId) => {
    const currentSelection = get().selectedVersions;
    const newSelection = [...currentSelection];
    const index = newSelection.indexOf(versionId);

    if (index === -1) {
      newSelection.push(versionId);
    } else {
      newSelection.splice(index, 1);
    }
    // Ensure only the two most recent selections are kept
    if (newSelection.length > 2) {
      newSelection.shift();
    }
    set({ selectedVersions: newSelection, diffResult: null, lastComparedIndices: null });
  },

  runComparison: (startIndex, endIndex) => {
    const { versions, selectedVersions, license, activeFilters } = get();
    let finalStartIndex = startIndex;
    let finalEndIndex = endIndex;

    // If indices aren't provided, derive them from user selection
    if (finalStartIndex === undefined || finalEndIndex === undefined) {
      if (selectedVersions.length !== 2) return;
      const sortedIds = [...selectedVersions].sort((a, b) => a - b);
      finalStartIndex = versions.findIndex(v => v.id === sortedIds[0]);
      finalEndIndex = versions.findIndex(v => v.id === sortedIds[1]);
    }
    
    const startVersion = versions[finalStartIndex!];
    const endVersion = versions[finalEndIndex!];

    if (startVersion && endVersion && license) {
      set({ diffResult: null }); // Show loading state immediately
      const result = synthesizeChangesets(startVersion, endVersion, versions, license, activeFilters);
      debugService.addLogEntry(`Comparison Ran: "${startVersion.comment}" vs "${endVersion.comment}"`, result);
      set({ diffResult: result, lastComparedIndices: { start: finalStartIndex!, end: finalEndIndex! } });
    }
  },

  compareWithPrevious: (versionId) => {
    const versions = get().versions;
    const currentIndex = versions.findIndex(v => v.id === versionId);
    if (currentIndex > 0) {
      get().runComparison(currentIndex - 1, currentIndex);
    }
  },

  // --- App Logic Actions (from useAppActions) ---
  handleFilterChange: (filterId) => {
    const newFilters = new Set(get().activeFilters);
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId);
    } else {
      newFilters.add(filterId);
    }
    set({ activeFilters: newFilters });

    // If a comparison is already active, re-run it with the new filter.
    const lastComparedIndices = get().lastComparedIndices;
    if (lastComparedIndices) {
      get().runComparison(lastComparedIndices.start, lastComparedIndices.end);
    }
  },

  initiateRestore: (versionId) => {
    const versionToRestore = get().versions.find(v => v.id === versionId);
    if (versionToRestore) {
      set({ restoreTarget: versionToRestore });
    }
  },

  cancelRestore: () => {
    set({ restoreTarget: null });
  },

  executeRestore: async (selection) => {
    const restoreTarget = get().restoreTarget;
    if (!restoreTarget) return;

    set({ isRestoring: true, notification: null });
    try {
      const restoreOptions: IRestoreOptions = { restoreCellFormats: true, restoreMergedCells: true };
      
      if (selection.destinations.asNewSheets) {
        await excelWriterService.restoreWorkbookFromSnapshot(
          restoreTarget.snapshot,
          restoreTarget.comment,
          restoreOptions,
          selection.sheets
        );
      }
      
      // Placeholder for "as new workbook" PRO feature
      if (selection.destinations.asNewWorkbook) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate generation
      }
      
      set({ notification: { severity: 'success', title: 'Restore Complete', message: 'The selected sheets have been restored as new worksheets.' } });
    } catch (error) {
      console.error("Failed to restore:", error);
      set({ notification: { severity: 'error', title: 'Restore Failed', message: error.message } });
    } finally {
      set({ isRestoring: false, restoreTarget: null });
    }
  },

  clearNotification: () => {
    set({ notification: null });
  },
}));

// --- Initial Data Hydration ---
// This runs once when the app loads, pulling saved versions from localStorage.
const savedVersionsJSON = localStorage.getItem("excelVersions");
if (savedVersionsJSON) {
  try {
    const parsedVersions = JSON.parse(savedVersionsJSON);
    // Simple migration: if old versions have a 'changeset', remove it.
    // This ensures data consistency with the new on-demand diffing strategy.
    const migratedVersions = parsedVersions.map(v => {
      delete v.changeset;
      return v;
    });
    // Set the initial state of the store
    useAppStore.setState({ versions: migratedVersions });
    console.log("[AppStore] Hydrated versions from localStorage.", migratedVersions);
  } catch (error) {
    console.error("Failed to parse versions from localStorage. Clearing stored data.", error);
    localStorage.removeItem("excelVersions");
  }
}