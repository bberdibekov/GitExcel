// src/taskpane/features/comparison/components/dialog/SideBySideDiffViewer.tsx

import * as React from 'react';
import { useState, useMemo, useRef } from 'react';
import { IWorkbookSnapshot, IDiffResult, IHighLevelChange, ICombinedChange } from '../../../../types/types';
import { generateSummary } from '../../services/summary.service';
import { Tab, TabList, Subtitle2, Subtitle1, Switch } from '@fluentui/react-components';
import VirtualizedDiffGrid from './VirtualizedDiffGrid';
import { type GridImperativeAPI } from 'react-window';
import { useComparisonDialogStyles } from './ComparisonDialog.styles';
import { loggingService } from '../../../../core/services/LoggingService';
import { ChangeDetailModal } from './ChangeDetailModal';

interface SideBySideDiffViewerProps {
    result: IDiffResult;
    startSnapshot: IWorkbookSnapshot;
    endSnapshot: IWorkbookSnapshot;
    startVersionComment: string;
    endVersionComment: string;
    licenseTier: 'free' | 'pro';
}

const getSheetIdByName = (snapshot: IWorkbookSnapshot, sheetName: string): string | undefined => {
    return Object.keys(snapshot).find(id => snapshot[id].name === sheetName);
};

const HighLevelChangesList: React.FC<{ changes: IHighLevelChange[]; styles: ReturnType<typeof useComparisonDialogStyles> }> = ({ changes, styles }) => {
    if (changes.length === 0) return null;
    return (
        <div className={styles.highLevelChangesContainer}>
            <Subtitle2>Structural Changes</Subtitle2>
            <ul className={styles.highLevelChangesList}>
                {changes.map((change, index) => (
                    <li key={index}>
                        <strong>{change.sheet}:</strong> {change.description}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const SideBySideDiffViewer: React.FC<SideBySideDiffViewerProps> = (props) => {
    const { result, startSnapshot, endSnapshot, startVersionComment, endVersionComment, licenseTier } = props;
    const styles = useComparisonDialogStyles();
    const [selectedChange, setSelectedChange] = useState<ICombinedChange | null>(null);
    const [highlightOnlyMode, setHighlightOnlyMode] = useState(false);
    
    const summary = useMemo(() => generateSummary(result), [result]);

    const affectedSheetNames = useMemo(() => {
        const sheetsFromCells = result.modifiedCells.map(c => c.sheet);
        const sheetsFromStructure = summary.highLevelChanges.map(c => c.sheet);
        return [...new Set([...sheetsFromCells, ...sheetsFromStructure])];
    }, [result, summary]);

    const [selectedSheetName, setSelectedSheetName] = useState<string>(affectedSheetNames[0] ?? "");

    const changeMap = useMemo(() => {
        const map = new Map<string, ICombinedChange>();
        for (const change of result.modifiedCells) {
            if (change.sheet === selectedSheetName) {
                map.set(`${change.sheet}-${change.address}`, change);
            }
        }
        return map;
    }, [result, selectedSheetName]);

    // Track which rows/columns have changes for markers
    const changedRowsAndCols = useMemo(() => {
        const rows = new Set<number>();
        const cols = new Set<number>();
        
        for (const change of result.modifiedCells) {
            if (change.sheet === selectedSheetName) {
                // Parse address like "A5" to get row and column
                const match = change.address.match(/^([A-Z]+)(\d+)$/);
                if (match) {
                    const colStr = match[1];
                    const rowNum = parseInt(match[2], 10);
                    
                    // Convert column letters to index
                    let colIndex = 0;
                    for (let i = 0; i < colStr.length; i++) {
                        colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 64);
                    }
                    
                    rows.add(rowNum - 1); // 0-indexed
                    cols.add(colIndex - 1); // 0-indexed
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

    const onScrollStart = (scrollTop: number, scrollLeft: number) => {
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
  
    return (
        <div className={styles.rootContainer}>
            <ChangeDetailModal
                isOpen={!!selectedChange}
                onClose={handleModalClose}
                change={selectedChange}
                licenseTier={licenseTier}
            />

            <HighLevelChangesList changes={summary.highLevelChanges} styles={styles} />
            
            <div className={styles.controlsBar}>
                <TabList selectedValue={selectedSheetName} onTabSelect={(_, data) => setSelectedSheetName(data.value as string)}>
                    {affectedSheetNames.map((name) => <Tab key={name} value={name}>{name}</Tab>)}
                </TabList>
                
                <div className={styles.highlightModeToggle}>
                    <Switch 
                        checked={highlightOnlyMode} 
                        onChange={(_, data) => setHighlightOnlyMode(data.checked)}
                        label="Highlight only mode"
                    />
                </div>
            </div>
            
            <div className={styles.gridsBody}>
                <div className={styles.gridColumn}>
                    <Subtitle1 as="h1" block align="center" className={styles.versionTitle}>
                        {startVersionComment}
                    </Subtitle1>
                    <VirtualizedDiffGrid
                        gridRef={gridStartRef}
                        sheet={startSheet}
                        changeMap={changeMap}
                        sheetName={selectedSheetName}
                        rowCount={rowCount}
                        colCount={colCount}
                        startRow={startSheet?.startRow ?? 0}
                        startCol={startSheet?.startCol ?? 0}
                        columnWidths={unifiedColumnWidths}
                        onScroll={onScrollStart}
                        onCellClick={handleCellClick}
                        highlightOnlyMode={highlightOnlyMode}
                        changedRows={changedRowsAndCols.rows}
                        changedCols={changedRowsAndCols.cols}
                    />
                </div>
                
                <div className={styles.gridSeparator} />
                
                <div className={styles.gridColumn}>
                    <Subtitle1 as="h1" block align="center" className={styles.versionTitle}>
                        {endVersionComment}
                    </Subtitle1>
                    <VirtualizedDiffGrid
                        gridRef={gridEndRef}
                        sheet={endSheet}
                        changeMap={changeMap}
                        sheetName={selectedSheetName}
                        rowCount={rowCount}
                        colCount={colCount}
                        startRow={endSheet?.startRow ?? 0}
                        startCol={endSheet?.startCol ?? 0}
                        columnWidths={unifiedColumnWidths}
                        onScroll={onScrollEnd}
                        onCellClick={handleCellClick}
                        highlightOnlyMode={highlightOnlyMode}
                        changedRows={changedRowsAndCols.rows}
                        changedCols={changedRowsAndCols.cols}
                    />
                </div>
            </div>
        </div>
    );
};

export default SideBySideDiffViewer;