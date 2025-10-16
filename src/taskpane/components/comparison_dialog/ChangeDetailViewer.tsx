// src/taskpane/components/comparison_dialog/ChangeDetailViewer.tsx

import * as React from "react";
import { useSharedStyles } from "../sharedStyles";
import { IChange } from "../../types/types";
import { diffChars } from "diff";
import { Button, Tooltip } from "@fluentui/react-components";
import { Copy16Filled, ArrowExpand16Filled } from "@fluentui/react-icons";

interface ChangeDetailViewerProps {
    // This component only needs the final state of the change to render the diff.
    change: IChange;
}

/**
 * A self-contained, "dumb" component with a single responsibility: to render a rich,
 * expanded detail view for a single change. It implements a stacked horizontal layout
 * for "Old" and "New" values, handles character-level highlighting, and contains
 * placeholder actions like "Copy". It receives data and renders it without managing any complex state.
 */
const ChangeDetailViewer: React.FC<ChangeDetailViewerProps> = ({ change }) => {
    const styles = useSharedStyles();
    const { oldFormula, newFormula, oldValue, newValue, changeType } = change;

    // Determine which values to compare based on the change type. Formulas are prioritized.
    const beforeValue = changeType.includes("formula") ? oldFormula : oldValue;
    const afterValue = changeType.includes("formula") ? newFormula : newValue;
    const isFormula = changeType.includes("formula");

    // Use the 'diff' library to get a character-level comparison.
    const diffs = diffChars(String(beforeValue ?? ""), String(afterValue ?? ""));

    /**
     * Renders a segment of the diff result with appropriate styling for additions or deletions.
     */
    const renderDiffPart = (part: { value: string; added?: boolean; removed?: boolean }, index: number) => {
        const style: React.CSSProperties = {
            backgroundColor: part.added ? "#e6ffed" : part.removed ? "#ffebe9" : "transparent",
            color: part.added ? "#107c10" : part.removed ? "#a80000" : "inherit",
            textDecoration: part.removed ? "line-through" : "none",
        };
        return <span key={index} style={style}>{part.value}</span>;
    };

    const hasContent = (val: any) => val !== null && val !== undefined && String(val).length > 0;

    return (
        <div className={styles.detailBlock} style={{ marginTop: '8px', padding: '12px' }}>
            {/* "Old" value section */}
            {hasContent(beforeValue) && (
                <div style={{ marginBottom: "8px" }}>
                    <strong className={styles.detailBlock_title}>Old:</strong>
                    <pre className={isFormula ? styles.codeBlock : styles.textBlock}>
                        {diffs.filter(part => !part.added).map(renderDiffPart)}
                    </pre>
                </div>
            )}

            {/* "New" value section */}
            {hasContent(afterValue) && (
                <div>
                    <strong className={styles.detailBlock_title}>New:</strong>
                    <pre className={isFormula ? styles.codeBlock : styles.textBlock}>
                        {diffs.filter(part => !part.removed).map(renderDiffPart)}
                    </pre>
                </div>
            )}

            {/* Actions section, as mandated by the ticket */}
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <Tooltip content="Copy new value to clipboard" relationship="label">
                    <Button icon={<Copy16Filled />} size="small" disabled={!hasContent(afterValue)}>
                        Copy
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