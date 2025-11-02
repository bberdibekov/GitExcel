import { makeStyles, tokens } from '@fluentui/react-components';

export const useComparisonDialogStyles = makeStyles({
    rootContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 50px)',
    },
    gridsBody: {
        display: 'flex',
        flex: '1',
        gap: '8px',
        padding: '8px',
        backgroundColor: tokens.colorNeutralBackground1, 
    },
    gridColumn: {
        flex: '1',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    versionTitle: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    highLevelChangesContainer: {
        padding: '8px 16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    highLevelChangesList: {
        margin: '8px 0',
        paddingLeft: '20px',
    },

    detailModalSurface: {
        width: '800px',
        maxWidth: '90vw',
    },
});