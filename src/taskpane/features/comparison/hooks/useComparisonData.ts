// src/taskpane/features/comparison/hooks/useComparisonData.ts

import { useMemo } from 'react';
import { IDiffResult, IWorkbookSnapshot, ICombinedChange, ISheetSnapshot, IReportStructuralChange } from '../../../types/types';
import { generateSummary } from '../services/summary.service';

// --- Helper Functions (co-located with the hook that uses them) ---

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

// --- Type definitions for our grid mapping, exported for use in other components ---
export type GridMapItem = {
    type: 'original' | 'placeholder_inserted' | 'placeholder_deleted' | 'inserted' | 'deleted';
    sourceIndex: number; // The index in the original ISheetSnapshot.data or columnWidths array. -1 for placeholders.
    description?: string;
    count?: number; // How many rows/cols this item represents
};

export type GridMap = {
    rowMap: GridMapItem[];
    colMap: GridMapItem[];
};


/**
 * A custom hook that encapsulates the logic for transforming raw comparison results
 * into memoized, view-specific data structures needed for rendering the diff grids.
 */
export const useComparisonData = (
    result: IDiffResult,
    selectedSheetName: string,
    startSnapshot: IWorkbookSnapshot,
    endSnapshot: IWorkbookSnapshot
) => {

    const summary = useMemo(() => generateSummary(result), [result]);

    const affectedSheetNames = useMemo(() => {
        const sheetsFromCells = result.modifiedCells.map(c => c.sheet);
        const sheetsFromStructure = summary.highLevelChanges.map(c => c.sheet);
        return [...new Set([...sheetsFromCells, ...sheetsFromStructure])];
    }, [result, summary]);

    const { startSheet, endSheet } = useMemo(() => {
        const startSheetId = getSheetIdByName(startSnapshot, selectedSheetName);
        const endSheetId = getSheetIdByName(endSnapshot, selectedSheetName);
        return {
            startSheet: startSheetId ? startSnapshot[startSheetId] : undefined,
            endSheet: endSheetId ? endSnapshot[endSheetId] : undefined
        };
    }, [selectedSheetName, startSnapshot, endSnapshot]);

    const changeMap = useMemo(() => {
        console.log("[useComparisonData] Calculating changeMap. Input 'result' contains change at address:", result.modifiedCells[0]?.address);
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
                    rows.add(rowNum - 1);
                    cols.add(colLetterToIndex(colStr));
                }
            }
        }
        return { rows, cols };
    }, [result, selectedSheetName]);

    const {
        unifiedRowCount,
        unifiedColCount,
        startGridMap,
        endGridMap
    } = useMemo(() => {
        // --- START OF DEBUGGING LOG ---
        console.log(`[useComparisonData] Calculating GridMap for sheet: ${selectedSheetName}. Received structural changes:`, result.structuralChanges);
        // ---  END OF DEBUGGING LOG  ---
        const structuralChanges = result.structuralChanges.filter(c => c.sheet === selectedSheetName);
        const rowInsertions = structuralChanges.filter(c => c.type === 'row_insertion');
        const rowDeletions = structuralChanges.filter(c => c.type === 'row_deletion');
        const colInsertions = structuralChanges.filter(c => c.type === 'column_insertion');
        const colDeletions = structuralChanges.filter(c => c.type === 'column_deletion');

        const startSheetLogicalRows = startSheet ? startSheet.startRow + startSheet.data.length : 0;
        const endSheetLogicalRows = endSheet ? endSheet.startRow + endSheet.data.length : 0;

        const startSheetLogicalCols = startSheet ? startSheet.startCol + startSheet.columnCount : 0;
        const endSheetLogicalCols = endSheet ? endSheet.startCol + endSheet.columnCount : 0;

        const processMap = (
            startLength: number,
            endLength: number,
            insertions: IReportStructuralChange[],
            deletions: IReportStructuralChange[]
        ): { startMap: GridMapItem[], endMap: GridMapItem[] } => {
            const startMap: GridMapItem[] = [];
            const endMap: GridMapItem[] = [];
            let startIdx = 0;
            let endIdx = 0;

            const deletionMap = new Map(deletions.map(d => [d.index, d]));
            const insertionMap = new Map(insertions.map(i => [i.index, i]));

            while (startIdx < startLength || endIdx < endLength) {
                const deletion = deletionMap.get(startIdx);
                if (deletion) {
                    const count = deletion.count ?? 1;
                    const desc = count > 1 ? `Rows ${startIdx + 1}-${startIdx + count} were deleted.` : `Row ${startIdx + 1} was deleted.`;
                    for(let i = 0; i < count; i++) {
                        startMap.push({ type: 'deleted', sourceIndex: startIdx + i, description: desc });
                        endMap.push({ type: 'placeholder_deleted', sourceIndex: -1, description: desc });
                    }
                    startIdx += count;
                    continue;
                }

                const insertion = insertionMap.get(endIdx);
                if (insertion) {
                    const count = insertion.count ?? 1;
                    const desc = count > 1 ? `Rows ${endIdx + 1}-${endIdx + count} were inserted.` : `Row ${endIdx + 1} was inserted.`;
                    for(let i = 0; i < count; i++) {
                        startMap.push({ type: 'placeholder_inserted', sourceIndex: -1, description: desc });
                        endMap.push({ type: 'inserted', sourceIndex: endIdx + i, description: desc });
                    }
                    endIdx += count;
                    continue;
                }
                
                if (startIdx < startLength && endIdx < endLength) {
                    startMap.push({ type: 'original', sourceIndex: startIdx });
                    endMap.push({ type: 'original', sourceIndex: endIdx });
                    startIdx++;
                    endIdx++;
                } else if (startIdx < startLength) {
                    const desc = `Row ${startIdx + 1} was deleted.`;
                    startMap.push({ type: 'deleted', sourceIndex: startIdx, description: desc });
                    endMap.push({ type: 'placeholder_deleted', sourceIndex: -1, description: desc });
                    startIdx++;
                } else if (endIdx < endLength) {
                    const desc = `Row ${endIdx + 1} was inserted.`;
                    startMap.push({ type: 'placeholder_inserted', sourceIndex: -1, description: desc });
                    endMap.push({ type: 'inserted', sourceIndex: endIdx, description: desc });
                    endIdx++;
                } else {
                    break;
                }
            }
            return { startMap, endMap };
        };

        const { startMap: rowStartMap, endMap: rowEndMap } = processMap(startSheetLogicalRows, endSheetLogicalRows, rowInsertions, rowDeletions);
        const { startMap: colStartMap, endMap: colEndMap } = processMap(startSheetLogicalCols, endSheetLogicalCols, colInsertions, colDeletions);

        const startGridMap: GridMap = { rowMap: rowStartMap, colMap: colStartMap };
        const endGridMap: GridMap = { rowMap: rowEndMap, colMap: colEndMap };
        
        return {
            unifiedRowCount: startGridMap.rowMap.length,
            unifiedColCount: startGridMap.colMap.length,
            startGridMap,
            endGridMap
        };
    }, [result.structuralChanges, selectedSheetName, startSheet, endSheet]);

    const unifiedColumnWidths = useMemo(() => {
        const unified: number[] = [];
        const DEFAULT_COL_WIDTH = 100;
        const PLACEHOLDER_WIDTH = 40;
        
        for (let i = 0; i < unifiedColCount; i++) {
            const startMapItem = startGridMap.colMap[i];
            const endMapItem = endGridMap.colMap[i];
            let startWidth = PLACEHOLDER_WIDTH;
            let endWidth = PLACEHOLDER_WIDTH;

            if (startMapItem && (startMapItem.type === 'original' || startMapItem.type === 'deleted')) {
                startWidth = startSheet?.columnWidths?.[startMapItem.sourceIndex] || DEFAULT_COL_WIDTH;
            }
            if (endMapItem && (endMapItem.type === 'original' || endMapItem.type === 'inserted')) {
                endWidth = endSheet?.columnWidths?.[endMapItem.sourceIndex] || DEFAULT_COL_WIDTH;
            }

            unified.push(Math.max(startWidth, endWidth));
        }
        return unified;
    }, [startSheet, endSheet, unifiedColCount, startGridMap, endGridMap]);

    const changeCoordinates = useMemo(() => {
        const coords: { rowIndex: number; colIndex: number }[] = [];
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

    return {
        affectedSheetNames,
        startSheet,
        endSheet,
        changeMap,
        changedRowsAndCols,
        unifiedColumnWidths,
        changeCoordinates,
        rowCount: unifiedRowCount,
        colCount: unifiedColCount,
        startGridMap,
        endGridMap,
    };
};