import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

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

    // --- CHANGE DETAIL MODAL STYLES ---
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
    dialogTitle: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    
    // --- DIALOG REPORT GRID STYLES (Unchanged) ---
    gridContainer: {
        flex: "1 1 0%",
        overflow: "hidden",
        border: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    gridCell: {
        ...shorthands.padding("2px", "6px"),
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontFamily: "Calibri, sans-serif",
        fontSize: "11pt",
        boxSizing: 'border-box',
        transition: `background-color 0.1s ${tokens.curveEasyEase}`,
        ':hover': {
            cursor: 'pointer',
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    gridCell_blank: {
        backgroundColor: tokens.colorNeutralBackground2,
        ':hover': {
            cursor: 'default',
            backgroundColor: tokens.colorNeutralBackground2,
        },
    },
    gridCell_changed: {
        backgroundColor: tokens.colorPaletteYellowBackground1,
        fontWeight: tokens.fontWeightSemibold,
        ':hover': {
            cursor: 'pointer',
            backgroundColor: tokens.colorPaletteYellowBackground2,
        },
    },
    gridOuterWrapper: {
        display: 'grid',
        gridTemplateRows: '22px 1fr',
        gridTemplateColumns: '50px 1fr',
        flex: '1 1 0%',
        height: 'calc(100vh - 150px)',
        border: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    gridTopLeftCorner: {
        backgroundColor: tokens.colorNeutralBackground3,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    gridHeaderCell: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground3,
        fontWeight: tokens.fontWeightSemibold,
        borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        boxSizing: 'border-box',
    },
    gridComponentContainer: {
        position: 'relative',
        overflow: 'hidden',
    },
    
    // --- STYLES FOR FORMULA BADGE (Unchanged) ---
    cellContentWrapper: {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
    },
    cellText: {
        flexGrow: 1,
        minWidth: 0, 
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    fxBadge: {
        position: 'absolute',
        top: '0px',
        right: '0px',
        fontSize: '9px',
        lineHeight: '9px',
        color: tokens.colorNeutralForeground4,
        fontStyle: 'italic',
        userSelect: 'none',
    },
    codeBlock: {
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        margin: "0",
        padding: "8px 12px",
        backgroundColor: tokens.colorNeutralBackground1,
        border: "none",
        fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
        fontSize: tokens.fontSizeBase200,
        lineHeight: "1.6",
        width: '100%',
        maxWidth: '100%',
        overflowWrap: 'anywhere',
    },
});