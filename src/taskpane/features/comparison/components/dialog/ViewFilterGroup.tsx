// src/taskpane/features/comparison/components/dialog/ViewFilterGroup.tsx

import * as React from 'react';
import { Button, Label, makeStyles, shorthands } from '@fluentui/react-components';
import { ViewFilter } from '../../../../types/types';

interface ViewFilterGroupProps {
    activeFilters: Set<ViewFilter>; // This interface is correct from my previous change
    onFilterChange: (filter: ViewFilter) => void;
}

const useViewFilterGroupStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap('8px'),
    },
    buttonGroup: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        ...shorthands.gap('8px'),
    },
    label: {
        fontWeight: '600',
    }
});

// --- Destructure `activeFilters` instead of `activeFilter` ---
const ViewFilterGroup: React.FC<ViewFilterGroupProps> = ({ activeFilters, onFilterChange }) => {
    const styles = useViewFilterGroupStyles();
    
    return (
        <div className={styles.container}>
            <Label className={styles.label}>View Changes</Label>
            <div className={styles.buttonGroup}>
                <Button
                    // --- Check for the filter in the Set ---
                    appearance={activeFilters.has('all') ? 'primary' : 'outline'}
                    onClick={() => onFilterChange('all')}
                >
                    All
                </Button>
                <Button
                    appearance={activeFilters.has('values') ? 'primary' : 'outline'}
                    onClick={() => onFilterChange('values')}
                >
                    Values
                </Button>
                <Button
                    appearance={activeFilters.has('formulas') ? 'primary' : 'outline'}
                    onClick={() => onFilterChange('formulas')}
                >
                    Formulas
                </Button>
                <Button
                    appearance={activeFilters.has('structural') ? 'primary' : 'outline'}
                    onClick={() => onFilterChange('structural')}
                    // No longer disabled
                >
                    Structural
                </Button>
            </div>
        </div>
    );
};

export default ViewFilterGroup;