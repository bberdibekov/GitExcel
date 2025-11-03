// src/taskpane/features/comparison/components/dialog/FloatingViewControls.tsx

import * as React from 'react';
import {
    Button,
    Tooltip,
    Switch,
    Menu,
    MenuTrigger,
    MenuList,
    MenuItemRadio,
    MenuPopover,
    MenuCheckedValueChangeData,
} from '@fluentui/react-components';
import {
    PanelLeft24Regular,
    PanelRight24Regular,
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
    // --- ADDED: Use the draggable hook ---
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

    return (
        <div
            ref={dragNodeRef}
            style={style}
            onMouseDown={onMouseDown}
            className={styles.root}
        >
            {/* --- Sheet Selector --- /}
{/ Stop propagation so clicking the menu doesn't start a drag */}
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

            {/* --- Panel Visibility Control --- */}
            {/* Stop propagation so clicking buttons doesn't start a drag */}
            <div onMouseDown={(e) => e.stopPropagation()}>
                <Tooltip content="Show only left panel" relationship="label">
                    <Button
                        icon={<PanelLeft24Regular />}
                        onClick={() => onVisibilityChange('start')}
                        appearance={visiblePanel === 'start' ? 'primary' : 'subtle'}
                        shape="circular"
                    />
                </Tooltip>
                <Tooltip content="Show both panels" relationship="label">
                    <Button
                        icon={<Eye24Regular />}
                        onClick={() => onVisibilityChange('both')}
                        appearance={visiblePanel === 'both' ? 'primary' : 'subtle'}
                        shape="circular"
                    />
                </Tooltip>
                <Tooltip content="Show only right panel" relationship="label">
                    <Button
                        icon={<PanelRight24Regular />}
                        onClick={() => onVisibilityChange('end')}
                        appearance={visiblePanel === 'end' ? 'primary' : 'subtle'}
                        shape="circular"
                    />
                </Tooltip>
            </div>

            <div className={styles.separator} />

            {/* --- Highlight Only Mode Toggle --- */}
            {/* Stop propagation so clicking the switch doesn't start a drag */}
            <div className={styles.highlightToggle} onMouseDown={(e) => e.stopPropagation()}>
                <Tooltip content="Show only changed cells" relationship="label">
                    <Switch
                        checked={highlightOnlyMode}
                        onChange={(_, data) => onHighlightModeChange(data.checked)}
                        label="Highlight changes"
                    />
                </Tooltip>
            </div>
        </div>



    );
};

export default FloatingViewControls;