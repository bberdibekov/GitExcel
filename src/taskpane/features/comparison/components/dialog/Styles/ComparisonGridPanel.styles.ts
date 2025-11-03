// src/taskpane/features/comparison/components/dialog/Styles/ComparisonGridPanel.styles.ts
import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Styles for the ComparisonGridPanel component. This component represents a single
 * side of the side-by-side diff viewer.
 */
export const useComparisonGridPanelStyles = makeStyles({
    gridColumn: {
        flex: '1 1 0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        position: 'relative',
    },
    panelHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
        // backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground2,
        fontWeight: tokens.fontWeightSemibold,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        flexShrink: 0,
    },
    gridContentContainer: {
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0',
        minHeight: 0,
    },

});