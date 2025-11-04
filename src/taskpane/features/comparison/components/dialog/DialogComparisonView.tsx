// src/taskpane/features/comparison/components/dialog/DialogComparisonView.tsx

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { IDiffResult, IWorkbookSnapshot, ICombinedChange } from "../../../../types/types";
import { Spinner } from "@fluentui/react-components";
import { truncateComment } from "../../../../shared/lib/string.utils";
import SideBySideDiffViewer from "./SideBySideDiffViewer";
import { useDialogComparisonViewStyles } from "./Styles/DialogComparisonView.styles";
import { useComparisonStore } from "../../../../state/comparisonStore";
import { useComparisonData } from "../../hooks/useComparisonData";

interface DialogComparisonViewProps {
  result: IDiffResult | null;
  startSnapshot: IWorkbookSnapshot;
  endSnapshot: IWorkbookSnapshot;
  licenseTier: 'free' | 'pro';
  startVersionComment: string;
  endVersionComment: string;
}

const DialogComparisonView: React.FC<DialogComparisonViewProps> = (props) => {
  const { result, startSnapshot, endSnapshot, licenseTier, startVersionComment, endVersionComment } = props;
  const styles = useDialogComparisonViewStyles();

  // --- Read state from the store, including the filter ---
  const { activeSheetName, visiblePanel, highlightOnlyMode, setActiveSheet, activeViewFilter } = useComparisonStore();

  const [selectedChange, setSelectedChange] = useState<ICombinedChange | null>(null);
  
  // --- Restore the filtering logic implementation ---
  const filteredResult = useMemo((): IDiffResult | null => {
    if (!result) {
      return null;
    }
    switch (activeViewFilter) {
      case 'values':
        return {
          ...result,
          modifiedCells: result.modifiedCells.filter(
            (c) => c.changeType === 'value' || c.changeType === 'both'
          ),
        };
      case 'formulas':
        return {
          ...result,
          modifiedCells: result.modifiedCells.filter(
            (c) => c.changeType === 'formula' || c.changeType === 'both'
          ),
        };
      case 'all':
      default:
        return result;
    }
  }, [result, activeViewFilter]); // Add activeViewFilter to the dependency array

  // Wait until we have a valid result to process further data
  if (!filteredResult) {
    return <Spinner label="Loading comparison data..." />;
  }

  // --- Now that filteredResult is guaranteed to be valid, we can call the data hook ---
  return <ComparisonViewCore {...props} result={filteredResult} />;
};


// --- Helper component to allow hooks to be called conditionally ---
const ComparisonViewCore: React.FC<DialogComparisonViewProps> = (props) => {
  const { result, startSnapshot, endSnapshot, licenseTier, startVersionComment, endVersionComment } = props;
  
  const { activeSheetName, visiblePanel, highlightOnlyMode, setActiveSheet } = useComparisonStore();
  const [selectedChange, setSelectedChange] = useState<ICombinedChange | null>(null);

  const {
      affectedSheetNames,
      startSheet,
      endSheet,
      changeMap,
      changedRowsAndCols,
      unifiedColumnWidths,
      changeCoordinates,
      rowCount,
      colCount
  } = useComparisonData(result!, activeSheetName ?? "", startSnapshot, endSnapshot);

  useEffect(() => {
    if (affectedSheetNames.length > 0 && !activeSheetName) {
      setActiveSheet(affectedSheetNames[0]);
    }
  }, [affectedSheetNames, activeSheetName, setActiveSheet]);

  useEffect(() => {
    const MAX_LENGTH = 30;
    if (startVersionComment && endVersionComment) {
      const truncatedStart = truncateComment(startVersionComment, MAX_LENGTH);
      const truncatedEnd = truncateComment(endVersionComment, MAX_LENGTH);
      document.title = `Comparison: "${truncatedStart}" vs. "${truncatedEnd}"`;
    } else {
      document.title = "Excel Version Control - Comparison";
    }
  }, [startVersionComment, endVersionComment]);

  // Handle the case where the sheet name is not yet initialized
  if (!activeSheetName) {
      return <Spinner label="Initializing view..." />;
  }
      
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <SideBySideDiffViewer
        result={result!}
        startVersionComment={startVersionComment}
        endVersionComment={endVersionComment}
        licenseTier={licenseTier}
        
        affectedSheetNames={affectedSheetNames}
        startSheet={startSheet}
        endSheet={endSheet}
        changeMap={changeMap}
        changedRowsAndCols={changedRowsAndCols}
        unifiedColumnWidths={unifiedColumnWidths}
        changeCoordinates={changeCoordinates}
        rowCount={rowCount}
        colCount={colCount}
        
        visiblePanel={visiblePanel}
        highlightOnlyMode={highlightOnlyMode}
        
        selectedChange={selectedChange}
        onCellClick={setSelectedChange}
        onModalClose={() => setSelectedChange(null)}
      />
    </div>
  );
}

export default DialogComparisonView;