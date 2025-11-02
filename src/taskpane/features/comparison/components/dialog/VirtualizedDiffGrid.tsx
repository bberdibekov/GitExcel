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
import { useSharedStyles } from '../../../../shared/styles/sharedStyles';
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
};

type MainCellProps = CellComponentProps & CustomCellData;

const MainCell: React.FC<MainCellProps> = ({ columnIndex, rowIndex, style, ariaAttributes, sheet, changeMap, sheetName, startRow, startCol, onCellClick }) => {
    const styles = useSharedStyles();
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

    // --- MODIFICATION START: Logic for universal clickability and hover effects ---
    // A cell is considered to have content if its value is not empty or it contains a formula.
    const hasContent = cell && (cell.value !== '' || isFormula);
    
    const className = joinClasses(
      styles.gridCell, 
      // Apply the 'blank' style if the cell has no content. This style
      // is configured to suppress hover effects.
      !hasContent && styles.gridCell_blank, 
      isChanged && styles.gridCell_changed
    );
    
    /**
     * Handles clicks on any cell with content. If the cell was part of the original diff,
     * it uses the existing change history. Otherwise, it creates a "synthetic" change
     * object to show the cell's static details.
     */
    const handleClick = () => {
      // Guard against clicking on empty cells.
      if (!hasContent) {
        return;
      }
      
      if (change) {
        // Case 1: The cell has a pre-existing change history. Use it directly.
        onCellClick(change);
      } else {
        // Case 2: The cell has content but no changes. Create a synthetic change object
        // on-the-fly to pass to the detail viewer.
        const syntheticChange: ICombinedChange = {
          sheet: sheetName,
          address: cell.address,
          // For a cell with no changes, the start and end values are the same.
          startValue: cell.value,
          endValue: cell.value,
          startFormula: cell.formula,
          endFormula: cell.formula,
          // Determine the change type based on whether it's a formula.
          changeType: isFormula ? 'formula' : 'value',
          // History is empty because this cell didn't change between versions.
          history: [],
          // Add metadata to indicate this isn't a real "change", which can be used later.
          metadata: { isUnchanged: true }, 
        };
        onCellClick(syntheticChange);
      }
    };
    // --- MODIFICATION END ---
    
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


const ColumnHeader: React.FC<CellComponentProps> = ({ columnIndex, style, ariaAttributes }) => {
    const styles = useSharedStyles();
    const columnLetter = toA1(0, columnIndex).replace(/[0-9]/g, '');
    return <div style={style} {...ariaAttributes} className={styles.gridHeaderCell}>{columnLetter}</div>;
};
const ColumnHeaderCellComponent = React.memo(ColumnHeader);

const RowHeader: React.FC<RowComponentProps> = (props) => {
  const styles = useSharedStyles();
  return <div style={props.style} {...props.ariaAttributes} className={styles.gridHeaderCell}>{props.index + 1}</div>;
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
}

type GridCellComponent = (props: CellComponentProps) => React.ReactElement;
type ListRowComponent = (props: RowComponentProps) => React.ReactElement;


const VirtualizedDiffGrid: React.FC<VirtualizedDiffGridProps> = ({
  sheet, changeMap, sheetName, rowCount, colCount, startRow, startCol, columnWidths, onScroll, gridRef, onCellClick
}) => {
  const styles = useSharedStyles();
  
  const columnHeaderRef = React.useRef<GridImperativeAPI | null>(null);
  const rowHeaderRef = useListRef(null);
  
  const getColumnWidth = (index: number) => columnWidths?.[index] ?? 100;

  // Pass the onCellClick handler down to the cell data so every cell instance can use it.
  const cellProps = React.useMemo(
    () => ({ sheet, changeMap, sheetName, startRow, startCol, onCellClick }), 
    [sheet, changeMap, sheetName, startRow, startCol, onCellClick]
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
          style={{ overflow: 'hidden' }}
          cellComponent={ColumnHeaderCellComponent as GridCellComponent}
          cellProps={{}} 
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
          rowProps={{}}
        />
      </div>
      
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
  );
};

export default VirtualizedDiffGrid;