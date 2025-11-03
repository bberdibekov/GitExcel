// src/taskpane/features/comparison/components/dialog/ComparisonSummary.tsx

import * as React from 'react';
import { Subtitle2, Body1, Divider } from '@fluentui/react-components';
import { IHighLevelChange } from '../../../../types/types';
import { useComparisonSummaryStyles } from './Styles/ComparisonSummary.styles';

interface ComparisonSummaryProps {
    totalChanges: number;
    valueChanges: number;
    formulaChanges: number;
    highLevelChanges: IHighLevelChange[];
}

const ComparisonSummary: React.FC<ComparisonSummaryProps> = (props) => {
    const { totalChanges, valueChanges, formulaChanges, highLevelChanges } = props;
    const styles = useComparisonSummaryStyles();

    return (
        <div className={styles.summaryContainer}>
            <Subtitle2 as="h3" block className={styles.paneSectionHeader}>
                Summary
            </Subtitle2>

            <div className={styles.summaryStatsGrid}>
                <div className={styles.summaryStatItem}>
                    <Body1 block className={styles.summaryStatValue}>{totalChanges}</Body1>
                    <span className={styles.summaryStatLabel}>Total Changes</span>
                </div>
                <div className={styles.summaryStatItem}>
                    <Body1 block className={styles.summaryStatValue}>{valueChanges}</Body1>
                    <span className={styles.summaryStatLabel}>Value</span>
                </div>
                <div className={styles.summaryStatItem}>
                    <Body1 block className={styles.summaryStatValue}>{formulaChanges}</Body1>
                    <span className={styles.summaryStatLabel}>Formula</span>
                </div>
            </div>

            {highLevelChanges.length > 0 && (
                <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Subtitle2 as="h3" block className={styles.paneSectionHeader}>
                        Structural Changes
                    </Subtitle2>
                    <ul className={styles.highLevelChangesList}>
                        {highLevelChanges.map((change, index) => (
                            <li key={index}>
                                <strong>{change.sheet}:</strong> {change.description}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

export default ComparisonSummary;