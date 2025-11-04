// src/taskpane/features/comparison/components/DiffFilterOptions.tsx

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Checkbox, Label, Button, Divider } from '@fluentui/react-components';
import { ChevronRight20Filled, ChevronDown20Filled } from '@fluentui/react-icons';
import { valueFilters, formulaFilters } from '../services/comparison.filters';
import FeatureBadge from '../../../shared/paywall/FeatureBadge';
import { useSharedStyles } from '../../../shared/styles/sharedStyles';

interface DiffFilterOptionsProps {
  activeFilters: Set<string>;
  onFilterChange: (filterId: string) => void;
}

const DiffFilterOptions: React.FC<DiffFilterOptionsProps> = ({ activeFilters, onFilterChange }) => {
    const styles = useSharedStyles();
    const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);
    
    // --- START: Add Ref for the Checkbox ---
    const masterCheckboxRef = useRef<HTMLInputElement>(null);
    // --- END: Add Ref for the Checkbox ---

    const allFilters = [...valueFilters, ...formulaFilters];
    
    const proFilterIds = allFilters.filter(f => f.tier === 'pro').map(f => f.id);
    const activeProFilterCount = proFilterIds.filter(id => activeFilters.has(id)).length;

    const isMasterChecked = activeProFilterCount === proFilterIds.length;
    const isMasterIndeterminate = activeProFilterCount > 0 && activeProFilterCount < proFilterIds.length;

    // --- START: Add useEffect to set indeterminate state ---
    // This effect runs whenever the indeterminate state changes.
    // It directly manipulates the DOM element, which is the correct
    // pattern for this specific property in Fluent UI v9.
    useEffect(() => {
        if (masterCheckboxRef.current) {
            masterCheckboxRef.current.indeterminate = isMasterIndeterminate;
        }
    }, [isMasterIndeterminate]);
    // --- END: Add useEffect to set indeterminate state ---

    const handleMasterSwitchChange = () => {
        const shouldTurnOn = !isMasterChecked && !isMasterIndeterminate;
        
        proFilterIds.forEach(id => {
            if (activeFilters.has(id) !== shouldTurnOn) {
                onFilterChange(id);
            }
        });
    };

    return (
        <div className={styles.card} style={{ padding: '12px', background: 'transparent', boxShadow: 'none' }}>
            <div className={styles.flexRow} style={{ alignItems: 'center', gap: '8px' }}>
                <Checkbox
                    id="master_switch"
                    // --- Attach the ref to the component ---
                    ref={masterCheckboxRef}
                    // --- The `checked` prop now handles both full and partial states for its visual ---
                    checked={isMasterChecked || isMasterIndeterminate}
                    // --- The `indeterminate` prop is removed as it's not supported ---
                    onChange={handleMasterSwitchChange}
                />
                <Label htmlFor="master_switch" style={{ cursor: 'pointer', fontWeight: '600' }}>
                    Ignore insignificant changes
                </Label>
                <FeatureBadge tier="pro" />
            </div>

            <Divider style={{ margin: '12px 0' }} />
            
            <Button
                appearance="subtle"
                icon={isAdvancedVisible ? <ChevronDown20Filled /> : <ChevronRight20Filled />}
                onClick={() => setIsAdvancedVisible(!isAdvancedVisible)}
                style={{ marginBottom: isAdvancedVisible ? '8px' : '0' }}
            >
                Advanced
            </Button>

            {isAdvancedVisible && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}
                     onMouseDown={(e) => e.stopPropagation()}
                >
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
                </div>
            )}
        </div>
    );
};

export default DiffFilterOptions;