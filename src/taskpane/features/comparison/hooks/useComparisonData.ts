// src/taskpane/features/comparison/hooks/useComparisonData.ts

import { useMemo } from 'react';
import { IDiffResult, IWorkbookSnapshot, ICombinedChange, ISheetSnapshot } from '../../../types/types';
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


/**
 * A custom hook that encapsulates the logic for transforming raw comparison results
 * into memoized, view-specific data structures needed for rendering the diff grids.
 * @param result The raw diff result from the synthesizer service.
 * @param selectedSheetName The name of the sheet currently being viewed.
 * @param startSnapshot The "before" snapshot.
 * @param endSnapshot The "after" snapshot.
 * @returns An object containing all the derived data for the view.
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

    const rowCount = Math.max(
        (startSheet?.startRow ?? 0) + (startSheet?.data.length ?? 0),
        (endSheet?.startRow ?? 0) + (endSheet?.data.length ?? 0)
    );
    
    const colCount = Math.max(
        (startSheet?.startCol ?? 0) + (startSheet?.data[0]?.cells.length ?? 0),
        (endSheet?.startCol ?? 0) + (endSheet?.data[0]?.cells.length ?? 0)
    );

    return {
        affectedSheetNames,
        startSheet,
        endSheet,
        changeMap,
        changedRowsAndCols,
        unifiedColumnWidths,
        changeCoordinates,
        rowCount,
        colCount
    };
};