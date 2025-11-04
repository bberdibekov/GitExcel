// src/taskpane/features/comparison/components/dialog/VirtualizedDiffGrid.tsx

import * as React from 'react';
import { 
    Grid, 
    List, 
    type CellComponentProps, 
    type RowComponentProps, 
    useListRef, 
    type GridImperativeAPI
} from 'react-window';
import { ICombinedChange, ISheetSnapshot } from '../../../../types/types';
import { Tooltip } from '@fluentui/react-components';
import { useVirtualizedDiffGridStyles } from './Styles/VirtualizedDiffGrid.styles';
import { toA1 } from '../../../../shared/lib/address.converter';
import { GridMap, GridMapItem } from '../../hooks/useComparisonData';

const joinClasses = (...classes: (string | undefined | boolean)[]) => { return classes.filter(Boolean).join(' '); };

const isRealFormula = (formula: any): boolean => {
  return typeof formula === 'string' && formula.startsWith("=");
};

const StructuralChangePlaceholder: React.FC<{ style: React.CSSProperties, type: GridMapItem['type'], description: string }> = ({ style, type, description }) => {
    const styles = useVirtualizedDiffGridStyles();
    const className = type === 'placeholder_inserted' ? styles.gridCell_placeholder_inserted : styles.gridCell_placeholder_deleted;

    return (
        <Tooltip content={description} relationship="label" withArrow>
            <div style={style} className={joinClasses(styles.gridCell, className)}></div>
        </Tooltip>
    );
};

type CustomCellData = {
  sheet: ISheetSnapshot;
  changeMap: Map<string, ICombinedChange>;
  sheetName: string;
  startRow: number;
  startCol: number;
  onCellClick: (change: ICombinedChange) => void;
  highlightOnlyMode: boolean;
  gridMap: GridMap;
  showStructuralChanges: boolean;
};

type MainCellProps = CellComponentProps & CustomCellData;

const MainCell: React.FC<MainCellProps> = ({ 
    columnIndex, 
    rowIndex, 
    style, 
    ariaAttributes, 
    sheet, 
    changeMap, 
    sheetName, 
    startRow, 
    startCol, 
    onCellClick,
    highlightOnlyMode,
    gridMap,
    showStructuralChanges 
}) => {

    if (rowIndex < 5 && columnIndex < 5) { // Only log for the top-left cells to avoid flooding the console
        const rowMapInfo = gridMap.rowMap[rowIndex];
        const colMapInfo = gridMap.colMap[columnIndex];
        console.log(`[MainCell ${sheetName}] R${rowIndex}C${columnIndex}`, {
            rowMapInfo,
            colMapInfo,
            showStructuralChanges,
            isPlaceholder: showStructuralChanges && (rowMapInfo?.type.startsWith('placeholder') || colMapInfo?.type.startsWith('placeholder')),
            isOutOfBounds: !rowMapInfo || rowMapInfo.sourceIndex === -1 || !colMapInfo || colMapInfo.sourceIndex === -1,
            dataRowIndex: rowMapInfo?.sourceIndex,
            dataColIndex: colMapInfo?.sourceIndex,
        });
    }
    const styles = useVirtualizedDiffGridStyles();

    const rowMapInfo = gridMap.rowMap[rowIndex];
    const colMapInfo = gridMap.colMap[columnIndex];

    if (showStructuralChanges && rowMapInfo?.type.startsWith('placeholder')) {
        return <StructuralChangePlaceholder style={style} type={rowMapInfo.type} description={rowMapInfo.description || ''} />;
    }
    if (showStructuralChanges && colMapInfo?.type.startsWith('placeholder')) {
        return <StructuralChangePlaceholder style={style} type={colMapInfo.type} description={colMapInfo.description || ''} />;
    }
    
    if (!rowMapInfo || rowMapInfo.sourceIndex === -1 || !colMapInfo || colMapInfo.sourceIndex === -1) {
        return <div style={style} {...ariaAttributes} className={joinClasses(styles.gridCell, styles.gridCell_blank)}></div>;
    }

    const dataRowIndex = rowMapInfo.sourceIndex - startRow;
    const dataColIndex = colMapInfo.sourceIndex - startCol;

    const isOutOfBounds = 
        dataRowIndex < 0 || dataColIndex < 0 || 
        !sheet || dataRowIndex >= sheet.data.length || 
        !sheet.data[dataRowIndex] || dataColIndex >= sheet.data[dataRowIndex].cells.length;

    const cell = isOutOfBounds ? null : sheet.data[dataRowIndex].cells[dataColIndex];
    if (isOutOfBounds) {
        return <div style={style} {...ariaAttributes} className={joinClasses(styles.gridCell, styles.gridCell_blank)}></div>;
    }

    const displayValue = cell ? String(cell.value ?? '') : '';
    const isFormula = cell ? isRealFormula(cell.formula) : false;
    const tooltipContent = isFormula ? String(cell.formula) : displayValue;

    const change = cell ? changeMap.get(`${sheetName}-${cell.address}`) : undefined;
    const isChanged = !!change;

    const hasContent = cell && (cell.value !== '' || isFormula);
    const shouldHideRow = highlightOnlyMode && !isChanged;
    
    const isDeletedRow = showStructuralChanges && rowMapInfo.type === 'deleted';
    const isInsertedRow = showStructuralChanges && rowMapInfo.type === 'inserted';
    
    const className = joinClasses(
      styles.gridCell, 
      !hasContent && styles.gridCell_blank,
      isChanged && styles.gridCell_changed,
      isChanged && styles.gridCell_changedBorder,
      shouldHideRow && styles.gridCell_hidden,
      isDeletedRow && styles.gridCell_deleted,
      isInsertedRow && styles.gridCell_inserted
    );
    
    const textClassName = joinClasses(
        styles.cellText,
        !isChanged && hasContent && styles.cellText_unchanged
    );

    const handleClick = () => {
      if (!hasContent) { return; }
      
      if (change) {
        onCellClick(change);
      } else {
        const syntheticChange: ICombinedChange = {
          sheet: sheetName,
          address: cell.address,
          startValue: cell.value,
          endValue: cell.value,
          startFormula: cell.formula,
          endFormula: cell.formula,
          changeType: isFormula ? 'formula' : 'value',
          history: [],
          metadata: { isUnchanged: true }, 
        };
        onCellClick(syntheticChange);
      }
    };
    
    return (
      <div style={style} {...ariaAttributes} className={className} onClick={handleClick}>
        <div className={styles.cellContentWrapper}>
          <Tooltip content={tooltipContent} relationship="label">
            <span className={textClassName}>{displayValue}</span>
          </Tooltip>
          {isFormula && <span className={styles.fxBadge}>fx</span>}
        </div>
      </div>
    );
};
const CellComponent = React.memo(MainCell);


type ColumnHeaderCustomData = { changedCols: Set<number>; };
type ColumnHeaderProps = CellComponentProps & ColumnHeaderCustomData;
const ColumnHeader: React.FC<ColumnHeaderProps> = ({ columnIndex, style, ariaAttributes, changedCols }) => {
    const styles = useVirtualizedDiffGridStyles();
    const columnLetter = toA1(0, columnIndex).replace(/[0-9]/g, '');
    const hasChanges = changedCols.has(columnIndex);
    return (
        <div style={style} {...ariaAttributes} className={joinClasses(styles.gridHeaderCell, hasChanges && styles.gridHeaderCell_changed)}>
            {columnLetter}
            {hasChanges && <span className={styles.changeMarker}>●</span>}
        </div>
    );
};
const ColumnHeaderCellComponent = React.memo(ColumnHeader);


type RowHeaderCustomData = { changedRows: Set<number>; };
type RowHeaderProps = RowComponentProps & RowHeaderCustomData;
const RowHeader: React.FC<RowHeaderProps> = ({ index, style, ariaAttributes, changedRows }) => {
  const styles = useVirtualizedDiffGridStyles();
  const hasChanges = changedRows.has(index);
  return (
    <div style={style} {...ariaAttributes} className={joinClasses(styles.gridHeaderCell, hasChanges && styles.gridHeaderCell_changed)}>
        {index + 1}
        {hasChanges && <span className={styles.changeMarker}>●</span>}
    </div>
  );
}
const RowHeaderComponent = React.memo(RowHeader);

interface VirtualizedDiffGridProps {
  sheet: ISheetSnapshot | undefined;
  changeMap: Map<string, ICombinedChange>;
  sheetName: string;
  rowCount: number;
  colCount: number;
  startRow: number;
  startCol: number;
  columnWidths: number[] | undefined;
  onScroll: (scrollTop: number, scrollLeft: number) => void;
  gridRef: React.RefObject<GridImperativeAPI>;
  onCellClick: (change: ICombinedChange) => void;
  highlightOnlyMode: boolean;
  changedRows: Set<number>;
  changedCols: Set<number>;
  gridMap: GridMap;
  showStructuralChanges: boolean;
}

type GridCellComponent = (props: CellComponentProps) => React.ReactElement;
type ListRowComponent = (props: RowComponentProps) => React.ReactElement;

const VirtualizedDiffGrid: React.FC<VirtualizedDiffGridProps> = ({
  sheet, changeMap, sheetName, rowCount, colCount, startRow, startCol, columnWidths, onScroll, gridRef, onCellClick, highlightOnlyMode, changedRows, changedCols,
  gridMap, showStructuralChanges
}) => {
  const styles = useVirtualizedDiffGridStyles();
  React.useEffect(() => {
    console.log(`[VirtualizedDiffGrid - ${sheetName}] Props Received`, {
        rowCount,
        colCount,
        gridMapRows: gridMap.rowMap.length,
        showStructuralChanges,
        hasSheet: !!sheet,
    });
  }, [rowCount, colCount, gridMap, showStructuralChanges, sheet, sheetName]);
  const columnHeaderRef = React.useRef<GridImperativeAPI | null>(null);
  const rowHeaderRef = useListRef();
  
  const [, setRevision] = React.useState(0);
  const mainGridContainerRef = React.useRef<HTMLDivElement>(null);
  
  const isMountedRef = React.useRef(true);
  React.useEffect(() => { return () => { isMountedRef.current = false; }; }, []);

  React.useEffect(() => {
    const container = mainGridContainerRef.current;
    if (!container) return () => {};
    const resizeObserver = new ResizeObserver(() => { if (isMountedRef.current) { setRevision(r => r + 1); } });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);
  
  const getColumnWidth = (index: number) => columnWidths?.[index] ?? 100;

  const cellProps = React.useMemo(() => ({ sheet, changeMap, sheetName, startRow, startCol, onCellClick, highlightOnlyMode, gridMap, showStructuralChanges }), [sheet, changeMap, sheetName, startRow, startCol, onCellClick, highlightOnlyMode, gridMap, showStructuralChanges]);
  const columnHeaderProps = React.useMemo(() => ({ changedCols }), [changedCols]);
  const rowHeaderProps = React.useMemo(() => ({ changedRows }), [changedRows]);

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    if (columnHeaderRef.current?.element) { columnHeaderRef.current.element.scrollLeft = scrollLeft; }
    const rowIndex = Math.floor(scrollTop / 22);
    rowHeaderRef.current?.scrollToRow({ index: rowIndex, align: 'start' });
    onScroll(scrollTop, scrollLeft);
  };

  // We keep this guard. If the entire sheet is undefined (e.g. added sheet, looking at the 'start' panel),
  // we shouldn't attempt to render the grid for it. Placeholders are for changes *within* a sheet.
  if (!sheet) {
    // A special case to render an empty grid if there are structural changes to display
    if (showStructuralChanges && gridMap.rowMap.some(r => r.type.startsWith('placeholder'))) {
      // Render the grid, the cells will handle the empty sheet and show placeholders
    } else {
      return <div className={styles.gridOuterWrapper}></div>;
    }
  }

  return (
    <div className={styles.gridOuterWrapper}>
      <div className={styles.gridTopLeftCorner}></div>

      <div className={styles.gridComponentContainer}>
        <Grid
          gridRef={columnHeaderRef}
          style={{ overflow: 'hidden' }}
          cellComponent={ColumnHeaderCellComponent as GridCellComponent}
          cellProps={columnHeaderProps} 
          columnCount={colCount}
          columnWidth={getColumnWidth}
          rowCount={1} 
          rowHeight={22}
        />
      </div>

      <div className={styles.gridComponentContainer}>
        <List
          listRef={rowHeaderRef}
          style={{ overflow: 'hidden' }}
          rowCount={rowCount}
          rowHeight={22}
          rowComponent={RowHeaderComponent as ListRowComponent}
          rowProps={rowHeaderProps}
        />
      </div>
      
      <div className={styles.gridMainContainer} ref={mainGridContainerRef}>
        <Grid
          gridRef={gridRef}
          onScroll={handleScroll}
          cellComponent={CellComponent as GridCellComponent}
          cellProps={cellProps}
          columnCount={colCount}
          columnWidth={getColumnWidth}
          rowCount={rowCount}
          rowHeight={22}
        />
      </div>
    </div>
  );
};

export default VirtualizedDiffGrid;