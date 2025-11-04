// src/taskpane/features/comparison/components/dialog/Styles/DialogComparisonView.styles.ts

import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Styles for the top-level layout of the DialogComparisonView component.
 * This now acts as a flex container to ensure its child fills the space correctly.
 */
export const useDialogComparisonViewStyles = makeStyles({
    dialogViewContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: tokens.colorNeutralBackground2,
    },
});