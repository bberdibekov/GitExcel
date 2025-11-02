// src/taskpane/features/comparison/components/dialog/SideBySideDiffViewer.tsx

import * as React from 'react';
import { useState, useMemo, useRef } from 'react';
import { IWorkbookSnapshot, IDiffResult, IHighLevelChange, ICombinedChange } from '../../../../types/types';
import { generateSummary } from '../../services/summary.service';
import { Tab, TabList, Subtitle2, Title3 } from '@fluentui/react-components'; // Import Title3
import VirtualizedDiffGrid from './VirtualizedDiffGrid';
import { type GridImperativeAPI } from 'react-window';

interface SideBySideDiffViewerProps {
    result: IDiffResult;
    startSnapshot: IWorkbookSnapshot;
    endSnapshot: IWorkbookSnapshot;
    // --- [FIX] Add the missing properties to the interface ---
    startVersionComment: string;
    endVersionComment: string;
}

const getSheetIdByName = (snapshot: IWorkbookSnapshot, sheetName: string): string | undefined => {
    return Object.keys(snapshot).find(id => snapshot[id].name === sheetName);
};

const HighLevelChangesList: React.FC<{ changes: IHighLevelChange[] }> = ({ changes }) => {
    if (changes.length === 0) return null;
    return (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #e0e0e0' }}>
            <Subtitle2>Structural Changes</Subtitle2>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
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
  const { result, startSnapshot, endSnapshot, startVersionComment, endVersionComment } = props;
  
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

  const { startSheet, endSheet } = useMemo(() => {
    const startSheetId = getSheetIdByName(startSnapshot, selectedSheetName);
    const endSheetId = getSheetIdByName(endSnapshot, selectedSheetName);
    return {
      startSheet: startSheetId ? startSnapshot[startSheetId] : undefined,
      endSheet: endSheetId ? endSnapshot[endSheetId] : undefined
    };
  }, [selectedSheetName, startSnapshot, endSnapshot]);

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

  const rowCount = Math.max(startSheet?.data.length ?? 0, endSheet?.data.length ?? 0);
  const colCount = Math.max(startSheet?.data[0]?.cells.length ?? 0, endSheet?.data[0]?.cells.length ?? 0);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 50px)' }}>
      <HighLevelChangesList changes={summary.highLevelChanges} />
      <TabList selectedValue={selectedSheetName} onTabSelect={(_, data) => setSelectedSheetName(data.value as string)}>
        {affectedSheetNames.map((name) => <Tab key={name} value={name}>{name}</Tab>)}
      </TabList>
      <div style={{ display: 'flex', flex: 1, gap: '8px', padding: '8px', backgroundColor: '#f5f5fidential' }}>
        
        <div style={{flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '4px'}}>
            <Title3 as="h3" block align="center" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {startVersionComment}
            </Title3>
            <VirtualizedDiffGrid
                gridRef={gridStartRef}
                sheet={startSheet}
                changeMap={changeMap}
                sheetName={selectedSheetName}
                rowCount={rowCount}
                colCount={colCount}
                columnWidths={startSheet?.columnWidths}
                onScroll={onScrollStart}
            />
        </div>
        
        <div style={{flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '4px'}}>
            <Title3 as="h3" block align="center" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {endVersionComment}
            </Title3>
            <VirtualizedDiffGrid
                gridRef={gridEndRef}
                sheet={endSheet}
                changeMap={changeMap}
                sheetName={selectedSheetName}
                rowCount={rowCount}
                colCount={colCount}
                columnWidths={endSheet?.columnWidths}
                onScroll={onScrollEnd}
            />
        </div>
      </div>
    </div>
  );
};

export default SideBySideDiffViewer;