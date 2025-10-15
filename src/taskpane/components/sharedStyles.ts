// src/taskpane/components/sharedStyles.ts

import { makeStyles, tokens } from "@fluentui/react-components";

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
    backgroundColor: tokens.colorNeutralBackground3,
    borderLeftColor: tokens.colorPaletteDarkOrangeBorderActive,
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
  // This style is specifically for the developer tools panel.
  card_dev_tools: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    border: `2px dashed ${tokens.colorPaletteRedBorderActive}`,
    padding: tokens.spacingVerticalL,
    marginTop: tokens.spacingVerticalL,
  },
  // Styles for the Notification component
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
});