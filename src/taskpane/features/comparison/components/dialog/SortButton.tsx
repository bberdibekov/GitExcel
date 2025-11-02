// src/taskpane/features/comparison/components/dialog/SortButton.tsx

import * as React from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import { ArrowSortDownLines24Regular, ArrowSortUpLines24Regular } from '@fluentui/react-icons';

type SortOrder = 'chronological' | 'reverse-chronological';

interface SortButtonProps {
    licenseTier: 'free' | 'pro';
    sortOrder: SortOrder;
    onSortChange: (newOrder: SortOrder) => void;
}

export const SortButton: React.FC<SortButtonProps> = ({ licenseTier, sortOrder, onSortChange }) => {
    const isPro = licenseTier === 'pro';

    const handleClick = () => {
        onSortChange(sortOrder === 'chronological' ? 'reverse-chronological' : 'chronological');
    };

    const button = (
        <Button
            appearance="subtle"
            size="small"
            icon={sortOrder === 'chronological' ? <ArrowSortDownLines24Regular /> : <ArrowSortUpLines24Regular />}
            onClick={handleClick}
            disabled={!isPro}
        >
            {sortOrder === 'chronological' ? 'Oldest First' : 'Newest First'}
        </Button>
    );

    if (isPro) {
        return (
            <Tooltip content={`Sort by time (${sortOrder === 'chronological' ? 'oldest to newest' : 'newest to oldest'})`} relationship="label">
                {button}
            </Tooltip>
        );
    }

    return (
        <Tooltip content="Reverse sort order is a Pro feature." relationship="label">
            <span> {/* Tooltip needs a DOM element to wrap when the child is disabled */}
                {button}
            </span>
        </Tooltip>
    );
};