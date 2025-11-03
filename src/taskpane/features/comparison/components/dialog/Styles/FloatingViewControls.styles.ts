// src/taskpane/features/comparison/components/dialog/Styles/FloatingViewControls.styles.ts
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useFloatingViewControlsStyles = makeStyles({
  root: {
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)', 
    zIndex: 10,

    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('4px', '8px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow8,
    cursor: 'move',
  },
  separator: {
    width: '1px',
    height: '24px',
    backgroundColor: tokens.colorNeutralStroke2,
  },
  sheetSelectorButton: {
    fontWeight: tokens.fontWeightSemibold,
    cursor: 'pointer',
  },

  dragHandle: {
    display: 'flex',
    alignItems: 'center',
    color: tokens.colorNeutralForeground4,
    fontSize: '20px',
    lineHeight: '1',
    paddingLeft: '4px',
    paddingRight: '4px',
  }
});