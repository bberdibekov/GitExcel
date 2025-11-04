// src/taskpane/state/comparisonStore.ts

import {create} from 'zustand';
import { ViewFilter, VisiblePanel} from '../types/types';

/** The types of flyout panels that can be displayed in the comparison viewer. */
export type ActiveFlyout = 'summary' | 'filters' | 'settings' | null;

interface IComparisonState {
  // State
  activeSheetName: string | null;
  activeViewFilters: Set<ViewFilter>;
  highlightOnlyMode: boolean;
  visiblePanel: VisiblePanel;
  
  activeFlyout: ActiveFlyout;
  flyoutPositions: {
    [key in NonNullable<ActiveFlyout>]?: { x: number; y: number };
  };

  // Actions
  setActiveSheet: (sheetName: string) => void;
  toggleViewFilter: (filter: ViewFilter) => void;
  toggleHighlightMode: () => void;
  setVisiblePanel: (panel: VisiblePanel) => void;
  
  setActiveFlyout: (flyout: ActiveFlyout) => void;
  setFlyoutPosition: (flyout: NonNullable<ActiveFlyout>, position: { x: number; y: number }) => void;
}

export const useComparisonStore = create<IComparisonState>((set) => ({
  // Initial State
  activeSheetName: null,
  activeViewFilters: new Set<ViewFilter>(['all']),
  highlightOnlyMode: false,
  visiblePanel: 'both',
  activeFlyout: 'summary',
  flyoutPositions: {},

  // Actions
  setActiveSheet: (sheetName) => set({ activeSheetName: sheetName }),
  
  // --- Replaced setViewFilter with toggleViewFilter ---
  toggleViewFilter: (filter) => set((state) => {
    const newFilters = new Set(state.activeViewFilters);
    
    // Exclusive 'all' logic
    if (filter === 'all') {
      return { activeViewFilters: new Set(['all']) };
    }
    newFilters.delete('all');

    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }

    // If no specific filters are left, default back to 'all'
    if (newFilters.size === 0) {
      newFilters.add('all');
    }

    return { activeViewFilters: newFilters };
  }),

  toggleHighlightMode: () => set((state) => ({ highlightOnlyMode: !state.highlightOnlyMode })),
  setVisiblePanel: (panel) => set({ visiblePanel: panel }),

  setActiveFlyout: (flyout) => set((state) => ({
    activeFlyout: state.activeFlyout === flyout ? null : flyout,
  })),

  setFlyoutPosition: (flyout, position) => set((state) => ({
    flyoutPositions: {
      ...state.flyoutPositions,
      [flyout]: position,
    },
  })),
}));