import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

/**
 * Styles for the ComparisonSummary component. This defines the layout for the
 * numeric stats grid (Total, Value, Formula) and the list of structural changes.
 */
export const useComparisonSummaryStyles = makeStyles({
    summaryContainer: {
        width: '100%',
    },
    summaryStatsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        textAlign: 'center',
        padding: '8px',
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.borderRadius(tokens.borderRadiusMedium),
    },
    summaryStatItem: {
        display: 'flex',
        flexDirection: 'column',
    },
    summaryStatValue: {
        fontSize: tokens.fontSizeHero800,
        fontWeight: tokens.fontWeightSemibold,
        lineHeight: '1',
        color: tokens.colorBrandForeground1,
    },
    summaryStatLabel: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
    },
    highLevelChangesList: {
        margin: '8px 0',
        paddingLeft: '20px',
    },
    paneSectionHeader: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground2,
    },
});