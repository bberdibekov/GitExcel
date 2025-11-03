// src/taskpane/features/comparison/components/dialog/Styles/SideBySideDiffViewer.styles.ts
import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Styles for the SideBySideDiffViewer component. This is now very minimal as
 * all controls have been moved to floating components.
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
        backgroundColor: tokens.colorBrandBackground,
        boxShadow: `0 0 8px ${tokens.colorNeutralShadowAmbient}`,
        flexShrink: 0,
        margin: '0 4px',
    },
});