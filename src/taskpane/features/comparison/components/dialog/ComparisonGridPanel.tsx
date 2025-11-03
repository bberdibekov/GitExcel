// src/taskpane/features/comparison/components/dialog/ComparisonGridPanel.tsx

import * as React from 'react';
// --- REMOVED: Unused imports for Button, Tooltip, and icons. ---
import { GridImperativeAPI } from 'react-window';
import { ICombinedChange, ISheetSnapshot } from '../../../../types/types';
import VirtualizedDiffGrid from './VirtualizedDiffGrid';
import { useComparisonGridPanelStyles } from './Styles/ComparisonGridPanel.styles';

interface ComparisonGridPanelProps {
    panelType: 'start' | 'end';
    versionComment: string;
    containerRef: React.RefObject<HTMLDivElement>;
    gridRef: React.RefObject<GridImperativeAPI>;
    sheet: ISheetSnapshot | undefined;
    changeMap: Map<string, ICombinedChange>;
    sheetName: string;
    rowCount: number;
    colCount: number;
    columnWidths: number[] | undefined;
    onScroll: (scrollTop: number, scrollLeft: number) => void;
    onCellClick: (change: ICombinedChange) => void;
    highlightOnlyMode: boolean;
    changedRows: Set<number>;
    changedCols: Set<number>;
    children?: React.ReactNode; // To allow passing the Minimap
}

const ComparisonGridPanel: React.FC<ComparisonGridPanelProps> = (props) => {
    const {
        versionComment,
        containerRef,
        gridRef,
        sheet,
        changeMap,
        sheetName,
        rowCount,
        colCount,
        columnWidths,
        onScroll,
        onCellClick,
        highlightOnlyMode,
        changedRows,
        changedCols,
        children
    } = props;

    const styles = useComparisonGridPanelStyles();

    return (
        <div className={styles.gridColumn} ref={containerRef}>
            {/* --- MODIFIED: Replaced the overlay with a proper header --- */}
            <div className={styles.panelHeader}>
                {versionComment}
            </div>

            <div className={styles.gridContentContainer}>
                <VirtualizedDiffGrid
                    gridRef={gridRef}
                    sheet={sheet}
                    changeMap={changeMap}
                    sheetName={sheetName}
                    rowCount={rowCount}
                    colCount={colCount}
                    startRow={sheet?.startRow ?? 0}
                    startCol={sheet?.startCol ?? 0}
                    columnWidths={columnWidths}
                    onScroll={onScroll}
                    onCellClick={onCellClick}
                    highlightOnlyMode={highlightOnlyMode}
                    changedRows={changedRows}
                    changedCols={changedCols}
                />
            </div>

            {children}
        </div>
    );
};

export default ComparisonGridPanel;