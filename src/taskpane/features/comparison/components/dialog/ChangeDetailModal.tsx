// src/taskpane/features/comparison/components/dialog/ChangeDetailModal.tsx

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogSurface,
    DialogBody,
    Button,
    Badge,
    Tooltip,
    mergeClasses,
} from '@fluentui/react-components';
import {
    Dismiss24Regular,
    Copy16Filled,
} from '@fluentui/react-icons';
import { ICombinedChange } from '../../../../types/types';
import { useChangeDetailModalStyles } from './Styles/ChangeDetailModal.styles';
import { SortButton } from './SortButton';
import { ChangeHistoryItem } from './ChangeHistoryItem';

interface ChangeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    change: ICombinedChange | null;
    licenseTier: 'free' | 'pro';
}

export const ChangeDetailModal: React.FC<ChangeDetailModalProps> = ({ isOpen, onClose, change, licenseTier }) => {
    const styles = useChangeDetailModalStyles();
    const [sortOrder, setSortOrder] = useState<'chronological' | 'reverse-chronological'>('chronological');

    const displayedHistory = useMemo(() => {
        if (!change?.history) {
            return [];
        }
        const historyCopy = [...change.history];
        if (sortOrder === 'reverse-chronological') {
            return historyCopy.reverse();
        }
        return historyCopy;
    }, [change?.history, sortOrder]);

    if (!change) return null;

    const { history, endFormula, endValue, changeType: finalChangeType, metadata } = change;
    const hasContent = (val: any) => val !== null && val !== undefined && String(val).length > 0;
    const isFinalChangeFormula = finalChangeType === 'formula' || finalChangeType === 'both';
    const finalValueToDisplay = isFinalChangeFormula ? endFormula : endValue;
    const isUnchanged = metadata?.isUnchanged === true;
    
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
                                <div className={styles.historyHeader}>
                                    <span className={styles.historyHeaderTitle}>Change History</span>
                                    {history.length > 1 && (
                                        <SortButton
                                            licenseTier={licenseTier}
                                            sortOrder={sortOrder}
                                            onSortChange={setSortOrder}
                                        />
                                    )}
                                </div>
                                {displayedHistory.map(item => (
                                    <ChangeHistoryItem 
                                        key={`${item.fromVersionComment}-${item.toVersionComment}`} 
                                        item={item} 
                                    />
                                ))}
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