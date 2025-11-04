// src/taskpane/features/comparison/components/dialog/Styles/FloatingPanel.styles.ts
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";

/**
 * Styles for the FloatingPanel component.
 * This defines a draggable, floating container for tools like Summary or Filters.
 */
export const useFloatingPanelStyles = makeStyles({
  panelContainer: {
    display: 'flex',
    flexDirection: 'column',
    position: "absolute",
    // top/left are set by the useDraggable hook's style transform
    zIndex: 20, // Ensure it's above the grids but below modals

    width: '320px',
    minHeight: '150px',
    maxHeight: '70vh', // Prevent it from being too tall
    resize: 'both', // Allow user to resize the panel
    overflow: 'hidden', // Needed for resize to work cleanly

    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    boxShadow: tokens.shadow28, // A more prominent shadow to indicate it's on top
    
    transitionProperty: "box-shadow",
    transitionDuration: tokens.durationNormal,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    
    paddingLeft: '12px',
    paddingRight: '4px',
    paddingTop: '4px',
    paddingBottom: '4px',

    backgroundColor: tokens.colorNeutralBackground3,
    cursor: 'move', // Indicate that this area is for dragging
  },

  title: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  content: {
    flexGrow: 1,
    ...shorthands.padding('12px'),
    overflowY: 'auto',
  },
});