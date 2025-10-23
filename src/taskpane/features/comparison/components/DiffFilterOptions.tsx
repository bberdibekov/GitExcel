// src/taskpane/components/DiffFilterOptions.tsx

import * as React from 'react';
import { Checkbox, Label, Popover, PopoverSurface, PopoverTrigger, Tooltip, Button } from '@fluentui/react-components';
import { Settings20Filled } from '@fluentui/react-icons';
import { valueFilters, formulaFilters } from '../services/comparison.filters';
import FeatureBadge from '../../../shared/paywall/FeatureBadge';
import { useSharedStyles } from '../../../shared/styles/sharedStyles';

interface DiffFilterOptionsProps {
  activeFilters: Set<string>;
  onFilterChange: (filterId: string) => void;
}

/**
 * A UI component that renders a set of checkboxes and advanced options
 * for filtering a comparison result. It is driven by a filter registry.
 */
const DiffFilterOptions: React.FC<DiffFilterOptionsProps> = ({ activeFilters, onFilterChange }) => {
    const styles = useSharedStyles();

    // Combine all filters for easier rendering logic
    const allFilters = [...valueFilters, ...formulaFilters];
    
    // A master switch for all "pro" filters for a simpler UI.
    const proFilterIds = allFilters.filter(f => f.tier === 'pro').map(f => f.id);
    const areAllProFiltersActive = proFilterIds.every(id => activeFilters.has(id));

    const handleMasterSwitchChange = () => {
        // If they are all on, turn them all off. Otherwise, turn them all on.
        const turnOn = !areAllProFiltersActive;
        proFilterIds.forEach(id => {
            if (activeFilters.has(id) !== turnOn) {
                onFilterChange(id);
            }
        });
    };

    return (
        <div className={styles.card} style={{ marginBottom: '15px' }}>
            <div className={styles.flexRowSpaceBetween}>
                {/* Master Switch */}
                <div>
                    <Checkbox
                        id="master_switch"
                        checked={areAllProFiltersActive}
                        onChange={handleMasterSwitchChange}
                    />
                    <Label htmlFor="master_switch" style={{ marginLeft: '8px', cursor: 'pointer' }}>
                        Ignore insignificant changes
                    </Label>
                    <FeatureBadge tier="pro" />
                </div>

                {/* Advanced Settings Popover */}
                <Popover>
                    <PopoverTrigger>
                        <Tooltip content="Advanced filter settings" relationship="label">
                            <Button appearance="subtle" icon={<Settings20Filled />} />
                        </Tooltip>
                    </PopoverTrigger>
                    <PopoverSurface style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {allFilters.map(filter => (
                            <div key={filter.id}>
                                <Checkbox
                                    id={filter.id}
                                    checked={activeFilters.has(filter.id)}
                                    onChange={() => onFilterChange(filter.id)}
                                />
                                <Label htmlFor={filter.id} style={{ marginLeft: '8px', cursor: 'pointer' }}>
                                    {filter.label}
                                </Label>
                                {filter.tier === 'pro' && <FeatureBadge tier="pro" />}
                            </div>
                        ))}
                    </PopoverSurface>
                </Popover>
            </div>
        </div>
    );
};

export default DiffFilterOptions;