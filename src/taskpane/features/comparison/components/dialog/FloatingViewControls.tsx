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
    PanelRightContract24Regular,
    PanelLeftContract24Regular,
    Eye24Regular,
    ChevronDown20Regular,
} from '@fluentui/react-icons';
import { useFloatingViewControlsStyles } from './Styles/FloatingViewControls.styles';
import { useDraggable } from '../../hooks/useDraggable';
import { useComparisonStore } from '../../../../state/comparisonStore';
import { VisiblePanel } from '../../../../types/types';

interface FloatingViewControlsProps {
    affectedSheetNames: string[];
}

const FloatingViewControls: React.FC<FloatingViewControlsProps> = (props) => {
    const { affectedSheetNames } = props;
    const styles = useFloatingViewControlsStyles();
    const { dragNodeRef, style, onMouseDown } = useDraggable();

    const {
        activeSheetName,
        visiblePanel,
        highlightOnlyMode,
        setActiveSheet,
        setVisiblePanel,
        toggleHighlightMode
    } = useComparisonStore();

    const handleSheetSelectionChange = (
        _event: React.MouseEvent | React.KeyboardEvent,
        data: MenuCheckedValueChangeData
    ) => {
        if (data.name === 'sheet' && data.checkedItems.length > 0) {
            const newSheetName = data.checkedItems[0];
            setActiveSheet(newSheetName);
        }
    };

    const handleVisibilityToggle = (targetPanel: 'start' | 'end') => {
        if (visiblePanel === targetPanel) {
            setVisiblePanel('both');
        } else {
            setVisiblePanel(targetPanel as VisiblePanel);
        }
    };

    // --- Use a fallback if the active sheet hasn't been initialized yet ---
    const selectedSheetName = activeSheetName ?? affectedSheetNames[0] ?? "";

    return (
        <div ref={dragNodeRef} style={style} onMouseDown={onMouseDown} className={styles.root}>
            {/* ... dragger ... */}
            <div className={styles.dragHandle}><span>⋮⋮</span></div>
            <div className={styles.separator} />

            <div onMouseDown={(e) => e.stopPropagation()}>
                <Menu>
                    <MenuTrigger disableButtonEnhancement>
                        <Tooltip content="Select sheet to view" relationship="label">
                            <Button className={styles.sheetSelectorButton} appearance="transparent" icon={<ChevronDown20Regular />} iconPosition="after">
                                {selectedSheetName}
                            </Button>
                        </Tooltip>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList checkedValues={{ sheet: [selectedSheetName] }} onCheckedValueChange={handleSheetSelectionChange}>
                            {affectedSheetNames.map((name) => (
                                <MenuItemRadio key={name} name="sheet" value={name}>{name}</MenuItemRadio>
                            ))}
                        </MenuList>
                    </MenuPopover>
                </Menu>
            </div>

            <div className={styles.separator} />

            <div onMouseDown={(e) => e.stopPropagation()}>
                <Tooltip content="Show only left panel" relationship="label">
                    <Button icon={<PanelRightContract24Regular />} onClick={() => handleVisibilityToggle('start')} appearance={visiblePanel === 'start' ? 'secondary' : 'subtle'} shape="circular" />
                </Tooltip>
                <Tooltip content="Show only right panel" relationship="label">
                    <Button icon={<PanelLeftContract24Regular />} onClick={() => handleVisibilityToggle('end')} appearance={visiblePanel === 'end' ? 'secondary' : 'subtle'} shape="circular" />
                </Tooltip>
            </div>

            <div className={styles.separator} />

            <div onMouseDown={(e) => e.stopPropagation()}>
                <Tooltip content="Show only changed cells" relationship="label">
                    <Button icon={<Eye24Regular />} onClick={toggleHighlightMode} appearance={highlightOnlyMode ? 'secondary' : 'subtle'} shape="circular" />
                </Tooltip>
            </div>
        </div>
    );
};

export default FloatingViewControls;