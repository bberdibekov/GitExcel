// src/taskpane/features/comparison/components/dialog/Styles/SideBySideDiffViewer.styles.ts
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

/**
 * Styles for the SideBySideDiffViewer component.
 */
export const useSideBySideDiffViewerStyles = makeStyles({
    rootContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
    },
    isResizingGrids: {
        userSelect: 'none',
    },
    gridsBody: {
        display: 'flex',
        flex: '1 1 0',
        gap: '0px',
        padding: '8px',
        backgroundColor: tokens.colorNeutralBackground1,
        overflow: 'hidden',
        minHeight: 0,
        boxSizing: 'border-box',
        position: 'relative',
    },
    gridSeparator: {
        width: '2px',
        backgroundColor: 'transparent',
        flexShrink: 0,
        margin: '0 4px',
        cursor: 'col-resize',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '-4px',
            right: '-4px',
        },
    },
    dragHandle: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('2px'),
        color: tokens.colorNeutralForeground2,
        fontSize: '16px',
        lineHeight: '1',
    },
});