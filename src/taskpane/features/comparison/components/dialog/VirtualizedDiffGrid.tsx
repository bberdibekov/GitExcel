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
import { useComparisonDialogStyles } from './ComparisonDialog.styles';
import { toA1 } from '../../../../shared/lib/address.converter';

const joinClasses = (...classes: (string | undefined | boolean)[]) => { return classes.filter(Boolean).join(' '); };

const isRealFormula = (formula: any): boolean => {
  return typeof formula === 'string' && formula.startsWith("=");
};

type CustomCellData = {
  sheet: ISheetSnapshot;
  changeMap: Map<string, ICombinedChange>;
  sheetName: string;
  startRow: number;
  startCol: number;
  onCellClick: (change: ICombinedChange) => void;
  highlightOnlyMode: boolean;
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
    highlightOnlyMode 
}) => {
    const styles = useComparisonDialogStyles();
    const dataRowIndex = rowIndex - startRow;
    const dataColIndex = columnIndex - startCol;
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

    // A cell is considered to have content if its value is not empty or it contains a formula.
    const hasContent = cell && (cell.value !== '' || isFormula);
    
    // In highlight-only mode, hide rows that don't contain any changes
    const shouldHideRow = highlightOnlyMode && !isChanged;
    
    const className = joinClasses(
      styles.gridCell, 
      !hasContent && styles.gridCell_blank,
      isChanged && styles.gridCell_changed,
      isChanged && styles.gridCell_changedBorder,
      !isChanged && hasContent && styles.gridCell_faded,
      shouldHideRow && styles.gridCell_hidden
    );
    
    const handleClick = () => {
      if (!hasContent) {
        return;
      }
      
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
            <span className={styles.cellText}>{displayValue}</span>
          </Tooltip>
          {isFormula && <span className={styles.fxBadge}>fx</span>}
        </div>
      </div>
    );
};
const CellComponent = React.memo(MainCell);


type ColumnHeaderCustomData = {
  changedCols: Set<number>;
};

type ColumnHeaderProps = CellComponentProps & ColumnHeaderCustomData;

const ColumnHeader: React.FC<ColumnHeaderProps> = ({ columnIndex, style, ariaAttributes, changedCols }) => {
    const styles = useComparisonDialogStyles();
    const columnLetter = toA1(0, columnIndex).replace(/[0-9]/g, '');
    const hasChanges = changedCols.has(columnIndex);
    
    return (
        <div 
            style={style} 
            {...ariaAttributes} 
            className={joinClasses(
                styles.gridHeaderCell,
                hasChanges && styles.gridHeaderCell_changed
            )}
        >
            {columnLetter}
            {hasChanges && <span className={styles.changeMarker}>●</span>}
        </div>
    );
};
const ColumnHeaderCellComponent = React.memo(ColumnHeader);

type RowHeaderCustomData = {
  changedRows: Set<number>;
};

type RowHeaderProps = RowComponentProps & RowHeaderCustomData;

const RowHeader: React.FC<RowHeaderProps> = (props) => {
  const styles = useComparisonDialogStyles();
  const hasChanges = props.changedRows.has(props.index);
  
  return (
    <div 
        style={props.style} 
        {...props.ariaAttributes} 
        className={joinClasses(
            styles.gridHeaderCell,
            hasChanges && styles.gridHeaderCell_changed
        )}
    >
        {props.index + 1}
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
}

type GridCellComponent = (props: CellComponentProps) => React.ReactElement;
type ListRowComponent = (props: RowComponentProps) => React.ReactElement;


const VirtualizedDiffGrid: React.FC<VirtualizedDiffGridProps> = ({
  sheet, 
  changeMap, 
  sheetName, 
  rowCount, 
  colCount, 
  startRow, 
  startCol, 
  columnWidths, 
  onScroll, 
  gridRef, 
  onCellClick,
  highlightOnlyMode,
  changedRows,
  changedCols
}) => {
  const styles = useComparisonDialogStyles();
  
  const columnHeaderRef = React.useRef<GridImperativeAPI | null>(null);
  const rowHeaderRef = useListRef(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [gridDimensions, setGridDimensions] = React.useState({ width: 800, height: 600 });
  
  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGridDimensions({ 
          width: rect.width - 51, // subtract row header width + border
          height: rect.height - 23 // subtract column header height + border
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const getColumnWidth = (index: number) => columnWidths?.[index] ?? 100;

  const cellProps = React.useMemo(
    () => ({ 
        sheet, 
        changeMap, 
        sheetName, 
        startRow, 
        startCol, 
        onCellClick, 
        highlightOnlyMode 
    }), 
    [sheet, changeMap, sheetName, startRow, startCol, onCellClick, highlightOnlyMode]
  );

  const columnHeaderProps = React.useMemo(
    () => ({ changedCols }),
    [changedCols]
  );

  const rowHeaderProps = React.useMemo(
    () => ({ changedRows }),
    [changedRows]
  );

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    
    if (columnHeaderRef.current?.element) {
        columnHeaderRef.current.element.scrollLeft = scrollLeft;
    }

    const rowIndex = Math.floor(scrollTop / 22);
    rowHeaderRef.current?.scrollToRow({ index: rowIndex, align: 'start' });

    onScroll(scrollTop, scrollLeft);
  };

  if (!sheet) {
    return <div className={styles.gridOuterWrapper}></div>;
  }

  return (
    <div className={styles.gridOuterWrapper}>
      <div className={styles.gridTopLeftCorner}></div>

      <div className={styles.gridComponentContainer}>
        <Grid
          gridRef={columnHeaderRef}
          style={{ overflow: 'hidden', pointerEvents: 'none' }}
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
          style={{ overflow: 'hidden', pointerEvents: 'none' }}
          rowCount={rowCount}
          rowHeight={22}
          rowComponent={RowHeaderComponent as ListRowComponent}
          rowProps={rowHeaderProps}
        />
      </div>
      
      <div className={styles.gridMainContainer}>
        <Grid
          gridRef={gridRef}
          cellComponent={CellComponent as GridCellComponent}
          cellProps={cellProps}
          columnCount={colCount}
          columnWidth={getColumnWidth}
          rowCount={rowCount}
          rowHeight={22}
          onScroll={handleScroll}
        />
      </div>
    </div>
  );
};

export default VirtualizedDiffGrid;