//src/taskpane/components/comparison_dialog/ComparisonRow.tsx
import * as React from "react";
import { useState } from "react";
import { ICombinedChange } from "../../types/types";
import { useSharedStyles } from "../sharedStyles";
import ChangeDetailViewer from "./ChangeDetailViewer";
import { Checkbox, CheckboxOnChangeData } from "@fluentui/react-components";
import {
    Calculator16Filled,
    ChevronRight16Filled,
    TextDescription16Filled,
    ArrowUndo16Filled,
} from "@fluentui/react-icons";
import { diffViewerConfig } from "../../../config";

interface ComparisonRowProps {
    changeId: string;
    change: ICombinedChange;
    isSelected: boolean;
    onSelectionChange: (changeId: string, isSelected: boolean) => void;
    onNavigate: (sheet: string, address: string) => void;
}

const ComparisonRow: React.FC<ComparisonRowProps> = (props) => {
    const { changeId, change, isSelected, onSelectionChange, onNavigate } = props;
    const [isExpanded, setIsExpanded] = useState(false);
    const styles = useSharedStyles();

    const isFormula = change.changeType.includes("formula");
    const icon = isFormula ? <Calculator16Filled /> : <TextDescription16Filled />;
    
    const handleCheckboxChange = (
      _ev: React.ChangeEvent<HTMLInputElement>,
      data: CheckboxOnChangeData
    ) => {
      onSelectionChange(changeId, !!data.checked);
    };

    const renderTruncatedSummary = () => {
        const before = String(isFormula ? change.startFormula : change.startValue ?? "");
        const after = String(isFormula ? change.endFormula : change.endValue ?? "");
        const { startContextLength, diffWindowLength, endContextLength } = diffViewerConfig.truncation;

        if (before.length + after.length < 50) {
            return `${before} → ${after}`;
        }

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
            <div className={styles.flexRow} style={{ alignItems: "center", padding: "8px 0" }}>
                <div style={{ paddingRight: "8px" }}>
                    <Checkbox
                        checked={isSelected}
                        onChange={handleCheckboxChange}
                    />
                </div>
                <div onClick={() => onNavigate(change.sheet, change.address)} style={{ flexGrow: 1, cursor: "pointer" }}>
                    <div style={{ fontWeight: "bold" }}>
                        {change.sheet}!{change.address}
                    </div>
                    <div className={styles.textSubtle} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {icon}
                        <span>{renderTruncatedSummary()}</span>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", paddingLeft: "8px", gap: "4px" }}>
                    <span title="Quick Restore (coming soon)">
                        <ArrowUndo16Filled />
                    </span>
                    <span onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: "pointer" }}>
                        <ChevronRight16Filled style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </span>
                </div>
            </div>

            {isExpanded && <ChangeDetailViewer change={change.history[change.history.length - 1]} />}
        </li>
    );
};

export default ComparisonRow;