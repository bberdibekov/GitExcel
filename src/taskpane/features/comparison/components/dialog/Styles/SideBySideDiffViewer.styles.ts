import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Styles for the SideBySideDiffViewer component. This includes the main
 * container for the two grids, the control bar at the top (with tabs and switches),
 * and the headers for each version panel.
 */
export const useSideBySideDiffViewerStyles = makeStyles({
    rootContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh', // Take full viewport height
        overflow: 'hidden',
    },
    controlsBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        flexShrink: 0,
    },
    highlightModeToggle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    gridsBody: {
        display: 'flex',
        flex: '1 1 0',
        gap: '0px',
        padding: '8px',
        backgroundColor: tokens.colorNeutralBackground1,
        overflow: 'hidden',
        minHeight: 0,
    },
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
    },
    gridSeparator: {
        width: '2px',
        backgroundColor: tokens.colorBrandBackground,
        boxShadow: `0 0 8px ${tokens.colorNeutralShadowAmbient}`,
        flexShrink: 0,
        margin: '0 4px',
    },
    gridPanelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        marginBottom: '4px',
    },
    versionTitle: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flexShrink: 0,
        marginBottom: '4px',
    },
});