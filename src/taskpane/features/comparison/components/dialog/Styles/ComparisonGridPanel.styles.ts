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
    gridContentContainer: {
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0',
        minHeight: 0,
        paddingTop: '30px',
    },
    versionCommentOverlay: {
        position: 'absolute',
        top: '8px',
        left: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: tokens.colorNeutralForegroundOnBrand,
        padding: '2px 8px',
        borderRadius: tokens.borderRadiusMedium,
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        zIndex: 5,
        maxWidth: 'calc(100% - 16px)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
});