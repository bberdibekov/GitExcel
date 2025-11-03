import { makeStyles, tokens } from '@fluentui/react-components';

/**
 * Styles for the CollapsiblePane component. This includes the expanded
 * and collapsed states of the sidebar, its header, and content sections.
 */
export const useCollapsiblePaneStyles = makeStyles({
    collapsiblePane: {
        display: 'flex',
        flexDirection: 'column',
        width: '280px',
        flexShrink: 0,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
        transition: 'width 0.2s ease-in-out',
        overflow: 'hidden',
    },
    collapsiblePane_collapsed: {
        display: 'flex',
        flexDirection: 'column',
        width: '48px',
        flexShrink: 0,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
        transition: 'width 0.2s ease-in-out',
        overflow: 'hidden',
        alignItems: 'center',
    },
    paneHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        flexShrink: 0,
        width: '100%',
    },
    paneTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        marginLeft: '4px',
        whiteSpace: 'nowrap',
    },
    paneContent: {
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
        gap: '16px',
        overflowY: 'auto',
        flex: '1 1 auto',
    },
    paneSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    paneSectionHeader: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground2,
    },
    paneToolbar: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        marginTop: '8px',
    },
});