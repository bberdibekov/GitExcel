// src/taskpane/features/comparison/components/dialog/Styles/FloatingToolbar.styles.ts
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";

/**
 * Styles for the FloatingToolbar component.
 * This defines a vertically-oriented, floating container for action icons.
 */
export const useFloatingToolbarStyles = makeStyles({
  toolbarContainer: {
    // Positioning: Float over the canvas
    position: "absolute",
    top: "50%",
    left: "16px",
    transform: "translateY(-50%)",
    zIndex: 10, // Ensure it's above the grids

    // Layout: Vertical stack of icons
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("8px"),

    // Appearance: A modern, semi-transparent "pill"
    backgroundColor: "rgba(255, 255, 255, 0.8)", // Semi-transparent white
    ...shorthands.padding("8px"),
    ...shorthands.borderRadius(tokens.borderRadiusXLarge),
    boxShadow: tokens.shadow16,
    
    // Transition for a smooth hover effect
    transitionProperty: "background-color, box-shadow",
    transitionDuration: tokens.durationNormal,

    ":hover": {
      backgroundColor: "rgba(255, 255, 255, 0.95)", // More opaque on hover
      boxShadow: tokens.shadow28,
    },
  },
});