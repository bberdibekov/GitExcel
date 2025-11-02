import * as React from 'react';
import {
    Dialog,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    Button
} from "@fluentui/react-components";
import { ICombinedChange } from '../../../../types/types';
import ChangeDetailViewer from './ChangeDetailViewer';
import { useComparisonDialogStyles } from './ComparisonDialog.styles';

interface ChangeDetailModalProps {
  /** The change object to display. If null, the dialog will not show its body content. */
  change: ICombinedChange | null;
  /** Controls the visibility of the modal. */
  isOpen: boolean;
  /** Callback function to be invoked when the dialog is dismissed. */
  onClose: () => void;
}

/**
 * A self-contained modal dialog responsible for displaying the detailed
 * history of a single cell change.
 */
export const ChangeDetailModal: React.FC<ChangeDetailModalProps> = ({ change, isOpen, onClose }) => {
  const styles = useComparisonDialogStyles();

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(_event, data) => {
        if (!data.open) {
          onClose();
        }
      }}
    >
      <DialogSurface className={styles.detailModalSurface}>
        <DialogBody>
          <DialogTitle>Cell Change Detail</DialogTitle>
          {change && <ChangeDetailViewer change={change} />}
          <DialogActions>
            <Button appearance="primary" onClick={onClose}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};