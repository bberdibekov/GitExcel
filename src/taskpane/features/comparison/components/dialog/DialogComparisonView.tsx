// src/taskpane/features/comparison/components/dialog/DialogComparisonView.tsx

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { IDiffResult, IWorkbookSnapshot, ICombinedChange } from "../../../../types/types";
import { Spinner, Divider } from "@fluentui/react-components";
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
import ViewFilterGroup from './ViewFilterGroup';


interface DialogComparisonViewProps {
  result: IDiffResult | null;
  startSnapshot: IWorkbookSnapshot;
  endSnapshot: IWorkbookSnapshot;
  licenseTier: 'free' | 'pro';
  startVersionComment: string;
  endVersionComment: string;
}

const DialogComparisonView: React.FC<DialogComparisonViewProps> = (props) => {
  const { result } = props;
  const styles = useDialogComparisonViewStyles();

  const { activeViewFilters } = useComparisonStore();

  const filteredResult = useMemo((): IDiffResult | null => {
    if (!result) {
      return null;
    }
    
    // --- Filtering logic for multiple filters ---
    // If 'all' is present, or if no specific cell-level filters are selected, show all cells.
    // Structural changes are handled by the grid mapping, not by filtering this result object.
    if (activeViewFilters.has('all') || (!activeViewFilters.has('values') && !activeViewFilters.has('formulas'))) {
      return result; 
    }

    const shouldShowValues = activeViewFilters.has('values');
    const shouldShowFormulas = activeViewFilters.has('formulas');

    const filteredCells = result.modifiedCells.filter((c) => {
      if (shouldShowValues && (c.changeType === 'value' || c.changeType === 'both')) {
        return true;
      }
      if (shouldShowFormulas && (c.changeType === 'formula' || c.changeType === 'both')) {
        return true;
      }
      return false;
    });

    return {
      ...result,
      modifiedCells: filteredCells,
    };

  }, [result, activeViewFilters]);

  if (!filteredResult) {
    return <Spinner label="Loading comparison data..." />;
  }

  return <ComparisonViewCore {...props} result={filteredResult} />;
};


// --- Helper component to allow hooks to be called conditionally ---
const ComparisonViewCore: React.FC<DialogComparisonViewProps> = (props) => {
  const { result, startSnapshot, endSnapshot, licenseTier, startVersionComment, endVersionComment } = props;
  console.log("DEBUG: Data received by ComparisonViewCore", { 
    start: startVersionComment, 
    end: endVersionComment, 
    cellChangeAddress: result?.modifiedCells[0]?.address 
});
  const { 
    activeSheetName, 
    visiblePanel, 
    highlightOnlyMode, 
    setActiveSheet,
    activeViewFilters,
    toggleViewFilter,
    activeFlyout,
    flyoutPositions,
    setActiveFlyout,
    setFlyoutPosition
  } = useComparisonStore();
  
  const [selectedChange, setSelectedChange] = useState<ICombinedChange | null>(null);
  
  // State for the advanced filter options panel
  const [activeFilters, setActiveFilters] = React.useState(new Set<string>());

  const {
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* --- Pass new props to ViewFilterGroup --- */}
                        <ViewFilterGroup 
                            activeFilters={activeViewFilters} 
                            onFilterChange={toggleViewFilter} 
                        />
                        <Divider />
                        <DiffFilterOptions 
                            activeFilters={activeFilters} 
                            onFilterChange={handleFilterChange} 
                        />
                    </div>
                </FloatingPanel>
            );
        case 'settings':
            return <FloatingPanel title="Settings" {...panelProps}><div style={{padding: '12px'}}>Settings will be available soon.</div></FloatingPanel>;
        default:
            return null;
    }
  };
  // --- END: FLYOUT RENDERING LOGIC ---

  return (
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
        startGridMap={startGridMap}
        endGridMap={endGridMap}
        showStructuralChanges={activeViewFilters.has('structural') || activeViewFilters.has('all')}
        
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
}

export default DialogComparisonView;