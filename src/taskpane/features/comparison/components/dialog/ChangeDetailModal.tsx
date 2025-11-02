// src/taskpane/features/comparison/components/dialog/ChangeDetailModal.tsx

import * as React from 'react';
import { 
    Dialog, 
    DialogSurface, 
    DialogBody, 
    Button,
    Badge,
    Tooltip,
    mergeClasses,
} from '@fluentui/react-components';
import { Dismiss24Regular, Copy16Filled } from '@fluentui/react-icons';
import { ICombinedChange, IChange } from '../../../../types/types';
import { useComparisonDialogStyles } from './ComparisonDialog.styles';
import { diffChars, Change as DiffChange } from "diff";

interface ChangeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    change: ICombinedChange | null;
}

const MAX_COMMENT_LENGTH = 25;

/**
 * A helper function to truncate a string to a maximum length without splitting words.
 * @param text The string to truncate.
 * @param maxLength The maximum character length.
 * @returns The truncated string, with an ellipsis if shortened.
 */
const truncateComment = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    const finalTruncated = lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;

    return finalTruncated + '...';
};


export const ChangeDetailModal: React.FC<ChangeDetailModalProps> = ({ isOpen, onClose, change }) => {
    const styles = useComparisonDialogStyles();

    if (!change) return null;

    const { history, endFormula, endValue, changeType: finalChangeType, metadata } = change;
    const hasContent = (val: any) => val !== null && val !== undefined && String(val).length > 0;
    const isFinalChangeFormula = finalChangeType === 'formula' || finalChangeType === 'both';
    const finalValueToDisplay = isFinalChangeFormula ? endFormula : endValue;
    const isUnchanged = metadata?.isUnchanged === true;

    const renderHistoryItem = (item: IChange, index: number) => {
        const isFormula = item.changeType === 'formula' || item.changeType === 'both';
        const before = isFormula ? item.oldFormula : item.oldValue;
        const after = isFormula ? item.newFormula : item.newValue;
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
            // Fallback for safety
            const titleObject = isFormula ? "Formula" : "Value";
            let titleAction = wasAdded ? "Added" : wasRemoved ? "Removed" : "Changed";
            return <strong className={styles.historyStepTitleText}>{`Step ${index + 1}: ${titleObject} ${titleAction}`}</strong>;
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
            <div key={index} className={styles.historyStep}>
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

    const codeBlockClass = mergeClasses(
        styles.codeBlock,
        isFinalChangeFormula && styles.diffLine_formula 
    );

    return (
        <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
            <DialogSurface className={styles.detailModalSurface}>
                <div className={styles.detailModalHeader}>
                    <div className={styles.detailModalHeaderContent}>
                        <div className={styles.detailModalHeaderItem}>
                            <span className={styles.detailModalHeaderLabel}>Cell:</span>
                            <span className={styles.detailModalHeaderValue}>{change.address}</span>
                        </div>
                        <div className={styles.detailModalHeaderItem}>
                            <span className={styles.detailModalHeaderLabel}>Sheet:</span>
                            <span className={styles.detailModalHeaderValue}>{change.sheet}</span>
                        </div>
                        {isFinalChangeFormula && <Badge appearance="tint" color="brand" size="small">fx</Badge>}
                        {isUnchanged && <Badge appearance="ghost" color="subtle" size="small">Unchanged</Badge>}
                    </div>
                    <Button
                        appearance="subtle"
                        aria-label="close"
                        icon={<Dismiss24Regular />}
                        onClick={onClose}
                    />
                </div>
                
                <DialogBody className={styles.detailModalBody}>
                    <div className={styles.scrollableContent}>
                        {history.length > 0 ? (
                            <div>
                                {history.map(renderHistoryItem)}
                            </div>
                        ) : isUnchanged ? (
                            <div className={styles.infoBlock}>
                                <div className={styles.infoBlockTitle}>Current Value:</div>
                                <pre className={codeBlockClass}>
                                    {String(finalValueToDisplay ?? '')}
                                </pre>
                            </div>
                        ) : null}

                        {hasContent(finalValueToDisplay) && (
                            <div className={mergeClasses(styles.finalValueBlock, history.length > 0 && styles.finalValueBlock_withHistory)}>
                                <div className={styles.finalValueTitle}>
                                    <span>Final Value:</span>
                                    <Tooltip content="Copy to clipboard" relationship="label">
                                        <Button 
                                            icon={<Copy16Filled />} 
                                            size="small" 
                                            appearance="subtle"
                                            onClick={() => navigator.clipboard.writeText(String(finalValueToDisplay))}
                                        >
                                            Copy
                                        </Button>
                                    </Tooltip>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};

export default ChangeDetailModal;