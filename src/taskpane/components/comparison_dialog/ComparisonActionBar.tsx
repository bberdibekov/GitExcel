// src/taskpane/components/comparison_dialog/ComparisonActionBar.tsx

import * as React from 'react';
import {
  Button,
  Dropdown,
  Option,
  Menu,
  MenuTrigger,
  MenuList,
  MenuItemCheckbox,
  MenuItem,
  MenuPopover,
  MenuDivider,
  Tooltip,
  MenuCheckedValueChangeEvent,
} from '@fluentui/react-components';
import { Settings24Filled, ArrowReply24Filled } from '@fluentui/react-icons';
import { useSharedStyles } from '../sharedStyles';
import FeatureBadge from '../paywall/FeatureBadge';
import { valueFilters, formulaFilters } from '../../services/comparison.filters';

// Define the types for our component's props for type safety and clarity.
export type ViewFilter = 'all' | 'values' | 'formulas' | 'structural';
export type RestoreAction = 'selected' | 'sheet' | 'workbook';

interface ComparisonActionBarProps {
  // The current license tier to enable/disable PRO features.
  licenseTier: 'free' | 'pro';
  
  // The number of changes currently selected by the user.
  selectedChangeCount: number;

  // The currently active view filter (e.g., 'All Changes').
  activeViewFilter: ViewFilter;
  
  // The set of active comparison setting IDs (e.g., 'value_ignore_case').
  activeComparisonSettings: Set<string>;

  // Callback functions to notify the parent of user actions.
  onViewFilterChange: (filter: ViewFilter) => void;
  onComparisonSettingChange: (changedSettings: Record<string, string[]>) => void;
  onRestore: (action: RestoreAction) => void;
}

/**
 * A "dumb" UI component that renders the action bar for the comparison dialog.
 * It receives all state and callback functions as props from its parent orchestrator.
 * Its single responsibility is to render the UI and emit events when the user interacts with it.
 */
const ComparisonActionBar: React.FC<ComparisonActionBarProps> = (props) => {
  const {
    licenseTier,
    selectedChangeCount,
    activeViewFilter,
    activeComparisonSettings,
    onViewFilterChange,
    onComparisonSettingChange,
    onRestore,
  } = props;
  
  const styles = useSharedStyles();
  const isPro = licenseTier === 'pro';

  // Combine all available filters for rendering the settings menu.
  const allComparisonFilters = [...valueFilters, ...formulaFilters];

  // This handler conforms to the Fluent UI `onCheckedValueChange` event signature.
  const handleSettingsChange = (
    _e: MenuCheckedValueChangeEvent,
    data: { name: string; checkedItems: string[] }
  ) => {
    onComparisonSettingChange({ [data.name]: data.checkedItems });
  };

  return (
    <div className={styles.flexRowSpaceBetween} style={{ padding: '8px', borderBottom: '1px solid #e0e0e0', alignItems: 'center' }}>
      
      {/* Left Side: View Filters */}
      <div className={styles.flexRow} style={{ gap: '8px', alignItems: 'center' }}>
        <label htmlFor="view-filter-dropdown" style={{ fontWeight: '600' }}>Show:</label>
        <Dropdown
          id="view-filter-dropdown"
          value={activeViewFilter}
          onOptionSelect={(_, data) => onViewFilterChange(data.optionValue as ViewFilter)}
        >
          <Option value="all">All Changes</Option>
          <Option value="values">Value Changes</Option>
          <Option value="formulas">Formula Changes</Option>
          <Option value="structural" disabled>Structural Changes (soon)</Option>
        </Dropdown>
      </div>

      {/* Right Side: Settings & Primary Actions */}
      <div className={styles.flexRow} style={{ gap: '8px' }}>

        {/* Comparison Settings Dropdown Menu */}
        <Menu>
          <MenuTrigger>
            <Tooltip content="Comparison Settings" relationship="label">
              <Button icon={<Settings24Filled />}>
                Settings <FeatureBadge tier="pro" />
              </Button>
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <MenuList
              checkedValues={{ 'comparison-settings': Array.from(activeComparisonSettings) }}
              onCheckedValueChange={handleSettingsChange}
            >
              {allComparisonFilters.map(filter => (
                <MenuItemCheckbox
                  key={filter.id}
                  name="comparison-settings"
                  value={filter.id}
                  disabled={!isPro}
                >
                  {filter.label}
                </MenuItemCheckbox>
              ))}
              {!isPro && (
                <>
                  <MenuDivider />
                  <MenuItem disabled style={{ fontStyle: 'italic', fontSize: '12px' }}>
                    Upgrade to Pro to enable advanced filters.
                  </MenuItem>
                </>
              )}
            </MenuList>
          </MenuPopover>
        </Menu>
        
        {/* Restore Dropdown Button Group */}
        <Menu>
          <MenuTrigger>
            <Button appearance="primary" icon={<ArrowReply24Filled />} disabled={selectedChangeCount === 0}>
              Restore... ({selectedChangeCount})
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => onRestore('selected')} disabled={selectedChangeCount === 0}>
                Restore Selected Cells ({selectedChangeCount})
              </MenuItem>
              <MenuItem onClick={() => onRestore('sheet')} disabled>
                Restore Full Sheet
              </MenuItem>
              <MenuItem onClick={() => onRestore('workbook')} disabled={!isPro}>
                Restore Entire Workbook <FeatureBadge tier="pro" />
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>

      </div>
    </div>
  );
};

export default ComparisonActionBar;