// src/taskpane/features/comparison/components/dialog/SideBySideDiffViewer.tsx

import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { IWorkbookSnapshot, IDiffResult, IHighLevelChange, ICombinedChange, ViewFilter} from '../../../../types/types';
import { generateSummary } from '../../services/summary.service';
import { type GridImperativeAPI } from 'react-window';
import { useSideBySideDiffViewerStyles } from './Styles/SideBySideDiffViewer.styles';
import { loggingService } from '../../../../core/services/LoggingService';
import { ChangeDetailModal } from './ChangeDetailModal';
import { Minimap } from './Minimap';
import FloatingToolbar from './FloatingToolbar';
import { ISummaryStats } from '../../services/summary.service';
import ComparisonGridPanel from './ComparisonGridPanel';
import FloatingViewControls from './FloatingViewControls';

interface SideBySideDiffViewerProps {
    result: IDiffResult;
    startSnapshot: IWorkbookSnapshot;
    endSnapshot: IWorkbookSnapshot;
    startVersionComment: string;
    endVersionComment: string;
    licenseTier: 'free' | 'pro';
    
    // Props plumbed from DialogComparisonView
    highLevelChanges: IHighLevelChange[];
    summaryStats: ISummaryStats;
    activeViewFilter: ViewFilter;
    activeComparisonSettings: Set<string>;
    onViewFilterChange: (filter: ViewFilter) => void;
    onComparisonSettingChange: (changedSettings: Record<string, string[]>) => void;
}

const colLetterToIndex = (letters: string): number => {
    let result = 0;
    for (let i = 0; i < letters.length; i++) {
        result = result * 26 + (letters.charCodeAt(i) - 64);
    }
    return result - 1;
};

const getSheetIdByName = (snapshot: IWorkbookSnapshot, sheetName: string): string | undefined => {
    return Object.keys(snapshot).find(id => snapshot[id].name === sheetName);
};


const SideBySideDiffViewer: React.FC<SideBySideDiffViewerProps> = (props) => {
    const { 
        result, 
        startSnapshot, 
        endSnapshot, 
        startVersionComment, 
        endVersionComment, 
        licenseTier 
    } = props;
    const styles = useSideBySideDiffViewerStyles();
    const [selectedChange, setSelectedChange] = useState<ICombinedChange | null>(null);
    const [highlightOnlyMode, setHighlightOnlyMode] = useState(false);
    const [visiblePanel, setVisiblePanel] = useState<'both' | 'start' | 'end'>('both');
    const summary = useMemo(() => generateSummary(result), [result]);
    const affectedSheetNames = useMemo(() => {
        const sheetsFromCells = result.modifiedCells.map(c => c.sheet);
        const sheetsFromStructure = summary.highLevelChanges.map(c => c.sheet);
        return [...new Set([...sheetsFromCells, ...sheetsFromStructure])];
    }, [result, summary]);
    const [selectedSheetName, setSelectedSheetName] = useState<string>(affectedSheetNames[0] ?? "");

    useEffect(() => {
        setVisiblePanel('both');
    }, [selectedSheetName]);

    const changeMap = useMemo(() => {
        const map = new Map<string, ICombinedChange>();
        for (const change of result.modifiedCells) {
            if (change.sheet === selectedSheetName) {
                map.set(`${change.sheet}-${change.address}`, change);
            }
        }
        return map;
    }, [result, selectedSheetName]);

    const changedRowsAndCols = useMemo(() => {
        const rows = new Set<number>();
        const cols = new Set<number>();
        
        for (const change of result.modifiedCells) {
            if (change.sheet === selectedSheetName) {
                const match = change.address.match(/^([A-Z]+)(\d+)$/);
                if (match) {
                    const colStr = match[1];
                    const rowNum = parseInt(match[2], 10);
                    
                    let colIndex = 0;
                    for (let i = 0; i < colStr.length; i++) {
                        colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 64);
                    }
                    
                    rows.add(rowNum - 1);
                    cols.add(colIndex - 1);
                }
            }
        }
        
        return { rows, cols };
    }, [result, selectedSheetName]);

    const { startSheet, endSheet } = useMemo(() => {
        const startSheetId = getSheetIdByName(startSnapshot, selectedSheetName);
        const endSheetId = getSheetIdByName(endSnapshot, selectedSheetName);
        return {
            startSheet: startSheetId ? startSnapshot[startSheetId] : undefined,
            endSheet: endSheetId ? endSnapshot[endSheetId] : undefined
        };
    }, [selectedSheetName, startSnapshot, endSnapshot]);
        
    const unifiedColumnWidths = useMemo(() => {
        const startWidths = startSheet?.columnWidths || [];
        const endWidths = endSheet?.columnWidths || [];
        const maxCols = Math.max(startWidths.length, endWidths.length);
        const unified: number[] = [];
        const DEFAULT_COL_WIDTH = 100;

        for (let i = 0; i < maxCols; i++) {
            const startWidth = startWidths[i] || DEFAULT_COL_WIDTH;
            const endWidth = endWidths[i] || DEFAULT_COL_WIDTH;
            unified.push(Math.max(startWidth, endWidth));
        }
        return unified;
    }, [startSheet, endSheet]);

    const gridStartRef = useRef<GridImperativeAPI | null>(null);
    const gridEndRef = useRef<GridImperativeAPI | null>(null);
    const isScrolling = useRef(false);
    
    const leftGridContainerRef = useRef<HTMLDivElement | null>(null);
    const rightGridContainerRef = useRef<HTMLDivElement | null>(null);

    const [viewport, setViewport] = useState({
        scrollTop: 0,
        scrollLeft: 0,
        viewportWidth: 1,
        viewportHeight: 1,
    });

    useEffect(() => {
        let container: HTMLDivElement | null = null;
        if (visiblePanel === 'start') {
            container = leftGridContainerRef.current;
        } else if (visiblePanel === 'end' || visiblePanel === 'both') {
            container = rightGridContainerRef.current;
        }

        if (!container) return () => {};

        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = container.getBoundingClientRect();
            const approxGridHeight = height - 30; 
            setViewport(prev => ({ ...prev, viewportWidth: width, viewportHeight: approxGridHeight }));
        });

        resizeObserver.observe(container);
        
        return () => {
            resizeObserver.disconnect();
        };
    }, [visiblePanel]);

    const onScrollStart = (scrollTop: number, scrollLeft: number) => {
        setViewport(prev => ({...prev, scrollTop, scrollLeft}));
        if (isScrolling.current) return;
        isScrolling.current = true;
        const targetElement = gridEndRef.current?.element;
        if (targetElement) {
            targetElement.scrollTop = scrollTop;
            targetElement.scrollLeft = scrollLeft;
        }
        requestAnimationFrame(() => { isScrolling.current = false; });
    };
    
    const onScrollEnd = (scrollTop: number, scrollLeft: number) => {
        setViewport(prev => ({...prev, scrollTop, scrollLeft}));
        if (isScrolling.current) return;
        isScrolling.current = true;
        const targetElement = gridStartRef.current?.element;
        if (targetElement) {
            targetElement.scrollTop = scrollTop;
            targetElement.scrollLeft = scrollLeft;
        }
        requestAnimationFrame(() => { isScrolling.current = false; });
    };

    const handleCellClick = (change: ICombinedChange) => {
        loggingService.log("[SideBySideDiffViewer] Cell clicked. Staging change for detail view.", change);
        setSelectedChange(change);
    };

    const handleModalClose = () => {
        loggingService.log("[SideBySideDiffViewer] Closing detail view modal.");
        setSelectedChange(null);
    };

    const rowCount = Math.max(
        (startSheet?.startRow ?? 0) + (startSheet?.data.length ?? 0),
        (endSheet?.startRow ?? 0) + (endSheet?.data.length ?? 0)
    );
    const colCount = Math.max(
        (startSheet?.startCol ?? 0) + (startSheet?.data[0]?.cells.length ?? 0),
        (endSheet?.startCol ?? 0) + (endSheet?.data[0]?.cells.length ?? 0)
    );

    const changeCoordinates = useMemo(() => {
        const coords = [];
        for (const cell of result.modifiedCells) {
            if (cell.sheet !== selectedSheetName) continue;
            const match = cell.address.match(/^([A-Z]+)(\d+)$/);
            if (match) {
                const colIndex = colLetterToIndex(match[1]);
                const rowIndex = parseInt(match[2], 10) - 1;
                coords.push({ rowIndex, colIndex });
            }
        }
        return coords;
    }, [result.modifiedCells, selectedSheetName]);

    const totalGridContentWidth = useMemo(() => {
        return unifiedColumnWidths.reduce((sum, width) => sum + width, 0);
    }, [unifiedColumnWidths]);

    const totalGridContentHeight = rowCount * 22;

    const handleMinimapNavigate = (scrollTop: number, scrollLeft: number) => {
        const startElement = gridStartRef.current?.element;
        if (startElement) {
            startElement.scrollTop = scrollTop;
            startElement.scrollLeft = scrollLeft;
        }
        const endElement = gridEndRef.current?.element;
        if (endElement) {
            endElement.scrollTop = scrollTop;
            endElement.scrollLeft = scrollLeft;
        }
    };

    return (
        <div className={styles.rootContainer}>
            <FloatingToolbar
                onSummaryClick={() => console.log("Summary clicked")}
                onFilterClick={() => console.log("Filter clicked")}
                onSettingsClick={() => console.log("Settings clicked")}
                onRestoreClick={() => console.log("Restore clicked")}
                isRestoreDisabled={result.modifiedCells.length === 0}
            />

            <ChangeDetailModal
                isOpen={!!selectedChange}
                onClose={handleModalClose}
                change={selectedChange}
                licenseTier={licenseTier}
            />

            {/* --- DELETED: The entire 'controlsBar' div has been removed. --- */}
            
            <div className={styles.gridsBody}>
                {/* --- ADDED: The new unified floating control panel --- */}
                <FloatingViewControls
                    affectedSheetNames={affectedSheetNames}
                    selectedSheetName={selectedSheetName}
                    onSheetChange={setSelectedSheetName}
                    visiblePanel={visiblePanel}
                    onVisibilityChange={setVisiblePanel}
                    highlightOnlyMode={highlightOnlyMode}
                    onHighlightModeChange={setHighlightOnlyMode}
                />
                
                {visiblePanel !== 'end' && (
                    <ComparisonGridPanel
                        panelType="start"
                        versionComment={startVersionComment}
                        containerRef={leftGridContainerRef}
                        gridRef={gridStartRef}
                        sheet={startSheet}
                        changeMap={changeMap}
                        sheetName={selectedSheetName}
                        rowCount={rowCount}
                        colCount={colCount}
                        columnWidths={unifiedColumnWidths}
                        onScroll={onScrollStart}
                        onCellClick={handleCellClick}
                        highlightOnlyMode={highlightOnlyMode}
                        changedRows={changedRowsAndCols.rows}
                        changedCols={changedRowsAndCols.cols}
                    />
                )}
                
                {visiblePanel === 'both' && (
                    <div className={styles.gridSeparator} />
                )}
                
                {visiblePanel !== 'start' && (
                    <ComparisonGridPanel
                        panelType="end"
                        versionComment={endVersionComment}
                        containerRef={rightGridContainerRef}
                        gridRef={gridEndRef}
                        sheet={endSheet}
                        changeMap={changeMap}
                        sheetName={selectedSheetName}
                        rowCount={rowCount}
                        colCount={colCount}
                        columnWidths={unifiedColumnWidths}
                        onScroll={onScrollEnd}
                        onCellClick={handleCellClick}
                        highlightOnlyMode={highlightOnlyMode}
                        changedRows={changedRowsAndCols.rows}
                        changedCols={changedRowsAndCols.cols}
                    >
                        {affectedSheetNames.length > 0 && changeCoordinates.length > 0 && (
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
                )}
            </div>
        </div>
    );
};

export default SideBySideDiffViewer;