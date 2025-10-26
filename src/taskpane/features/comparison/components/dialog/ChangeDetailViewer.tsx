// src/taskpane/components/comparison_dialog/ChangeDetailViewer.tsx

import * as React from "react";
import { useSharedStyles } from "../../../../shared/styles/sharedStyles";
import { IChange, ICombinedChange } from "../../../../types/types";
import { diffChars, Change as DiffChange } from "diff";
import { Button, Tooltip, mergeClasses } from "@fluentui/react-components";
import { Copy16Filled, ArrowExpand16Filled } from "@fluentui/react-icons";

interface ChangeDetailViewerProps {
    change: ICombinedChange;
}

/**
 * A self-contained, "dumb" component with a single responsibility: to render a rich,
 * expanded detail view for a single cell's entire change history. It iterates through
 * each modification, prioritizing the display of formulas to provide maximum context.
 * It receives all data and renders it without managing any complex state.
 */
const ChangeDetailViewer: React.FC<ChangeDetailViewerProps> = ({ change }) => {
    const styles = useSharedStyles();
    const { history, endFormula, endValue, changeType: finalChangeType } = change;

    const hasContent = (val: any) => val !== null && val !== undefined && String(val).length > 0;

    const isFinalChangeFormula = finalChangeType === 'formula' || finalChangeType === 'both';
    const finalValueToDisplay = isFinalChangeFormula ? endFormula : endValue;

    /**
     * Renders a single, atomic change from the history as a "grouped transaction",
     * using symbols and colored borders for a cleaner, more intuitive presentation.
     */
    const renderHistoryItem = (item: IChange, index: number) => {
        const isFormula = item.changeType === 'formula' || item.changeType === 'both';
        const before = isFormula ? item.oldFormula : item.oldValue;
        const after = isFormula ? item.newFormula : item.newValue;

        let titleAction = "Changed";
        let transactionClass = styles.transactionBlock_modified;
        if (!hasContent(before)) {
            titleAction = "Added";
            transactionClass = styles.transactionBlock_added;
        }
        if (!hasContent(after)) {
            titleAction = "Removed";
            transactionClass = styles.transactionBlock_deleted;
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

        return (
            <div key={index} className={styles.historyStep}>
                <strong className={mergeClasses(styles.detailBlock_title, styles.historyStepTitle)}>
                    {title}
                </strong>
                
                <div className={mergeClasses(styles.transactionBlock, transactionClass)}>
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