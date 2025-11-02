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

        let titleAction = "Changed";
        if (!hasContent(before)) titleAction = "Added";
        if (!hasContent(after)) titleAction = "Removed";
        const titleObject = isFormula ? "Formula" : "Value";
        const title = `Step ${index + 1}: ${titleObject} ${titleAction}`;
        
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
                    <strong className={styles.historyStepTitle}>{title}</strong>
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