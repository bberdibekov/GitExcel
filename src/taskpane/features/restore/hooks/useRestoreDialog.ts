// src/taskpane/hooks/useRestoreDialog.ts

import { useState, useMemo, useEffect } from 'react';

/**
 * Defines the props required by the useRestoreDialog hook.
 */
interface IUseRestoreDialogProps {
  isOpen: boolean;
  tier: 'free' | 'pro';
  availableSheets: string[];
  onRestore: (selection: {
    sheets: string[];
    destinations: {
      asNewSheets: boolean;
      asNewWorkbook: boolean;
    };
  }) => void;
  // freeTierSheetLimit is no longer needed here as the logic is now 1-sheet-only.
}

/**
 * A custom hook to manage the complete state and business logic for the
 * RestoreSelectionDialog. This hook internally handles the difference between
 * a single-select mode (for free users) and multi-select mode (for pro users).
 */
export const useRestoreDialog = ({
  isOpen,
  tier,
  availableSheets,
  onRestore,
}: IUseRestoreDialogProps) => {
  // --- State Management for BOTH Modes ---
  // State for single-select mode (free users)
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  // State for multi-select mode (pro users)
  const [selectedSheetsSet, setSelectedSheetsSet] = useState(new Set<string>());
  // State for restore destinations is common to both modes
  const [destinations, setDestinations] = useState({
    asNewSheets: true,
    asNewWorkbook: false,
  });

  // --- Derived State ---
  const isSingleSelectMode = useMemo(() => tier === 'free', [tier]);

  // Reset all internal states whenever the dialog is opened.
  useEffect(() => {
    if (isOpen) {
      setSelectedSheet(null);
      setSelectedSheetsSet(new Set());
      setDestinations({ asNewSheets: true, asNewWorkbook: false });
    }
  }, [isOpen]);

  // Determine if the final "Restore" button should be enabled.
  const isRestoreButtonDisabled = useMemo(() => {
    const noSheetSelected = isSingleSelectMode
      ? selectedSheet === null
      : selectedSheetsSet.size === 0;
    const noDestinationSelected = !destinations.asNewSheets && !destinations.asNewWorkbook;
    return noSheetSelected || noDestinationSelected;
  }, [selectedSheet, selectedSheetsSet, destinations, isSingleSelectMode]);


  // --- Event Handlers ---

  // Handles sheet selection for both modes.
  const handleSheetSelect = (sheetName: string, isChecked?: boolean) => {
    if (isSingleSelectMode) {
      setSelectedSheet(sheetName);
    } else {
      // Logic for multi-select mode
      setSelectedSheetsSet(prevSelected => {
        const newSelected = new Set(prevSelected);
        if (isChecked) {
          newSelected.add(sheetName);
        } else {
          newSelected.delete(sheetName);
        }
        return newSelected;
      });
    }
  };

  // The next two handlers are only for multi-select (Pro) mode.
  const handleSelectAll = () => {
    if (isSingleSelectMode) return;
    setSelectedSheetsSet(new Set(availableSheets));
  };

  const handleDeselectAll = () => {
    if (isSingleSelectMode) return;
    setSelectedSheetsSet(new Set());
  };

  const handleDestinationChange = (key: 'asNewSheets' | 'asNewWorkbook', isChecked: boolean) => {
    setDestinations(prev => ({ ...prev, [key]: isChecked }));
  };

  // Packages the data correctly based on the mode and calls the parent's onRestore function.
  const handleConfirmRestore = () => {
    const sheetsToRestore = isSingleSelectMode
      ? selectedSheet ? [selectedSheet] : [] // Package single selection into an array
      : Array.from(selectedSheetsSet);       // Convert set to an array

    onRestore({
      sheets: sheetsToRestore,
      destinations,
    });
  };

  // --- Public API ---
  // Expose a clean, well-defined interface for the UI component.
  return {
    isSingleSelectMode,
    selectedSheet,        // For the Dropdown value
    selectedSheetsSet,    // For the Checkbox checked state
    destinations,
    isRestoreButtonDisabled,
    handleSheetSelect,
    handleSelectAll,
    handleDeselectAll,
    handleDestinationChange,
    handleConfirmRestore,
  };
};