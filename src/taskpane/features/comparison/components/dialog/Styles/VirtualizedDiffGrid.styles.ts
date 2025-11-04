import { makeStyles, shorthands, tokens } from "@fluentui/react-components";

/**
    Styles for the VirtualizedDiffGrid component and its sub-components
    (like MainCell, ColumnHeader, and RowHeader). This is the core styling
    for the visual representation of the spreadsheet data.
    */
export const useVirtualizedDiffGridStyles = makeStyles({
    gridCell: {
        ...shorthands.padding("2px", "6px"),
        ...shorthands.border("1px", "solid", tokens.colorNeutralStroke3),
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontFamily: "Calibri, sans-serif",
        fontSize: "11pt",
        boxSizing: "border-box",
        transition: `background-color 0.1s ${tokens.curveEasyEase}`,
        ":hover": {
            cursor: "pointer",
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    gridCell_blank: {
        backgroundColor: tokens.colorNeutralBackground1,
        ":hover": {
            cursor: "default",
            backgroundColor: tokens.colorNeutralBackground1,
        },
    },
    gridCell_changed: {
        backgroundColor: tokens.colorPaletteYellowBackground2,
        fontWeight: tokens.fontWeightSemibold,
        ":hover": {
            cursor: "pointer",
            backgroundColor: tokens.colorPaletteYellowBackground3,
        },
    },
    gridCell_changedBorder: {
        boxShadow: `inset 0 0 0 2px ${tokens.colorPaletteDarkOrangeBorder1}`,
    },
    gridCell_hidden: {
        display: "none",
    },

    gridCell_deleted: {
        backgroundColor: tokens.colorPaletteRedBackground1,
        "& .cell-text": { // Target the inner span for the strikethrough
            textDecorationLine: 'line-through',
        }
    },
    gridCell_inserted: {
        backgroundColor: tokens.colorPaletteGreenBackground1,
    },
    gridCell_placeholder_deleted: {
        cursor: 'default',
        backgroundColor: tokens.colorNeutralBackground4,
        backgroundImage: `repeating-linear-gradient(
            -45deg,
            ${tokens.colorNeutralBackground5},
            ${tokens.colorNeutralBackground5} 5px,
            transparent 5px,
            transparent 10px
        )`,
        ":hover": {
            cursor: 'default',
            backgroundColor: tokens.colorNeutralBackground4,
        }
    },
    gridCell_placeholder_inserted: {
        cursor: 'default',
        backgroundColor: tokens.colorNeutralBackground4,
        backgroundImage: `repeating-linear-gradient(
            45deg,
            ${tokens.colorNeutralBackground5},
            ${tokens.colorNeutralBackground5} 5px,
            transparent 5px,
            transparent 10px
        )`,
         ":hover": {
            cursor: 'default',
            backgroundColor: tokens.colorNeutralBackground4,
        }
    },
    gridOuterWrapper: {
        display: "grid",
        gridTemplateRows: "22px 1fr",
        gridTemplateColumns: "50px 1fr",
        flex: "1 1 0",
        minHeight: 0,
        minWidth: 0,
        border: `1px solid ${tokens.colorNeutralStroke3}`,
        overflow: "hidden",
    },
    gridTopLeftCorner: {
        backgroundColor: tokens.colorNeutralBackground3,
        borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
        borderRight: `1px solid ${tokens.colorNeutralStroke3}`,
    },
    gridHeaderCell: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground3,
        fontWeight: tokens.fontWeightSemibold,
        borderRight: `1px solid ${tokens.colorNeutralStroke3}`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
        boxSizing: "border-box",
        position: "relative",
    },
    gridHeaderCell_changed: {
        backgroundColor: tokens.colorPaletteYellowBackground1,
        color: tokens.colorNeutralForeground1,
    },
    changeMarker: {
        position: "absolute",
        top: "2px",
        right: "2px",
        fontSize: "8px",
        color: tokens.colorPaletteDarkOrangeForeground1,
        lineHeight: "8px",
    },
    gridComponentContainer: {
        position: 'relative',
        overflow: 'hidden',
    },
    gridMainContainer: {
        position: "relative",
        overflow: "auto",
        gridRow: "2",
        gridColumn: "2",
    },
    cellContentWrapper: {
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        minWidth: 0,
    },
    cellText: {
        className: 'cell-text', 
        flexGrow: 1,
        minWidth: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    cellText_unchanged: {
        color: '#c4c4c4ff'
    },
    fxBadge: {
        position: "absolute",
        top: "0px",
        right: "0px",
        fontSize: "9px",
        lineHeight: "9px",
        color: '#d6d6d6ff',
        fontStyle: "italic",
        userSelect: "none",
    },
});