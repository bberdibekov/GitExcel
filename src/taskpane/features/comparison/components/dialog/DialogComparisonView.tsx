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
import FloatingToolbar from "./FloatingToolbar";
import FloatingPanel from "./FloatingPanel";
import ComparisonSummary from "./ComparisonSummary";
import DiffFilterOptions from "../DiffFilterOptions";
import { generateSummary, calculateSummaryStats } from "../../services/summary.service";


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

  const { activeSheetName, visiblePanel, highlightOnlyMode, setActiveSheet, activeViewFilter } = useComparisonStore();

  const [selectedChange, setSelectedChange] = useState<ICombinedChange | null>(null);
  
  const filteredResult = useMemo((): IDiffResult | null => {
    if (!result) {
      return null;
    }
    // NOTE: This basic filtering by type is still useful for the main view filter.
    // The advanced filters will be handled separately and will eventually modify the `result` object itself.
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
  }, [result, activeViewFilter]);

  if (!filteredResult) {
    return <Spinner label="Loading comparison data..." />;
  }

  return <ComparisonViewCore {...props} result={filteredResult} />;
};


// --- Helper component to allow hooks to be called conditionally ---
const ComparisonViewCore: React.FC<DialogComparisonViewProps> = (props) => {
  const { result, startSnapshot, endSnapshot, licenseTier, startVersionComment, endVersionComment } = props;
  
  // --- START: EXPANDED STATE MANAGEMENT ---
  const { 
    activeSheetName, 
    visiblePanel, 
    highlightOnlyMode, 
    setActiveSheet,
    // New state for flyouts
    activeFlyout,
    flyoutPositions,
    setActiveFlyout,
    setFlyoutPosition
  } = useComparisonStore();
  
  const [selectedChange, setSelectedChange] = useState<ICombinedChange | null>(null);
  
  // State for the advanced filter options panel
  const [activeFilters, setActiveFilters] = React.useState(new Set<string>());
  // --- END: EXPANDED STATE MANAGEMENT ---

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

  // --- START: DATA PREPARATION FOR FLYOUTS ---
  const summaryResult = useMemo(() => generateSummary(result!), [result]);
  const summaryStats = useMemo(() => calculateSummaryStats(result!), [result]);

  const handleFilterChange = (filterId: string) => {
    setActiveFilters(prev => {
        const newSet = new Set(prev);
        if (newSet.has(filterId)) {
            newSet.delete(filterId);
        } else {
            newSet.add(filterId);
        }
        return newSet;
    });
    // In a future step, you would trigger a re-comparison with these active filters.
  };
  // --- END: DATA PREPARATION FOR FLYOUTS ---

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

  if (!activeSheetName) {
      return <Spinner label="Initializing view..." />;
  }
      
  // --- START: FLYOUT RENDERING LOGIC ---
  const renderActiveFlyout = () => {
    if (!activeFlyout) {
        return null;
    }

    const panelProps = {
        onClose: () => setActiveFlyout(null),
        initialPosition: flyoutPositions[activeFlyout] || { x: 80, y: 150 },
        onMove: (pos: {x: number, y: number}) => setFlyoutPosition(activeFlyout, pos),
    };

    switch (activeFlyout) {
        case 'summary':
            return (
                <FloatingPanel title="Summary" {...panelProps}>
                    <ComparisonSummary 
                       totalChanges={summaryStats.totalChanges}
                       valueChanges={summaryStats.valueChanges}
                       formulaChanges={summaryStats.formulaChanges}
                       highLevelChanges={summaryResult.highLevelChanges}
                    />
                </FloatingPanel>
            );
        case 'filters':
             return (
                <FloatingPanel title="Filters" {...panelProps}>
                    <DiffFilterOptions activeFilters={activeFilters} onFilterChange={handleFilterChange} />
                </FloatingPanel>
            );
        case 'settings':
             // Placeholder for settings panel
            return <FloatingPanel title="Settings" {...panelProps}><div style={{padding: '12px'}}>Settings will be available soon.</div></FloatingPanel>;
        default:
            return null;
    }
  };
  // --- END: FLYOUT RENDERING LOGIC ---

  // --- START: MODIFIED RENDER OUTPUT ---
  return (
    // The parent div needs to be a positioning context for the absolute panels.
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
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

      <FloatingToolbar
        onFlyoutClick={(flyout) => setActiveFlyout(flyout)}
        onRestoreClick={() => { /* Implement restore logic */ }}
        isRestoreDisabled={result!.modifiedCells.length === 0}
      />

      {renderActiveFlyout()}

    </div>
  );
  // --- END: MODIFIED RENDER OUTPUT ---
}

export default DialogComparisonView;