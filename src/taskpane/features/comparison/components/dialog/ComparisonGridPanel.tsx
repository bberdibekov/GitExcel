// src/taskpane/features/comparison/components/dialog/ComparisonGridPanel.tsx

import * as React from 'react';
import { GridImperativeAPI } from 'react-window';
import { ICombinedChange, ISheetSnapshot } from '../../../../types/types';
import VirtualizedDiffGrid from './VirtualizedDiffGrid';
import { useComparisonGridPanelStyles } from './Styles/ComparisonGridPanel.styles';
import { GridMap } from '../../hooks/useComparisonData';

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
    
    gridMap: GridMap;
    showStructuralChanges: boolean;
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
        children,
        gridMap,
        showStructuralChanges,
    } = props;

    const styles = useComparisonGridPanelStyles();

    return (
        <div className={styles.gridColumn} ref={containerRef}>
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
                    gridMap={gridMap}
                    showStructuralChanges={showStructuralChanges}
                />
            </div>

            {children}
        </div>
    );
};

export default ComparisonGridPanel;