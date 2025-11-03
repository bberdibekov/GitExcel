import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useComparisonDialogStyles = makeStyles({
    
    dialogViewContainer: {
        display: 'flex',
        flexDirection: 'row',
        height: '100vh', // Use viewport height for the dialog window
        width: '100%',
        overflow: 'hidden',
        backgroundColor: tokens.colorNeutralBackground2,
    },
    collapsiblePane: {
        display: 'flex',
        flexDirection: 'column',
        width: '280px', // Standard sidebar width
        flexShrink: 0,
        backgroundColor: tokens.colorNeutralBackground1,
        borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
        transition: 'width 0.2s ease-in-out',
        overflow: 'hidden',
    },
    collapsiblePane_collapsed: {
        display: 'flex',
        flexDirection: 'column',
        width: '48px', // Icon-only toolbar width
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

    mainContentArea: {
        flex: '1 1 0',
        minWidth: 0, // Crucial for flexbox to allow shrinking
        display: 'flex',
        flexDirection: 'column',
    },
    rootContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '91vh',
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
        flex: '1 1 0', // This makes the wrapper take all available space in the column.
        minHeight: 0,  // This is crucial. It allows the container to shrink smaller than its content.
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
    highLevelChangesContainer: {
        padding: '8px 16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        flexShrink: 0,
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
    
    // --- DIALOG REPORT GRID STYLES ---
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
        backgroundColor: tokens.colorPaletteYellowBackground2,
        fontWeight: tokens.fontWeightSemibold,
        ':hover': {
            cursor: 'pointer',
            backgroundColor: tokens.colorPaletteYellowBackground3,
        },
    },
    // NEW: Border emphasis for changed cells
    gridCell_changedBorder: {
        boxShadow: `inset 0 0 0 2px ${tokens.colorPaletteDarkOrangeBorder1}`,
        ...shorthands.border("2px", "solid", tokens.colorPaletteDarkOrangeBorder1),
    },
    // NEW: Faded style for unchanged cells
    gridCell_faded: {
        opacity: 0.5,
        ':hover': {
            opacity: 0.7,
        },
    },
    // NEW: Hidden style for highlight-only mode
    gridCell_hidden: {
        display: 'none',
    },
    gridOuterWrapper: {
        display: 'grid',
        gridTemplateRows: '22px 1fr',
        gridTemplateColumns: '50px 1fr',
        flex: '1 1 0',
        minHeight: 0,
        minWidth: 0,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        overflow: 'hidden',
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
        position: 'relative',
    },
    // NEW: Header cell with changes indicator
    gridHeaderCell_changed: {
        backgroundColor: tokens.colorPaletteYellowBackground1,
        color: tokens.colorNeutralForeground1,
    },
    // NEW: Change marker dot
    changeMarker: {
        position: 'absolute',
        top: '2px',
        right: '2px',
        fontSize: '8px',
        color: tokens.colorPaletteDarkOrangeForeground1,
        lineHeight: '8px',
    },
    gridComponentContainer: {
        position: 'relative',
        overflow: 'hidden',
    },
    gridMainContainer: {
        position: 'relative',
        overflow: 'auto',
        gridRow: '2',
        gridColumn: '2',
    },
    
    // --- STYLES FOR FORMULA BADGE ---
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

    minimapContainer: {
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 10,
        boxShadow: tokens.shadow16,
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.borderRadius(tokens.borderRadiusMedium),
        ...shorthands.padding('4px'),
        border: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    minimapCanvas: {
        cursor: 'pointer',
        ...shorthands.borderRadius(tokens.borderRadiusSmall),
    },
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
});