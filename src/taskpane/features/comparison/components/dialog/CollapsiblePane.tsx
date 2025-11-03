// src/taskpane/features/comparison/components/dialog/CollapsiblePane.tsx

import * as React from 'react';
import { Button, Tooltip, Dropdown, Option, Menu, MenuTrigger, MenuPopover, MenuList, MenuItemCheckbox, MenuDivider, MenuItem, MenuCheckedValueChangeEvent } from '@fluentui/react-components';
import { 
    PanelLeftContract24Regular, 
    PanelLeftExpand24Regular, 
    Settings24Filled, 
    ArrowReply24Filled,
    DocumentText24Regular,
    Filter24Regular
} from '@fluentui/react-icons';
import { IHighLevelChange } from '../../../../types/types';
import { useComparisonDialogStyles } from './ComparisonDialog.styles';
import FeatureBadge from '../../../../shared/paywall/FeatureBadge';
import { valueFilters, formulaFilters } from '../../services/comparison.filters';
import ComparisonSummary from './ComparisonSummary';

export type ViewFilter = 'all' | 'values' | 'formulas' | 'structural';
export type RestoreAction = 'selected' | 'sheet' | 'workbook';

interface CollapsiblePaneProps {
    isPaneOpen: boolean;
    highLevelChanges: IHighLevelChange[];
    totalChanges: number;
    valueChanges: number;
    formulaChanges: number;
    licenseTier: 'free' | 'pro';
    selectedChangeCount: number;
    activeViewFilter: ViewFilter;
    activeComparisonSettings: Set<string>;
    onPaneToggle: () => void;
    onViewFilterChange: (filter: ViewFilter) => void;
    onComparisonSettingChange: (changedSettings: Record<string, string[]>) => void;
    onRestore: (action: RestoreAction) => void;
}

const CollapsiblePane: React.FC<CollapsiblePaneProps> = (props) => {
    const {
        isPaneOpen,
        highLevelChanges,
        totalChanges,
        valueChanges,
        formulaChanges,
        licenseTier,
        selectedChangeCount,
        activeViewFilter,
        activeComparisonSettings,
        onPaneToggle,
        onViewFilterChange,
        onComparisonSettingChange,
        onRestore
    } = props;
    
    const styles = useComparisonDialogStyles();
    const isPro = licenseTier === 'pro';
    const allComparisonFilters = [...valueFilters, ...formulaFilters];

    const handleSettingsChange = (
        _e: MenuCheckedValueChangeEvent,
        data: { name: string; checkedItems: string[] }
    ) => {
        onComparisonSettingChange({ [data.name]: data.checkedItems });
    };

    const expandedView = (
        <div className={styles.paneContent}>
            {/* Section 1: Summary */}
            <div className={styles.paneSection}>
                <ComparisonSummary 
                    totalChanges={totalChanges}
                    valueChanges={valueChanges}
                    formulaChanges={formulaChanges}
                    highLevelChanges={highLevelChanges}
                />
            </div>
            
            {/* Section 2: View Controls */}
            <div className={styles.paneSection}>
                <label htmlFor="view-filter-dropdown" className={styles.paneSectionHeader}>Show:</label>
                <Dropdown
                    id="view-filter-dropdown"
                    value={activeViewFilter}
                    onOptionSelect={(_, data) => onViewFilterChange(data.optionValue as ViewFilter)}
                    style={{ width: '100%'}}
                >
                    <Option value="all">All Changes</Option>
                    <Option value="values">Value Changes</Option>
                    <Option value="formulas">Formula Changes</Option>
                    <Option value="structural" disabled>Structural Changes (soon)</Option>
                </Dropdown>
            </div>

            {/* Section 3: Settings & Actions */}
            <div className={styles.paneSection}>
                <Menu>
                    <MenuTrigger>
                        <Button icon={<Settings24Filled />} style={{ width: '100%', justifyContent: 'start' }}>
                            Settings <FeatureBadge tier="pro" />
                        </Button>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList
                            checkedValues={{ 'comparison-settings': Array.from(activeComparisonSettings) }}
                            onCheckedValueChange={handleSettingsChange}
                        >
                            {allComparisonFilters.map(filter => (
                                <MenuItemCheckbox key={filter.id} name="comparison-settings" value={filter.id} disabled={!isPro}>
                                    {filter.label}
                                </MenuItemCheckbox>
                            ))}
                            {!isPro && ( <> <MenuDivider /> <MenuItem disabled>Upgrade to Pro</MenuItem> </>)}
                        </MenuList>
                    </MenuPopover>
                </Menu>
                
                <Menu>
                    <MenuTrigger>
                        <Button appearance="primary" icon={<ArrowReply24Filled />} disabled={selectedChangeCount === 0} style={{ width: '100%', marginTop: '8px', justifyContent: 'start' }}>
                            Restore... ({selectedChangeCount})
                        </Button>
                    </MenuTrigger>
                    <MenuPopover>
                        <MenuList>
                            <MenuItem onClick={() => onRestore('selected')} disabled={selectedChangeCount === 0}>Restore Selected ({selectedChangeCount})</MenuItem>
                            <MenuItem onClick={() => onRestore('sheet')} disabled>Restore Full Sheet</MenuItem>
                            <MenuItem onClick={() => onRestore('workbook')} disabled={!isPro}>Restore Workbook <FeatureBadge tier="pro" /></MenuItem>
                        </MenuList>
                    </MenuPopover>
                </Menu>
            </div>
        </div>
    );

    const collapsedView = (
        <div className={styles.paneToolbar}>
            <Tooltip content="Summary & Info" relationship="label">
                <Button icon={<DocumentText24Regular />} onClick={onPaneToggle} />
            </Tooltip>
            <Tooltip content="Filters & Settings" relationship="label">
                <Button icon={<Filter24Regular />} onClick={onPaneToggle} />
            </Tooltip>
            <Tooltip content="Restore Options" relationship="label">
                <Button icon={<ArrowReply24Filled />} onClick={onPaneToggle} />
            </Tooltip>
        </div>
    );

    return (
        <div className={isPaneOpen ? styles.collapsiblePane : styles.collapsiblePane_collapsed}>
            <div className={styles.paneHeader}>
                {isPaneOpen && <span className={styles.paneTitle}>Comparison Details</span>}
                <Tooltip content={isPaneOpen ? "Collapse Pane" : "Expand Pane"} relationship="label">
                    <Button 
                        appearance="subtle" 
                        icon={isPaneOpen ? <PanelLeftContract24Regular /> : <PanelLeftExpand24Regular />} 
                        onClick={onPaneToggle}
                    />
                </Tooltip>
            </div>

            {isPaneOpen ? expandedView : collapsedView}
        </div>
    );
};

export default CollapsiblePane;