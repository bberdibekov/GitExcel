// src/taskpane/features/comparison/components/dialog/ChangeHistoryItem.tsx

import * as React from 'react';
import { Badge, Tooltip, mergeClasses } from '@fluentui/react-components';
import { IChange } from '../../../../types/types';
import { useComparisonDialogStyles } from './ComparisonDialog.styles';
import { diffChars, Change as DiffChange } from "diff";
import { truncateComment } from '../../../../shared/lib/string.utils';

// This constant is specific to the rendering of a history item title.
const MAX_COMMENT_LENGTH = 25;

interface ChangeHistoryItemProps {
    item: IChange;
}

export const ChangeHistoryItem: React.FC<ChangeHistoryItemProps> = ({ item }) => {
    const styles = useComparisonDialogStyles();

    const isFormula = item.changeType === 'formula' || item.changeType === 'both';
    const before = isFormula ? item.oldFormula : item.oldValue;
    const after = isFormula ? item.newFormula : item.newValue;
    
    const hasContent = (val: any) => val !== null && val !== undefined && String(val).length > 0;
    const wasAdded = !hasContent(before);
    const wasRemoved = !hasContent(after);

    const renderTitle = () => {
        if (item.fromVersionComment && item.toVersionComment) {
            const truncatedFrom = truncateComment(item.fromVersionComment, MAX_COMMENT_LENGTH);
            const truncatedTo = truncateComment(item.toVersionComment, MAX_COMMENT_LENGTH);

            if (wasAdded) {
                return (
                    <>
                        <span className={styles.historyStepTitleText}>Content Added in:</span>
                        <Tooltip content={item.toVersionComment} relationship="label">
                            <span className={styles.historyStepVersionComment}>{truncatedTo}</span>
                        </Tooltip>
                    </>
                );
            }
            if (wasRemoved) {
                    return (
                    <>
                        <span className={styles.historyStepTitleText}>Content Removed between</span>
                        <Tooltip content={item.fromVersionComment} relationship="label">
                            <span className={styles.historyStepVersionComment}>{truncatedFrom}</span>
                        </Tooltip>
                        <span className={styles.historyStepTitleText}>and</span>
                        <Tooltip content={item.toVersionComment} relationship="label">
                            <span className={styles.historyStepVersionComment}>{truncatedTo}</span>
                        </Tooltip>
                    </>
                );
            }
            return (
                <>
                    <span className={styles.historyStepTitleText}>Change between</span>
                    <Tooltip content={item.fromVersionComment} relationship="label">
                        <span className={styles.historyStepVersionComment}>{truncatedFrom}</span>
                    </Tooltip>
                    <span className={styles.historyStepTitleText}>and</span>
                    <Tooltip content={item.toVersionComment} relationship="label">
                        <span className={styles.historyStepVersionComment}>{truncatedTo}</span>
                    </Tooltip>
                </>
            );
        }
        // Fallback for safety.
        const titleObject = isFormula ? "Formula" : "Value";
        let titleAction = wasAdded ? "Added" : wasRemoved ? "Removed" : "Changed";
        return <strong className={styles.historyStepTitleText}>{`${titleObject} ${titleAction}`}</strong>;
    };
    
    const diffs = diffChars(String(before ?? ""), String(after ?? ""));

    const renderDiffPart = (part: DiffChange, partIndex: number) => {
        const partClass = mergeClasses(
            styles.diffPart,
            part.added && styles.diffPart_added,
            part.removed && styles.diffPart_removed
        );
        return <span key={partIndex} className={partClass}>{part.value}</span>;
    };

    const lineClass = mergeClasses(styles.diffLine, isFormula && styles.diffLine_formula);

    return (
        <div className={styles.historyStep}>
            <div className={styles.historyStepHeader}>
                <div className={styles.historyStepTitle}>{renderTitle()}</div>
                {isFormula && <Badge appearance="tint" color="informative" size="small">Formula</Badge>}
            </div>
            
            <div className={styles.diffContainer}>
                {hasContent(before) && (
                    <div className={mergeClasses(lineClass, hasContent(after) && styles.diffLine_deleted)}>
                        <span className={mergeClasses(styles.diffSymbol, styles.diffSymbol_deleted)}>−</span>
                        {diffs.filter(p => !p.added).map(renderDiffPart)}
                    </div>
                )}
                
                {hasContent(after) && (
                    <div className={lineClass}>
                        <span className={mergeClasses(styles.diffSymbol, styles.diffSymbol_added)}>+</span>
                        {diffs.filter(p => !p.removed).map(renderDiffPart)}
                    </div>
                )}
            </div>
        </div>
    );
};