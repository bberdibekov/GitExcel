//src/taskpane/features/comparison/components/dialog/Styles/ChangeDetailModal.styles.tsx

import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

/**
 * Styles for the ChangeDetailModal component. This covers the modal's surface,
 * header, body, and the main content blocks for displaying final values and
 * the history header.
 */
export const useChangeDetailModalStyles = makeStyles({
    detailModalSurface: {
        width: '900px',
        maxWidth: '90vw',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
    },
    detailModalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...shorthands.padding('4px', '12px'),
        ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
        flexShrink: 0,
    },
    detailModalHeaderContent: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalL,
        flexWrap: 'wrap',
    },
    detailModalHeaderItem: {
        fontSize: '14px',
    },
    detailModalHeaderLabel: {
        color: tokens.colorNeutralForeground2,
        marginRight: tokens.spacingHorizontalXS,
    },
    detailModalHeaderValue: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    detailModalBody: {
        flex: '1 1 auto',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.padding('12px', '20px'),
    },
    scrollableContent: {
        flex: '1 1 auto',
        minHeight: 0,
    },
    historyHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...shorthands.padding('4px', '0'),
        ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
        marginBottom: '12px',
    },
    historyHeaderTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    infoBlock: {
        ...shorthands.padding('12px'),
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.borderRadius(tokens.borderRadiusSmall),
        marginBottom: '12px',
    },
    infoBlockTitle: {
        marginBottom: '8px',
        fontWeight: tokens.fontWeightSemibold,
        fontSize: tokens.fontSizeBase300,
    },
    finalValueBlock: {
        marginTop: "12px",
        ...shorthands.padding("8px", "12px"),
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.borderRadius(tokens.borderRadiusSmall),
    },
    finalValueBlock_withHistory: {
        ...shorthands.borderTop('2px', 'solid', tokens.colorNeutralStroke2),
    },
    finalValueTitle: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
    },
    codeBlock: {
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        margin: "0",
        padding: "8px 12px",
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.border("none"),
        fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
        fontSize: tokens.fontSizeBase200,
        lineHeight: "1.6",
        width: '100%',
        maxWidth: '100%',
        overflowWrap: 'anywhere',
    },

    diffLine_formula: {
        fontFamily: 'Consolas, monospace',
    },
});