// src/taskpane/features/comparison/components/dialog/FloatingViewControls.tsx

import * as React from 'react';
import {
    Button,
    Tooltip,
    Menu,
    MenuTrigger,
    MenuList,
    MenuItemRadio,
    MenuPopover,
    MenuCheckedValueChangeData,
} from '@fluentui/react-components';
import {
    // --- MODIFIED: Removed the 'SplitHorizontal' icon as it's no longer needed ---
    PanelRightContract24Regular,
    PanelLeftContract24Regular,
    Eye24Regular,
    ChevronDown20Regular,
} from '@fluentui/react-icons';
import { useFloatingViewControlsStyles } from './Styles/FloatingViewControls.styles';
import { useDraggable } from '../../hooks/useDraggable';

interface FloatingViewControlsProps {
    // Sheet Selector Props
    affectedSheetNames: string[];
    selectedSheetName: string;
    onSheetChange: (sheetName: string) => void;

    // Panel Visibility Props
    visiblePanel: VisiblePanel;
    onVisibilityChange: (panel: VisiblePanel) => void;

    // Highlight Mode Props
    highlightOnlyMode: boolean;
    onHighlightModeChange: (checked: boolean) => void;
}

type VisiblePanel = 'both' | 'start' | 'end';

const FloatingViewControls: React.FC<FloatingViewControlsProps> = (props) => {
    const {
        affectedSheetNames,
        selectedSheetName,
        onSheetChange,
        visiblePanel,
        onVisibilityChange,
        highlightOnlyMode,
        onHighlightModeChange,
    } = props;
    const styles = useFloatingViewControlsStyles();
    const { dragNodeRef, style, onMouseDown } = useDraggable();

    const handleSheetSelectionChange = (
        _event: React.MouseEvent | React.KeyboardEvent,
        data: MenuCheckedValueChangeData
    ) => {
        if (data.name === 'sheet' && data.checkedItems.length > 0) {
            const newSheetName = data.checkedItems[0];
            onSheetChange(newSheetName);
        }
    };

    const handleVisibilityToggle = (targetPanel: 'start' | 'end') => {
        // If the user clicks the button for the panel that is already exclusively visible,
        // we toggle back to the 'both' view.
        if (visiblePanel === targetPanel) {
            onVisibilityChange('both');
        } else {
            // Otherwise, we switch to the target panel's view.
            // This handles switching from 'both' to a single panel,
            // and also from 'start' to 'end' (and vice-versa) directly.
            onVisibilityChange(targetPanel);
        }
    };

    return (
        <div
            ref={dragNodeRef}
            style={style}
            onMouseDown={onMouseDown}
            className={styles.root}
        >
            {/* Draggable handle remains unchanged */}
            <div className={styles.dragHandle}>
                <span>⋮⋮</span>
            </div>
            <div className={styles.separator} />

            {/* Sheet Selector remains unchanged */}
            <div onMouseDown={(e) => e.stopPropagation()}>
                <Menu>
                    <MenuTrigger disableButtonEnhancement>
                        <Tooltip content="Select sheet to view" relationship="label">
                            <Button
                                className={styles.sheetSelectorButton}
                                appearance="transparent"
                                icon={<ChevronDown20Regular />}
                                iconPosition="after"
                            >
                                {selectedSheetName}
                            </Button>
                        </Tooltip>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList
                            checkedValues={{ sheet: [selectedSheetName] }}
                            onCheckedValueChange={handleSheetSelectionChange}
                        >
                            {affectedSheetNames.map((name) => (
                                <MenuItemRadio key={name} name="sheet" value={name}>
                                    {name}
                                </MenuItemRadio>
                            ))}
                        </MenuList>
                    </MenuPopover>
                </Menu>
            </div>

            <div className={styles.separator} />

            {/* --- MODIFIED: Panel Visibility now uses the new two-button toggle logic --- */}
            <div onMouseDown={(e) => e.stopPropagation()}>
                <Tooltip content="Show only left panel" relationship="label">
                    <Button
                        icon={<PanelRightContract24Regular />}
                        onClick={() => handleVisibilityToggle('start')}
                        // The button is active only when its specific panel is visible
                        appearance={visiblePanel === 'start' ? 'secondary' : 'subtle'}
                        shape="circular"
                    />
                </Tooltip>
                
                {/* --- REMOVED: The middle "Show both panels" button has been deleted --- */}

                <Tooltip content="Show only right panel" relationship="label">
                    <Button
                        icon={<PanelLeftContract24Regular />}
                        onClick={() => handleVisibilityToggle('end')}
                        // The button is active only when its specific panel is visible
                        appearance={visiblePanel === 'end' ? 'secondary' : 'subtle'}
                        shape="circular"
                    />
                </Tooltip>
            </div>

            <div className={styles.separator} />

            {/* Highlight Mode Control remains unchanged */}
            <div onMouseDown={(e) => e.stopPropagation()}>
                <Tooltip content="Show only changed cells" relationship="label">
                    <Button
                        icon={<Eye24Regular />}
                        onClick={() => onHighlightModeChange(!highlightOnlyMode)}
                        appearance={highlightOnlyMode ? 'secondary' : 'subtle'}
                        shape="circular"
                    />
                </Tooltip>
            </div>
        </div>
    );
};

export default FloatingViewControls;