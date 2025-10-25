// src/taskpane/components/comparison_dialog/ComparisonRow.tsx

import * as React from "react";
import { useState } from "react";
import { mergeClasses } from "@fluentui/react-components";
import { ICombinedChange } from "../../../../types/types";
import { useSharedStyles } from '../../../../shared/styles/sharedStyles';
import ChangeDetailViewer from "./ChangeDetailViewer";
import { Checkbox, CheckboxOnChangeData, Tooltip } from "@fluentui/react-components";
import {
    Calculator16Filled,
    ChevronRight16Filled,
    TextDescription16Filled,
    ArrowUndo16Filled,
} from "@fluentui/react-icons";
import { diffViewerConfig } from "../../../../../config";

interface ComparisonRowProps {
    changeId: string;
    change: ICombinedChange;
    isSelected: boolean;
    onSelectionChange: (changeId: string, isSelected: boolean) => void;
    onNavigate: (sheet: string, address: string) => void;
}

/**
 * Renders a single, interactive row in the comparison report,
 * meticulously structured into a multi-column layout that aligns with the report header.
 */
const ComparisonRow: React.FC<ComparisonRowProps> = (props) => {
    const { changeId, change, isSelected, onSelectionChange, onNavigate } = props;
    const [isExpanded, setIsExpanded] = useState(false);
    const styles = useSharedStyles();

    const isFormula = change.changeType.includes("formula");
    const icon = isFormula ? <Calculator16Filled /> : <TextDescription16Filled />;

    const handleCheckboxChange = (_ev: React.ChangeEvent<HTMLInputElement>, data: CheckboxOnChangeData) => {
        onSelectionChange(changeId, !!data.checked);
    };

    const handlePrimaryClick = () => {
        // The main info block click handles both navigation and expansion.
        onNavigate(change.sheet, change.address);
        setIsExpanded(!isExpanded);
    };

    const handleChevronClick = (e: React.MouseEvent) => {
        // Stop propagation to prevent the primary click (and navigation) from firing.
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleQuickRestoreClick = (e: React.MouseEvent) => {
        // Stop propagation to prevent any other click handlers on the row from firing.
        e.stopPropagation();
        console.log(`[TODO] Quick Restore clicked for: ${changeId}`);
        // Future: onQuickRestore(changeId);
    };

    const renderTruncatedSummary = () => {
        const before = String(isFormula ? change.startFormula : change.startValue ?? "");
        const after = String(isFormula ? change.endFormula : change.endValue ?? "");
        const { startContextLength, diffWindowLength } = diffViewerConfig.truncation;

        if (before.length + after.length < 50) return `${before} → ${after}`;

        const firstDiffIndex = [...after].findIndex((char, i) => char !== before[i]);
        const startIndex = Math.max(0, firstDiffIndex - Math.floor(diffWindowLength / 2));
        const beforeSlice = before.substring(startIndex, startIndex + diffWindowLength);
        const afterSlice = after.substring(startIndex, startIndex + diffWindowLength);
        const startEllipsis = startIndex > 0 ? "..." : "";
        const endEllipsis = startIndex + diffWindowLength < Math.max(before.length, after.length) ? "..." : "";
        return `${startEllipsis}${beforeSlice}${endEllipsis} → ${startEllipsis}${afterSlice}${endEllipsis}`;
    };

    return (
        <li className={styles.listItem_modified} id={`change-${change.sheet}-${change.address}`}>
            {/* The main container uses the row container style to get padding and hover effects */}
            <div className={styles.comparisonRowContainer}>
                {/* Checkbox Column */}
                <div className={styles.columnCheckbox}>
                    <Checkbox checked={isSelected} onChange={handleCheckboxChange} />
                </div>

                {/* Sheet Column */}
                <div className={styles.columnSheet} onClick={handlePrimaryClick}>
                    {change.sheet}
                </div>

                {/* Cell Column */}
                <div className={styles.columnCell} onClick={handlePrimaryClick}>
                    {change.address}
                </div>
                
                {/* Value / Formula Column */}
                <div className={styles.columnValue} onClick={handlePrimaryClick}>
                    {icon}
                    <span className={styles.textSubtle}>{renderTruncatedSummary()}</span>
                </div>

                {/* Action Column */}
                <div className={styles.columnAction}>
                    <Tooltip content="Quick Restore" relationship="label">
                        <span 
                            className={mergeClasses(styles.quickRestoreIcon, "quick-restore-icon-hook")} 
                            onClick={handleQuickRestoreClick}
                        >
                            <ArrowUndo16Filled />
                        </span>
                    </Tooltip>
                    <span className={styles.chevron} onClick={handleChevronClick}>
                        <ChevronRight16Filled style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }} />
                    </span>
                </div>
            </div>

            {/* The expanded detail view appears below the row when active */}
            {isExpanded && <ChangeDetailViewer change={change.history[change.history.length - 1]} />}
        </li>
    );
};

export default ComparisonRow;