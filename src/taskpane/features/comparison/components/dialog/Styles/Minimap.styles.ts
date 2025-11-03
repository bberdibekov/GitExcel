//src/taskpane/features/comparison/components/dialog/Styles/Minimap.styles.ts
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

/**
 * Styles for the Minimap component. This includes the floating container
 * that holds the canvas element, giving it a shadow and border to lift it
 * off the background.
 */
export const useMinimapStyles = makeStyles({
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
});