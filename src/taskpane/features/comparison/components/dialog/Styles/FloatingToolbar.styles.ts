// src/taskpane/features/comparison/components/dialog/Styles/FloatingToolbar.styles.ts
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";

/**
 * Styles for the FloatingToolbar component.
 * This defines a vertically-oriented, floating container for action icons.
 */
export const useFloatingToolbarStyles = makeStyles({
  toolbarContainer: {
    position: "absolute",
    top: "150px",
    left: "16px",
    zIndex: 10,

    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("8px"),

    backgroundColor: "rgba(255, 255, 255, 0.8)",
    ...shorthands.padding("8px"),
    ...shorthands.borderRadius(tokens.borderRadiusXLarge),
    boxShadow: tokens.shadow16,
    
    transitionProperty: "background-color, box-shadow",
    transitionDuration: tokens.durationNormal,
    cursor: 'move',

    ":hover": {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      boxShadow: tokens.shadow28,
    },
  },
});