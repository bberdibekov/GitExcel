// src/taskpane/features/comparison/components/dialog/SideBySideDiffViewer.tsx

import * as React from 'react';
import { useMemo } from 'react';
import {
    IDiffResult,
    ICombinedChange,
    ISheetSnapshot,
    VisiblePanel
} from '../../../../types/types';
import { useSideBySideDiffViewerStyles } from './Styles/SideBySideDiffViewer.styles';
import { ChangeDetailModal } from './ChangeDetailModal';
import { Minimap } from './Minimap';
import ComparisonGridPanel from './ComparisonGridPanel';
import FloatingViewControls from './FloatingViewControls';
import { useResizablePanels } from '../../hooks/useResizablePanels';
import { useSyncedGrids } from '../../hooks/useSyncedGrids';
import { GridMap } from '../../hooks/useComparisonData';

interface SideBySideDiffViewerProps {
    result: IDiffResult;
    startVersionComment: string;
    endVersionComment: string;
    licenseTier: 'free' | 'pro';

    affectedSheetNames: string[];
    startSheet: ISheetSnapshot | undefined;
    endSheet: ISheetSnapshot | undefined;
    changeMap: Map<string, ICombinedChange>;
    changedRowsAndCols: { rows: Set<number>; cols: Set<number>; };
    unifiedColumnWidths: number[];
    changeCoordinates: { rowIndex: number; colIndex: number; }[];
    rowCount: number;
    colCount: number;

    startGridMap: GridMap;
    endGridMap: GridMap;
    showStructuralChanges: boolean;

    visiblePanel: VisiblePanel;
    highlightOnlyMode: boolean;

    selectedChange: ICombinedChange | null;
    onCellClick: (change: ICombinedChange) => void;
    onModalClose: () => void;
}


const SideBySideDiffViewer: React.FC<SideBySideDiffViewerProps> = (props) => {
    const {
        result,
        startVersionComment,
        endVersionComment,
        licenseTier,
        affectedSheetNames,
        startSheet,
        endSheet,
        changeMap,
        changedRowsAndCols,
        unifiedColumnWidths,
        changeCoordinates,
        rowCount,
        colCount,
        startGridMap,
        endGridMap,
        showStructuralChanges,
        visiblePanel,
        highlightOnlyMode,
        selectedChange,
        onCellClick,
        onModalClose
    } = props;
    const styles = useSideBySideDiffViewerStyles();

    const { leftPanelWidth, resizerRef, containerRef: gridsBodyRef, handleResizeMouseDown, isResizing } = useResizablePanels();
    const { gridStartRef, gridEndRef, leftGridContainerRef, rightGridContainerRef, viewport, onScrollStart, onScrollEnd, handleMinimapNavigate } = useSyncedGrids(visiblePanel);

    const totalGridContentWidth = useMemo(() => {
        let totalWidth = 0;
        const DEFAULT_COL_WIDTH = 100;
        for (let i = 0; i < colCount; i++) {
            totalWidth += unifiedColumnWidths[i] ?? DEFAULT_COL_WIDTH;
        }
        return totalWidth;
    }, [unifiedColumnWidths, colCount]);

    const totalGridContentHeight = rowCount * 22;

    const leftPanelStyle: React.CSSProperties = {
        width: visiblePanel === 'start' ? '100%' : `${leftPanelWidth}%`,
        flexShrink: 0,
        display: 'flex',
    };

    return (
        <div className={`${styles.rootContainer} ${isResizing ? styles.isResizingGrids : ''}`}>

            <ChangeDetailModal isOpen={!!selectedChange} onClose={onModalClose} change={selectedChange} licenseTier={licenseTier} />

            <div className={styles.gridsBody} ref={gridsBodyRef}>
                <FloatingViewControls affectedSheetNames={affectedSheetNames} />

                {visiblePanel !== 'end' && (
                    <div style={leftPanelStyle}>
                        <ComparisonGridPanel
                            panelType="start"
                            versionComment={startVersionComment}
                            containerRef={leftGridContainerRef}
                            gridRef={gridStartRef}
                            sheet={startSheet}
                            changeMap={changeMap}
                            sheetName={startSheet?.name ?? ''}
                            rowCount={rowCount}
                            colCount={colCount}
                            columnWidths={unifiedColumnWidths}
                            onScroll={onScrollStart}
                            onCellClick={onCellClick}
                            highlightOnlyMode={highlightOnlyMode}
                            changedRows={changedRowsAndCols.rows}
                            changedCols={changedRowsAndCols.cols}
                            gridMap={startGridMap}
                            showStructuralChanges={showStructuralChanges}
                        />
                    </div>
                )}

                {visiblePanel === 'both' && (
                    <div className={styles.gridSeparator} ref={resizerRef} onMouseDown={handleResizeMouseDown}>
                        <div className={styles.dragHandle}><span>&#8942;</span></div>
                    </div>
                )}

                {visiblePanel !== 'start' && (
                    <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
                        <ComparisonGridPanel
                            panelType="end"
                            versionComment={endVersionComment}
                            containerRef={rightGridContainerRef}
                            gridRef={gridEndRef}
                            sheet={endSheet}
                            changeMap={changeMap}
                            sheetName={endSheet?.name ?? ''}
                            rowCount={rowCount}
                            colCount={colCount}
                            columnWidths={unifiedColumnWidths}
                            onScroll={onScrollEnd}
                            onCellClick={onCellClick}
                            highlightOnlyMode={highlightOnlyMode}
                            changedRows={changedRowsAndCols.rows}
                            changedCols={changedRowsAndCols.cols}
                            gridMap={endGridMap}
                            showStructuralChanges={showStructuralChanges}
                        >
                            {affectedSheetNames.length > 0 && (
                                <Minimap
                                    totalRowCount={rowCount}
                                    totalColumnCount={colCount}
                                    changeCoordinates={changeCoordinates}
                                    viewport={viewport}
                                    onNavigate={handleMinimapNavigate}
                                    gridPixelWidth={totalGridContentWidth}
                                    gridPixelHeight={totalGridContentHeight}
                                />
                            )}
                        </ComparisonGridPanel>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SideBySideDiffViewer;