// src/taskpane/components/RestoreSelectionDialog.styles.ts

import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * A dedicated hook for styling the RestoreSelectionDialog component.
 * This keeps all styling logic isolated from the component's business logic and JSX.
 */
export const useDialogStyles = makeStyles({
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontWeight: tokens.fontWeightSemibold,
    display: 'block',
    marginBottom: tokens.spacingVerticalS,
  },
  sheetListContainer: {
    maxHeight: '150px',
    overflowY: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalS,
  },
  sheetListItem: {
    display: 'block',
    padding: `${tokens.spacingVerticalXS} 0`,
  },
  buttonGroup: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalS,
  },
  destinationItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalS,
  },
  limitMessage: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteRedBorderActive,
    marginTop: tokens.spacingVerticalS,
  },
});