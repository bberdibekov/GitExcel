// src/taskpane/state/appStore.ts

import { create } from 'zustand';
import { IVersion, IDiffResult, IWorkbookSnapshot } from '../types/types';
import { INotification } from '../shared/ui/NotificationDialog';
import { ILicense, authService } from '../core/services/AuthService';
import { excelWriterService, IRestoreOptions } from '../core/excel/excel.writer.service';
import { excelSnapshotService } from "../core/excel/excel.snapshot.service";
// --- STEP 2.1: Import the new workbook metadata service ---
import { workbookMetadataService } from '../core/services/workbook.metadata.service';

/**
 * Interface defining the shape of our application's core data state.
 */
export interface IAppState {
  workbookId: string | null;
  versions: IVersion[];
  selectedVersions: (number | string)[];
  diffResult: IDiffResult | null;
  startSnapshot: IWorkbookSnapshot | null;
  endSnapshot: IWorkbookSnapshot | null;
  lastComparedIndices: { start: number; end: number } | null;
  isRestoring: boolean;
  activeFilters: Set<string>;
  notification: INotification | null;
  restoreTarget: IVersion | null;
  license: ILicense | null;
  isLicenseLoading: boolean;
}

/**
 * Interface defining all the actions that can modify the core application state.
 */
export interface IAppActions {
  initializeApp: () => Promise<void>;
  fetchLicense: () => Promise<void>;
  addVersion: (comment: string) => Promise<void>;
  clearVersions: () => void;
  selectVersion: (versionId: number | string) => void;
  handleFilterChange: (filterId: string) => void;
  initiateRestore: (versionId: number) => void;
  cancelRestore: () => void;
  executeRestore: (selection: { sheets: string[]; destinations: { asNewSheets: boolean; asNewWorkbook: boolean }; }) => Promise<void>;
  clearNotification: () => void;
  _setComparisonResult: (payload: { result: IDiffResult; startSnapshot: IWorkbookSnapshot; endSnapshot: IWorkbookSnapshot; }) => void;
  clearComparison: () => void;
}


const initialState: IAppState = {
  workbookId: null,
  versions: [],
  selectedVersions: [],
  diffResult: null,
  startSnapshot: null,
  endSnapshot: null,
  lastComparedIndices: null,
  isRestoring: false,
  activeFilters: new Set(),
  notification: null,
  restoreTarget: null,
  license: null,
  isLicenseLoading: true,
};

/**
 * The Zustand store for the main application state.
 */
export const useAppStore = create<IAppState & IAppActions>((set, get) => ({
  ...initialState,

  // --- STEP 2.2: Create the main initialization action ---
  initializeApp: async () => {
    try {
      const id = await Excel.run(async (context) => {
        return await workbookMetadataService.getWorkbookId(context);
      });
      set({ workbookId: id });

      // After getting the ID, fetch the license
      await get().fetchLicense();

      // Now load the versions using the workbook-specific key
      const storageKey = `versions_${id}`;
      const savedVersionsJSON = localStorage.getItem(storageKey);
      if (savedVersionsJSON) {
        const parsedVersions = JSON.parse(savedVersionsJSON);
        set({ versions: parsedVersions });
        console.log(`[AppStore] Hydrated ${parsedVersions.length} versions from localStorage for workbook ${id}.`);
      } else {
        set({ versions: [] }); // Ensure history is empty for new workbooks
      }
    } catch (error) {
      console.error("Failed to initialize the application:", error);
      set({
        notification: {
          severity: 'error',
          title: 'Initialization Failed',
          message: 'Could not identify the workbook. Version history may be unavailable.',
        },
      });
    }
  },

  fetchLicense: async () => {
    set({ isLicenseLoading: true });
    try {
      const userLicense = await authService.getVerifiedLicense();
      set({ license: userLicense });
    } catch (error) {
      console.error("Failed to fetch license:", error);
      set({ license: null });
    } finally {
      set({ isLicenseLoading: false });
    }
  },

  // --- STEP 2.3: Modify addVersion to use the namespaced key ---
  addVersion: async (comment) => {
    const { workbookId } = get();
    if (!workbookId) {
      set({ notification: { severity: 'error', title: 'Save Failed', message: 'Cannot save version because the workbook ID is missing.' } });
      return;
    }
    if (!comment) return;
    try {
      const newSnapshot = await Excel.run(async (context) => {
        return await excelSnapshotService.createWorkbookSnapshot(context);
      });
      const newVersion: IVersion = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        comment: comment,
        snapshot: newSnapshot,
      };
      const updatedVersions = [...get().versions, newVersion];
      const storageKey = `versions_${workbookId}`; // Use the ID
      localStorage.setItem(storageKey, JSON.stringify(updatedVersions));
      set({ versions: updatedVersions });
    } catch (error) {
      console.error(`Failed to save version "${comment}":`, error);
      set({ notification: { severity: 'error', title: 'Save Failed', message: `Could not create a snapshot. ${error.message}` } });
    }
  },

  // --- STEP 2.4: Modify clearVersions to use the namespaced key ---
  clearVersions: () => {
    const { workbookId } = get();
    if (workbookId) {
      const storageKey = `versions_${workbookId}`;
      localStorage.removeItem(storageKey);
    }
    set({ versions: [], selectedVersions: [], diffResult: null, startSnapshot: null, endSnapshot: null, lastComparedIndices: null });
    console.log("[AppStore] Version history cleared for this workbook.");
  },

  selectVersion: (versionId) => {
    const currentSelection = get().selectedVersions;
    if (get().diffResult) {
      set({ diffResult: null, startSnapshot: null, endSnapshot: null, lastComparedIndices: null });
    }
    const newSelection = [...currentSelection];
    const index = newSelection.indexOf(versionId);

    if (index === -1) { newSelection.push(versionId); } else { newSelection.splice(index, 1); }
    if (newSelection.length > 2) { newSelection.shift(); }
    set({ selectedVersions: newSelection });
  },

  _setComparisonResult: (payload) => {
    set({
      diffResult: payload.result,
      startSnapshot: payload.startSnapshot,
      endSnapshot: payload.endSnapshot,
      lastComparedIndices: null,
    });
  },

  clearComparison: () => {
    set({
      diffResult: null,
      startSnapshot: null,
      endSnapshot: null,
      selectedVersions: []
    });
  },

  handleFilterChange: (filterId) => {
    const newFilters = new Set(get().activeFilters);
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId);
    } else {
      newFilters.add(filterId);
    }
    set({ activeFilters: newFilters });

    const lastComparedIndices = get().lastComparedIndices;
    if (lastComparedIndices) {
      const { comparisonWorkflowService } = require('../features/comparison/services/comparison.workflow.service');
      comparisonWorkflowService.runComparison(lastComparedIndices.start, lastComparedIndices.end);
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

      if (selection.destinations.asNewWorkbook) {
        await new Promise(resolve => setTimeout(resolve, 1500));
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