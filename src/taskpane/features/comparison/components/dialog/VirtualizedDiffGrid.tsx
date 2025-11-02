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

// --- A small helper to identify formulas, consistent with other services. ---
const isRealFormula = (formula: any): boolean => {
  return typeof formula === 'string' && formula.startsWith("=");
};

type CustomCellData = {
  sheet: ISheetSnapshot;
  changeMap: Map<string, ICombinedChange>;
  sheetName: string;
  startRow: number;
  startCol: number;
};

type MainCellProps = CellComponentProps & CustomCellData;

const MainCell: React.FC<MainCellProps> = ({ columnIndex, rowIndex, style, ariaAttributes, sheet, changeMap, sheetName, startRow, startCol }) => {
    const styles = useSharedStyles();
    const dataRowIndex = rowIndex - startRow;
    const dataColIndex = columnIndex - startCol;
    const isOutOfBounds = 
        dataRowIndex < 0 || dataColIndex < 0 || 
        !sheet || dataRowIndex >= sheet.data.length || 
        !sheet.data[dataRowIndex] || dataColIndex >= sheet.data[dataRowIndex].cells.length;

    const cell = isOutOfBounds ? null : sheet.data[dataRowIndex].cells[dataColIndex];
    if (isOutOfBounds) {
        // Render a blank cell for the area outside the used range
        return <div style={style} {...ariaAttributes} className={joinClasses(styles.gridCell, styles.gridCell_blank)}></div>;
    }

    const displayValue = cell ? String(cell.value ?? '') : '';
    const isFormula = cell ? isRealFormula(cell.formula) : false;
    const tooltipContent = isFormula ? String(cell.formula) : displayValue;

    const isChanged = cell ? !!changeMap.get(`${sheetName}-${cell.address}`) : false;
    const className = joinClasses(styles.gridCell, !cell && styles.gridCell_blank, isChanged && styles.gridCell_changed);
    
    return (
      <div style={style} {...ariaAttributes} className={className}>
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
}

type GridCellComponent = (props: CellComponentProps) => React.ReactElement;
type ListRowComponent = (props: RowComponentProps) => React.ReactElement;


const VirtualizedDiffGrid: React.FC<VirtualizedDiffGridProps> = ({
  sheet, changeMap, sheetName, rowCount, colCount, startRow, startCol, columnWidths, onScroll, gridRef
}) => {
  const styles = useSharedStyles();
  
  const columnHeaderRef = React.useRef<GridImperativeAPI | null>(null);
  const rowHeaderRef = useListRef(null);
  
  const getColumnWidth = (index: number) => columnWidths?.[index] ?? 100;
  const cellProps = React.useMemo(() => ({ sheet, changeMap, sheetName, startRow, startCol }), [sheet, changeMap, sheetName, startRow, startCol]);

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