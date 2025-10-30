// src/taskpane/features/comparison/components/dialog/ComparisonReport.tsx

import * as React from "react";
import { useState, useMemo } from "react";
import { IWorkbookSnapshot, ISheetSnapshot, ICombinedChange, IDiffResult } from "../../../../types/types";
import { Tab, TabList, Body1 } from "@fluentui/react-components";
import DiffCell from "./ComparisonRow";

// --- DEVELOPER NOTE ---
// This MVP uses standard HTML tables. This will be slow for large sheets.
// The next step is to replace the <tbody> rendering with a virtualized grid
// from a library like `react-window` or `@tanstack/virtual` to ensure performance.

interface SideBySideDiffViewerProps {
  result: IDiffResult;
  startSnapshot: IWorkbookSnapshot;
  endSnapshot: IWorkbookSnapshot;
}

// Helper to find a sheet's persistent ID by its name
const getSheetIdByName = (snapshot: IWorkbookSnapshot, sheetName: string): string | undefined => {
  return Object.keys(snapshot).find(id => snapshot[id].name === sheetName);
};

const SideBySideDiffViewer: React.FC<SideBySideDiffViewerProps> = ({ result, startSnapshot, endSnapshot }) => {
  const modifiedSheetNames = useMemo(() => {
    return [...new Set(result.modifiedCells.map(c => c.sheet))];
  }, [result]);

  const [selectedSheetName, setSelectedSheetName] = useState<string>(modifiedSheetNames[0] ?? "");

  const changeMap = useMemo(() => {
    const map = new Map<string, ICombinedChange>();
    for (const change of result.modifiedCells) {
      if (change.sheet === selectedSheetName) {
        map.set(`${change.sheet}-${change.address}`, change);
      }
    }
    return map;
  }, [result, selectedSheetName]);

  // Memoize the sheet data to prevent re-calculations on every render
  const { startSheet, endSheet } = useMemo(() => {
    const startSheetId = getSheetIdByName(startSnapshot, selectedSheetName);
    const endSheetId = getSheetIdByName(endSnapshot, selectedSheetName);
    return {
      startSheet: startSheetId ? startSnapshot[startSheetId] : undefined,
      endSheet: endSheetId ? endSnapshot[endSheetId] : undefined
    };
  }, [selectedSheetName, startSnapshot, endSnapshot]);

  if (!result || modifiedSheetNames.length === 0) {
    return <Body1 style={{padding: '16px'}}>No changes detected between these versions.</Body1>;
  }

  // Determine grid dimensions. For MVP, we unify them to max of both.
  const rowCount = Math.max(startSheet?.data.length ?? 0, endSheet?.data.length ?? 0);
  const colCount = Math.max(startSheet?.data[0]?.cells.length ?? 0, endSheet?.data[0]?.cells.length ?? 0);

  const renderGrid = (sheet: ISheetSnapshot | undefined) => {
    return (
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e0e0e0' }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: colCount }).map((_, colIndex) => {
                  const cell = sheet?.data[rowIndex]?.cells[colIndex];
                  return (
                    <DiffCell
                      key={colIndex}
                      sheetName={selectedSheetName}
                      cell={cell ?? null}
                      changeMap={changeMap}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 50px)' /* Adjust for action bar */ }}>
      <TabList selectedValue={selectedSheetName} onTabSelect={(_, data) => setSelectedSheetName(data.value as string)}>
        {modifiedSheetNames.map(name => <Tab key={name} value={name}>{name}</Tab>)}
      </TabList>
      <div style={{ display: 'flex', flex: 1, gap: '8px', padding: '8px', backgroundColor: '#f5f5f5' }}>
        {renderGrid(startSheet)}
        {renderGrid(endSheet)}
      </div>
    </div>
  );
};

export default SideBySideDiffViewer;