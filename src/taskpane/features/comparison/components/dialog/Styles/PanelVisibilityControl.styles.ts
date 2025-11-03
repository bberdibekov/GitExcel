// src/taskpane/features/comparison/components/dialog/Styles/PanelVisibilityControl.styles.ts
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const usePanelVisibilityControlStyles = makeStyles({
  controlContainer: {
    // Positioning
    position: 'absolute',
    top: '0px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,

    // Layout & Appearance
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('2px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('2px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow8,
  },
});