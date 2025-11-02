import { makeStyles, tokens } from '@fluentui/react-components';

export const useComparisonDialogStyles = makeStyles({
    // The main component container
    rootContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 50px)',
    },
    // The container for the two side-by-side grids
    gridsBody: {
        display: 'flex',
        flex: '1',
        gap: '8px',
        padding: '8px',
        backgroundColor: tokens.colorNeutralBackground1, 
    },
    // The container for a single grid and its title
    gridColumn: {
        flex: '1',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    // The version comment title above each grid
    versionTitle: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    // The container for the "Structural Changes" list
    highLevelChangesContainer: {
        padding: '8px 16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    // The <ul> element for the list of changes
    highLevelChangesList: {
        margin: '8px 0',
        paddingLeft: '20px',
    },
});