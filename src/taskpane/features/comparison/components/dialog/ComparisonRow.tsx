// src/taskpane/features/comparison/components/dialog/ComparisonRow.tsx

import * as React from "react";
import { ICellData, ICombinedChange } from "../../../../types/types";
import { Tooltip } from "@fluentui/react-components";

interface DiffCellProps {
  sheetName: string;
  cell: ICellData | null; // Cell can be null if a row/column was added/deleted
  changeMap: Map<string, ICombinedChange>;
}

const DiffCell: React.FC<DiffCellProps> = ({ sheetName, cell, changeMap }) => {
  if (!cell) {
    // Render an empty, styled cell for alignment purposes when a cell doesn't exist
    return <td style={{ border: '1px solid #eee', backgroundColor: '#f7f7f7' }}></td>;
  }
  
  const displayValue = String(cell.formula || cell.value || "");
  const change = changeMap.get(`${sheetName}-${cell.address}`);

  const style: React.CSSProperties = {
    padding: '2px 6px',
    border: '1px solid #eee',
    minWidth: '80px',
    maxWidth: '250px',
    height: '22px', // Standard Excel row height
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: 'Calibri, sans-serif', // Be Excel-like
    fontSize: '11pt',
  };

  if (change) {
    // For now, a simple background color is enough to indicate a change.
    style.backgroundColor = '#FFFBE6'; // Fluent UI's light yellow
    style.fontWeight = 'bold';
  }

  return (
    <td style={style}>
      <Tooltip content={displayValue} relationship="label">
        <span>{displayValue}</span>
      </Tooltip>
    </td>
  );
};

export default DiffCell;