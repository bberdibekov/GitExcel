// src/taskpane/features/comparison/components/dialog/ChangeDetailViewer.tsx

import * as React from "react";
import { useSharedStyles } from "../../../../shared/styles/sharedStyles";
import { IChange, ICombinedChange } from "../../../../types/types";
import { diffChars, Change as DiffChange } from "diff";
import { Button, Tooltip, mergeClasses } from "@fluentui/react-components";
import { Copy16Filled, ArrowExpand16Filled } from "@fluentui/react-icons";

interface ChangeDetailViewerProps {
    change: ICombinedChange;
}

const ChangeDetailViewer: React.FC<ChangeDetailViewerProps> = ({ change }) => {
    const styles = useSharedStyles();
    const { history, endFormula, endValue, changeType: finalChangeType } = change;

    const hasContent = (val: any) => val !== null && val !== undefined && String(val).length > 0;

    const isFinalChangeFormula = finalChangeType === 'formula' || finalChangeType === 'both';
    const finalValueToDisplay = isFinalChangeFormula ? endFormula : endValue;

    const renderHistoryItem = (item: IChange, index: number) => {
        const isFormula = item.changeType === 'formula' || item.changeType === 'both';
        const before = isFormula ? item.oldFormula : item.oldValue;
        const after = isFormula ? item.newFormula : item.newValue;

        let titleAction = "Changed";
        if (!hasContent(before)) {
            titleAction = "Added";
        }
        if (!hasContent(after)) {
            titleAction = "Removed";
        }
        const titleObject = isFormula ? "Formula" : "Value";
        const title = `Step ${index + 1}: ${titleObject} ${titleAction}`;
        
        const diffs = diffChars(String(before ?? ""), String(after ?? ""));

        const renderDiffPart = (part: DiffChange, partIndex: number) => {
            const style: React.CSSProperties = {
                backgroundColor: part.added ? "#e6ffed" : part.removed ? "#ffebe9" : "transparent",
                color: part.added ? "#107c10" : part.removed ? "#a80000" : "inherit",
                textDecoration: part.removed ? "line-through" : "none",
            };
            return <span key={partIndex}>{part.value}</span>;
        };

        // --- MODIFICATION START: Remove the logic that uses the deleted style classes ---
        return (
            <div key={index} className={styles.historyStep}>
                <strong className={mergeClasses(styles.detailBlock_title, styles.historyStepTitle)}>
                    {title}
                </strong>
                
                {/* 
                  This container now uses a single, unchanging style class.
                  The logic for `transactionClass` has been removed.
                */}
                <div className={styles.transactionBlock}>
                    {hasContent(before) && (
                        <pre className={mergeClasses(isFormula ? styles.codeBlock : styles.textBlock, styles.transactionLine)}>
                            <span className={mergeClasses(styles.diffSymbol, styles.diffSymbol_deleted)}>-</span>
                            {diffs.filter(p => !p.added).map(renderDiffPart)}
                        </pre>
                    )}
                    
                    {hasContent(after) && (
                        <pre className={mergeClasses(isFormula ? styles.codeBlock : styles.textBlock, styles.transactionLine)}>
                            <span className={mergeClasses(styles.diffSymbol, styles.diffSymbol_added)}>+</span>
                            {diffs.filter(p => !p.removed).map(renderDiffPart)}
                        </pre>
                    )}
                </div>
            </div>
        );
        // --- MODIFICATION END ---
    };

    return (
        <div className={styles.detailBlock}>
            {history.map(renderHistoryItem)}

            <div style={{ marginTop: "12px", display: "flex", gap: "8px", borderTop: history.length > 0 ? '1px solid #e0e0e0' : 'none', paddingTop: '12px' }}>
                <Tooltip content="Copy final value to clipboard" relationship="label">
                    <Button 
                        icon={<Copy16Filled />} 
                        size="small" 
                        disabled={!hasContent(finalValueToDisplay)}
                        onClick={() => navigator.clipboard.writeText(String(finalValueToDisplay))}
                    >
                        Copy Final
                    </Button>
                </Tooltip>
                <Tooltip content="Pop-out to a dedicated viewer (coming soon)" relationship="label">
                    <Button icon={<ArrowExpand16Filled />} size="small" disabled>
                        Pop-out
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
};

export default ChangeDetailViewer;