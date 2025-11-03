import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

/**
 * Styles for the ChangeHistoryItem component. This is responsible for rendering
 * a single step in a cell's timeline, including the title (with version comments)
 * and the visual diff of the content.
 */
export const useChangeHistoryItemStyles = makeStyles({
    historyStep: {
        width: '100%',
        ':first-child': {
            borderTop: 'none',
            marginTop: 0,
            paddingTop: 0,
        },
        ':not(:first-child)': {
            ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
            marginTop: '8px',
            paddingTop: '8px',
        },
    },
    historyStepHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
    },
    historyStepTitle: {
        fontSize: tokens.fontSizeBase300,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalS,
        flexWrap: 'wrap',
    },
    historyStepTitleText: {
        fontWeight: tokens.fontWeightRegular,
        color: tokens.colorNeutralForeground2,
    },
    historyStepVersionComment: {
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.borderRadius(tokens.borderRadiusSmall),
        ...shorthands.padding('2px', '6px'),
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
    },
    diffContainer: {
        ...shorthands.padding('10px'),
        ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
        ...shorthands.borderRadius(tokens.borderRadiusSmall),
        backgroundColor: tokens.colorNeutralBackground2,
        width: '100%',
        boxSizing: 'border-box',
    },
    diffLine: {
        ...shorthands.padding('8px'),
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.borderRadius(tokens.borderRadiusSmall),
        fontSize: '12px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        width: '100%',
        boxSizing: 'border-box',
    },
    diffLine_formula: {
        fontFamily: 'Consolas, monospace',
    },
    diffLine_deleted: {
        marginBottom: '8px',
    },
    diffSymbol: {
        fontWeight: tokens.fontWeightBold,
        marginRight: tokens.spacingHorizontalS,
    },
    diffSymbol_added: {
        color: tokens.colorPaletteGreenForeground1,
    },
    diffSymbol_deleted: {
        color: tokens.colorPaletteRedForeground1,
    },
    diffPart: {
        padding: '2px 0',
    },
    diffPart_added: {
        backgroundColor: tokens.colorPaletteGreenBackground1,
        color: tokens.colorPaletteGreenForeground1,
    },
    diffPart_removed: {
        backgroundColor: tokens.colorPaletteRedBackground1,
        color: tokens.colorPaletteRedForeground1,
        textDecoration: 'line-through',
    },
});