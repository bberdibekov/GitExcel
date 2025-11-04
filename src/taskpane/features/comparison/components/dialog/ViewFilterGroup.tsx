// src/taskpane/features/comparison/components/dialog/ViewFilterGroup.tsx

import * as React from 'react';
import { Button, Label, Divider, makeStyles, shorthands } from '@fluentui/react-components';
import { ViewFilter } from '../../../../types/types';

interface ViewFilterGroupProps {
    activeFilter: ViewFilter;
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

const ViewFilterGroup: React.FC<ViewFilterGroupProps> = ({ activeFilter, onFilterChange }) => {
    const styles = useViewFilterGroupStyles();
    
    return (
        <div className={styles.container}>
            <Label className={styles.label}>View Changes</Label>
            <div className={styles.buttonGroup}>
                <Button
                    appearance={activeFilter === 'all' ? 'primary' : 'outline'}
                    onClick={() => onFilterChange('all')}
                >
                    All
                </Button>
                <Button
                    appearance={activeFilter === 'values' ? 'primary' : 'outline'}
                    onClick={() => onFilterChange('values')}
                >
                    Values
                </Button>
                <Button
                    appearance={activeFilter === 'formulas' ? 'primary' : 'outline'}
                    onClick={() => onFilterChange('formulas')}
                >
                    Formulas
                </Button>
                <Button
                    appearance={activeFilter === 'structural' ? 'primary' : 'outline'}
                    onClick={() => onFilterChange('structural')}
                    disabled // Assuming 'structural' view is not yet implemented
                >
                    Structural
                </Button>
            </div>
        </div>
    );
};

export default ViewFilterGroup;