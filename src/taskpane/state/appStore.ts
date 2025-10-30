// src/taskpane/state/appStore.ts

import { create } from 'zustand';
import { IVersion, IDiffResult, IWorkbookSnapshot } from '../types/types';
import { INotification } from '../shared/ui/NotificationDialog';
import { ILicense, authService } from '../core/services/AuthService';
import { excelWriterService, IRestoreOptions } from '../core/excel/excel.writer.service';
import { excelSnapshotService } from "../core/excel/excel.snapshot.service";

/**
 * Interface defining the shape of our application's core data state.
 */
export interface IAppState {
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
 * It combines the state and actions into a single hook.
 */
export const useAppStore = create<IAppState & IAppActions>((set, get) => ({
  ...initialState,

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

  addVersion: async (comment) => {
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
      localStorage.setItem("excelVersions", JSON.stringify(updatedVersions));
      set({ versions: updatedVersions });
    } catch (error) {
        console.error(`Failed to save version "${comment}":`, error);
        set({ notification: { severity: 'error', title: 'Save Failed', message: `Could not create a snapshot. ${error.message}` } });
    }
  },

  clearVersions: () => {
    set({ versions: [], selectedVersions: [], diffResult: null, startSnapshot: null, endSnapshot: null, lastComparedIndices: null });
    console.log("[AppStore] Version history cleared.");
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
      lastComparedIndices: null, // This concept is deprecated for now
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
      // Use a dynamic require here to prevent circular dependency issues at module load time.
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

const savedVersionsJSON = localStorage.getItem("excelVersions");
if (savedVersionsJSON) {
  try {
    const parsedVersions = JSON.parse(savedVersionsJSON);
    const migratedVersions = parsedVersions.map(v => {
      delete v.changeset;
      return v;
    });
    useAppStore.setState({ versions: migratedVersions });
    console.log("[AppStore] Hydrated versions from localStorage.", migratedVersions);
  } catch (error) {
    console.error("Failed to parse versions from localStorage. Clearing stored data.", error);
    localStorage.removeItem("excelVersions");
  }
}