import React from 'react';
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Column } from './types';

interface TableBodyProps {
  columns: Column[];
  data: any[];
  actions?: (record: any) => React.ReactNode;
  noDataMessage?: string;
  emptyState?: React.ReactNode;
}

const TableBodyComponent: React.FC<TableBodyProps> = ({
  columns,
  data,
  actions,
  noDataMessage = "لا توجد بيانات للعرض",
  emptyState
}) => {
  if (!data.length) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
            {emptyState || noDataMessage}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  const renderCell = (column: Column, record: any) => {
    if (!column.render) {
      return record[column.key];
    }
    
    const renderFn = column.render as Function;
    if (renderFn.length > 1) {
      return renderFn(record[column.key], record);
    } else {
      return renderFn(record);
    }
  };  return (
    <TableBody>
      {data.map((record, index) => (
        <TableRow 
          key={index} 
          className={`hover:bg-muted/70 ${index % 2 === 0 ? '' : 'bg-muted/30'}`}
        >
          {columns.map((column) => (
            <TableCell 
              key={`${index}-${column.key}`}
              style={{
                width: column.width || 'auto',
                minWidth: column.minWidth || '100px'
              }}
            >
              {column.cell 
                ? column.cell({ row: { original: record } }) 
                : renderCell(column, record)}
            </TableCell>
          ))}
          {actions && (
            <TableCell 
              className="sticky right-0 z-20 bg-background shadow-md" 
              style={{ 
                minWidth: '120px',
                backgroundColor: 'var(--background)'
              }}
            >
              {actions(record)}
            </TableCell>
          )}
        </TableRow>
      ))}
    </TableBody>
  );
};

export default TableBodyComponent;
