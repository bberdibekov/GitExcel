// src/taskpane/components/RestoreSelectionDialog.tsx

import * as React from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  Button,
  Checkbox,
  Label,
  Tooltip,
  Text,
  Dropdown,
  Option,
} from '@fluentui/react-components';

// --- Local Hook and Style Imports ---
import { useRestoreDialog } from '../hooks/useRestoreDialog';
import { useDialogStyles } from './RestoreSelectionDialog.styles';
import FeatureBadge from '../../../shared/paywall/FeatureBadge';

// --- STEP 1: Import the central Zustand store ---
import { useAppStore } from '../../../state/appStore';

/**
 * The props for this component are now empty. It gets all its data
 * and actions directly from the Zustand store, making it a self-managing component.
 */
export interface IRestoreSelectionDialogProps {
  // No props are needed after refactoring to Zustand.
}

export const RestoreSelectionDialog: React.FC<IRestoreSelectionDialogProps> = () => {
  // --- STEP 2: Select all necessary state and actions from the store ---
  const { restoreTarget, license, cancelRestore, executeRestore } = useAppStore();

  // --- STEP 3: Derive constants and variables from the store's state ---
  // The dialog's visibility is determined by whether a `restoreTarget` exists.
  const isOpen = !!restoreTarget;
  const tier = license?.tier ?? 'free';
  const availableSheets = restoreTarget ? Object.keys(restoreTarget.snapshot) : [];

  // Create a lookup map to get the display name from the persistent sheet ID.
  // This memo ensures the map is only recalculated when the restoreTarget changes.
  const sheetIdToNameMap = React.useMemo(() => {
    if (!restoreTarget) return {};
    return Object.entries(restoreTarget.snapshot).reduce((acc, [id, sheet]) => {
        acc[id] = sheet.name;
        return acc;
    }, {} as { [id: string]: string });
  }, [restoreTarget]);

  // --- The component uses its dedicated logic hook for its internal UI state ---
  // We feed the hook with data pulled from the central store.
  const {
    isSingleSelectMode,
    selectedSheet,
    selectedSheetsSet,
    destinations,
    isRestoreButtonDisabled,
    handleSheetSelect,
    handleSelectAll,
    handleDeselectAll,
    handleDestinationChange,
    handleConfirmRestore,
  } = useRestoreDialog({
    isOpen,
    tier,
    availableSheets,
    onRestore: executeRestore, // The hook calls the central store's action on confirm.
  });

  const styles = useDialogStyles();

  // If there's no restore target, the component renders nothing.
  if (!isOpen) {
    return null;
  }

  /**
   * Renders the correct sheet selection UI based on the user's tier.
   */
  const renderSheetSelector = () => {
    if (isSingleSelectMode) {
      // --- RENDER DROPDOWN FOR FREE USERS ---
      return (
        <div>
          <Dropdown
            placeholder="Select a sheet to restore..."
            style={{ width: '100%' }}
            value={selectedSheet ? sheetIdToNameMap[selectedSheet] : ''}
            onOptionSelect={(_ev, data) => handleSheetSelect(data.optionValue as string)}
          >
            {availableSheets.map(sheetId => (
              // Use the ID for the key/value, but the mapped name for the display text.
              <Option key={sheetId} value={sheetId}>
                {sheetIdToNameMap[sheetId]}
              </Option>
            ))}
          </Dropdown>
          {selectedSheet && (
            <Text block style={{ marginTop: '10px', fontStyle: 'italic' }}>
              {/* Use the map to show the correct sheet name in the confirmation text. */}
              This will restore the sheet named '{sheetIdToNameMap[selectedSheet]}'. All other sheets will not be affected.
            </Text>
          )}
        </div>
      );
    } else {
      // --- RENDER CHECKBOX LIST FOR PRO USERS ---
      return (
        <>
          <div className={styles.buttonGroup}>
            <Button size="small" onClick={handleSelectAll}>Select All</Button>
            <Button size="small" onClick={handleDeselectAll}>Deselect All</Button>
          </div>
          <div className={styles.sheetListContainer}>
            {availableSheets.map(sheetId => (
              <Checkbox
                key={sheetId}
                // Use the mapped name for the label. The underlying logic still uses the ID.
                label={sheetIdToNameMap[sheetId]}
                checked={selectedSheetsSet.has(sheetId)}
                onChange={(_ev, data) => handleSheetSelect(sheetId, !!data.checked)}
                className={styles.sheetListItem}
              />
            ))}
          </div>
        </>
      );
    }
  };

  const renderNewWorkbookOption = () => {
    const isPro = !isSingleSelectMode;
    const checkbox = (
      <Checkbox
        label="Create a new workbook file"
        checked={isPro && destinations.asNewWorkbook}
        disabled={!isPro}
        onChange={(_ev, data) => handleDestinationChange('asNewWorkbook', !!data.checked)}
      />
    );

    if (!isPro) {
      return (
        <Tooltip content="Upgrade to Pro to restore to a new workbook file" relationship="label">
          <div className={styles.destinationItem}>
            {checkbox}
            <FeatureBadge tier="pro" />
          </div>
        </Tooltip>
      );
    }
    return (
      <div className={styles.destinationItem}>
        {checkbox}
        <FeatureBadge tier="pro" />
      </div>
    );
  };

  return (
    <Dialog
      modalType="modal"
      open={isOpen}
      onOpenChange={(_event, data) => {
        // --- STEP 4: Call the store's action on dismiss ---
        if (!data.open) {
          cancelRestore();
        }
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Restore Options</DialogTitle>

          <div className={styles.section}>
            <Label className={styles.sectionTitle}>1. Select sheet(s) to restore</Label>
            {renderSheetSelector()}
          </div>

          <div className={styles.section}>
            <Label className={styles.sectionTitle}>2. Choose where to restore</Label>
            <div className={styles.destinationItem}>
              <Checkbox
                label="Restore as new sheets in this workbook"
                checked={destinations.asNewSheets}
                onChange={(_ev, data) => handleDestinationChange('asNewSheets', !!data.checked)}
              />
            </div>
            {renderNewWorkbookOption()}
          </div>

          <DialogActions>
            {/* --- STEP 5: Call the store's action on cancel --- */}
            <Button appearance="secondary" onClick={cancelRestore}>Cancel</Button>
            <Button
              appearance="primary"
              disabled={isRestoreButtonDisabled}
              onClick={handleConfirmRestore}
            >
              Restore
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};