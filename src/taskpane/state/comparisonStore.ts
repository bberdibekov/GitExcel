// src/taskpane/state/comparisonStore.ts

import {create} from 'zustand';
import { ViewFilter, VisiblePanel} from '../types/types';


interface IComparisonState {
  // State
  activeSheetName: string | null;
  activeViewFilter: ViewFilter;
  highlightOnlyMode: boolean;
  visiblePanel: VisiblePanel;

  // Actions
  setActiveSheet: (sheetName: string) => void;
  setViewFilter: (filter: ViewFilter) => void;
  toggleHighlightMode: () => void;
  setVisiblePanel: (panel: VisiblePanel) => void;
}

export const useComparisonStore = create<IComparisonState>((set) => ({
  // Initial State
  activeSheetName: null,
  activeViewFilter: 'all',
  highlightOnlyMode: false,
  visiblePanel: 'both',

  // Actions
  setActiveSheet: (sheetName) => set({ activeSheetName: sheetName }),
  setViewFilter: (filter) => set({ activeViewFilter: filter }),
  toggleHighlightMode: () => set((state) => ({ highlightOnlyMode: !state.highlightOnlyMode })),
  setVisiblePanel: (panel) => set({ visiblePanel: panel }),
}));