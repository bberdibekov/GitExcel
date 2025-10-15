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
import { useRestoreDialog } from '../hooks/useRestoreDialog';
import { useDialogStyles } from './RestoreSelectionDialog.styles';
import FeatureBadge from './paywall/FeatureBadge';

/**
 * The props for the "controlled" presentation component.
 * It no longer needs freeTierSheetLimit as the new free tier rule is "one sheet only".
 */
export interface IRestoreSelectionDialogProps {
  isOpen: boolean;
  onDismiss: () => void;
  tier: 'free' | 'pro';
  availableSheets: string[];
  onRestore: (selection: {
    sheets: string[];
    destinations: {
      asNewSheets: boolean;
      asNewWorkbook: boolean;
    };
  }) => void;
}

export const RestoreSelectionDialog: React.FC<IRestoreSelectionDialogProps> = (props) => {
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
  } = useRestoreDialog(props);

  const styles = useDialogStyles();

  if (!props.isOpen) {
    return null;
  }

  /**
   * Renders the correct sheet selection UI based on the user's tier (single-select vs. multi-select).
   */
  const renderSheetSelector = () => {
    if (isSingleSelectMode) {
      // --- RENDER DROPDOWN FOR FREE USERS ---
      return (
        <div>
          <Dropdown
            placeholder="Select a sheet to restore..."
            style={{ width: '100%' }}
            value={selectedSheet || ''}
            onOptionSelect={(_ev, data) => handleSheetSelect(data.optionValue as string)}
          >
            {props.availableSheets.map(sheetName => (
              <Option key={sheetName} value={sheetName}>
                {sheetName}
              </Option>
            ))}
          </Dropdown>
          {selectedSheet && (
            <Text block style={{ marginTop: '10px', fontStyle: 'italic' }}>
              This will restore the sheet named '{selectedSheet}'. All other sheets will not be affected.
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
            {props.availableSheets.map(sheetName => (
              <Checkbox
                key={sheetName}
                label={sheetName}
                checked={selectedSheetsSet.has(sheetName)}
                onChange={(_ev, data) => handleSheetSelect(sheetName, !!data.checked)}
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
      open={props.isOpen}
      onOpenChange={(_event, data) => {
        if (!data.open) { props.onDismiss(); }
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
            <Button appearance="secondary" onClick={props.onDismiss}>Cancel</Button>
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