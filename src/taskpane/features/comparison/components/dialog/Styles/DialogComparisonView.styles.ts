import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Styles for the top-level layout of the DialogComparisonView component.
 * This file orchestrates the main regions of the dialog window, such as
 * the container for the side pane and the main content area.
 */
export const useDialogComparisonViewStyles = makeStyles({
    dialogViewContainer: {
        display: 'flex',
        flexDirection: 'row',
        height: '100vh', // Use viewport height for the dialog window
        width: '100%',
        overflow: 'hidden',
        backgroundColor: tokens.colorNeutralBackground2,
    },
    mainContentArea: {
        flex: '1 1 0',
        minWidth: 0, // Crucial for flexbox to allow shrinking
        display: 'flex',
        flexDirection: 'column',
    },
});