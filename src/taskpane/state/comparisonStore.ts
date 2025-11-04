// src/taskpane/state/comparisonStore.ts

import {create} from 'zustand';
import { ViewFilter, VisiblePanel} from '../types/types';

/** The types of flyout panels that can be displayed in the comparison viewer. */
export type ActiveFlyout = 'summary' | 'filters' | 'settings' | null;

interface IComparisonState {
  // State
  activeSheetName: string | null;
  activeViewFilter: ViewFilter;
  highlightOnlyMode: boolean;
  visiblePanel: VisiblePanel;
  
  activeFlyout: ActiveFlyout;
  flyoutPositions: {
    // We use a mapped type to ensure any future flyout will have a position entry.
    [key in NonNullable<ActiveFlyout>]?: { x: number; y: number };
  };

  // Actions
  setActiveSheet: (sheetName: string) => void;
  setViewFilter: (filter: ViewFilter) => void;
  toggleHighlightMode: () => void;
  setVisiblePanel: (panel: VisiblePanel) => void;
  
  /** Toggles a flyout panel. If it's already open, it will be closed. */
  setActiveFlyout: (flyout: ActiveFlyout) => void;
  /** Sets the position for a given flyout panel. */
  setFlyoutPosition: (flyout: NonNullable<ActiveFlyout>, position: { x: number; y: number }) => void;
}

export const useComparisonStore = create<IComparisonState>((set) => ({
  // Initial State
  activeSheetName: null,
  activeViewFilter: 'all',
  highlightOnlyMode: false,
  visiblePanel: 'both',
  activeFlyout: 'summary',
  flyoutPositions: {},

  // Actions
  setActiveSheet: (sheetName) => set({ activeSheetName: sheetName }),
  setViewFilter: (filter) => set({ activeViewFilter: filter }),
  toggleHighlightMode: () => set((state) => ({ highlightOnlyMode: !state.highlightOnlyMode })),
  setVisiblePanel: (panel) => set({ visiblePanel: panel }),

  setActiveFlyout: (flyout) => set((state) => ({
    // If the user clicks the button for an already-active flyout, close it.
    // Otherwise, switch to the newly requested flyout.
    activeFlyout: state.activeFlyout === flyout ? null : flyout,
  })),

  setFlyoutPosition: (flyout, position) => set((state) => ({
    flyoutPositions: {
      ...state.flyoutPositions,
      [flyout]: position,
    },
  })),
}));