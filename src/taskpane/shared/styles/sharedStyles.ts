// src/taskpane/components/sharedStyles.ts

import { makeStyles, shorthands, tokens } from "@fluentui/react-components";

/**
 * A shared hook for common styles used across multiple components.
 * This follows the DRY principle and ensures visual consistency.
 */
export const useSharedStyles = makeStyles({
  // --- LAYOUT ---
  flexRow: {
    display: "flex",
    alignItems: "center",
  },
  flexRowSpaceBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonGroup: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
  },
  
  // --- TEXT ---
  textSubtle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  expander: {
    fontFamily: "monospace",
    color: tokens.colorBrandForeground1,
    userSelect: "none",
    marginRight: tokens.spacingHorizontalS,
  },

  // --- ICON STYLES ---
  icon: {
    color: tokens.colorNeutralForegroundDisabled,
    marginRight: tokens.spacingHorizontalS,
    flexShrink: "0",
    marginTop: "2px",
  },

  // --- LIST ITEM STYLES ---
  listItem: {
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalSNudge,
    borderLeftWidth: "3px",
    borderLeftStyle: "solid",
    listStyleType: "none",
  },
  listItem_modified: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  listItem_added: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    borderLeftColor: tokens.colorPaletteGreenBorderActive,
  },
  listItem_deleted: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderLeftColor: tokens.colorPaletteRedBorderActive,
  },
  listItem_summary: {
    backgroundColor: tokens.colorBrandBackground2,
    borderLeftColor: tokens.colorCompoundBrandStroke,
  },

  // --- CARD & PANEL STYLES ---
  card: {
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalM,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  card_info: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorCompoundBrandStroke}`,
  },
  card_dev_tools: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    border: `2px dashed ${tokens.colorPaletteRedBorderActive}`,
    padding: tokens.spacingVerticalL,
    marginTop: tokens.spacingVerticalL,
  },
  card_error: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    border: `1px solid ${tokens.colorPaletteRedBorderActive}`,
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground1,
    borderRadius: tokens.borderRadiusMedium,
  },
  card_warning: {
    backgroundColor: tokens.colorPaletteYellowBackground1,
    border: `1px solid ${tokens.colorPaletteYellowBorderActive}`,
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground1,
    borderRadius: tokens.borderRadiusMedium,
  },
  card_success: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    border: `1px solid ${tokens.colorPaletteGreenBorderActive}`,
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground1,
    borderRadius: tokens.borderRadiusMedium,
  },

  // --- DETAIL BLOCK STYLES ---
  detailBlock: {
    marginTop: tokens.spacingVerticalM,
    marginLeft: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingVerticalM,
    borderLeft: `2px solid ${tokens.colorNeutralStroke2}`,
  },
  detailBlock_deleted: {
    borderLeft: `2px solid ${tokens.colorPaletteRedBorderActive}`,
    marginLeft: tokens.spacingVerticalSNudge,
  },
  detailBlock_title: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },

  // --- PAYWALL STYLES ---
  badge_pro: {
    display: 'inline-block',
    padding: `0 ${tokens.spacingHorizontalSNudge}`,
    marginLeft: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: '16px',
    verticalAlign: 'middle',
  },

  // --- [AESTHETIC SHIFT APPLIED HERE] DIALOG REPORT GRID STYLES ---
  comparisonHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 8px',
    backgroundColor: 'transparent',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
  },
  comparisonRowContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 4px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    transition: 'none',
    ':hover': {
      backgroundColor: 'transparent',
    },
    [`&:hover .quick-restore-icon-hook`]: {
      visibility: 'visible',
      opacity: 1,
    },
  },
  columnCheckbox: {
    flex: '0 0 32px',
    display: 'flex',
    justifyContent: 'center',
  },
  columnSheet: {
    flex: '1 1 80px',
    paddingRight: '8px',
    color: tokens.colorNeutralForeground2,
  },
  columnCell: {
    flex: '1 1 80px',
    paddingRight: '8px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  columnValue: {
    flex: '3 1 200px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  columnAction: {
    flex: '0 0 50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  quickRestoreIcon: {
    visibility: 'hidden',
    opacity: 0,
    transition: `opacity 0.2s ${tokens.curveEasyEase}, color 0.2s`,
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    ':hover': {
      color: tokens.colorNeutralForeground2,
    }
  },
  chevron: {
    cursor: 'pointer',
    transition: `transform 0.2s ${tokens.curveEasyEase}`,
    color: tokens.colorNeutralForeground3,
  },

  // --- [MODIFIED AND CORRECTED] CHANGE DETAIL VIEWER STYLES ---
  historyStep: {
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding(tokens.spacingVerticalS, '0'),
    ...shorthands.margin(tokens.spacingVerticalS, '0'),
    ':first-child': {
      borderTop: 'none',
      marginTop: 0,
      paddingTop: 0,
    },
  },
  historyStepTitle: {
    display: 'block',
    marginBottom: tokens.spacingVerticalS,
  },
  transactionBlock: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  transactionLine: {
    ...shorthands.margin('0'),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    marginBottom: tokens.spacingVerticalXS,
    ':last-child': {
      marginBottom: 0,
    },
  },
  diffSymbol: {
    fontWeight: tokens.fontWeightSemibold,
    marginRight: tokens.spacingHorizontalS,
  },
  diffSymbol_added: {
    color: tokens.colorPaletteGreenForeground1,
  },
  diffSymbol_deleted: {
    color: tokens.colorPaletteRedForeground1,
  },
  textBlock: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    margin: "0",
    padding: "0",
    backgroundColor: "transparent",
    border: "none",
  },
  codeBlock: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    margin: "0",
    padding: "0",
    backgroundColor: "transparent",
    border: "none",
    fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
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
});