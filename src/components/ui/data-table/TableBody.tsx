
import React from 'react';
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

interface TableBodyProps {
  columns: Array<{
    key: string;
    title: string;
    render?: (value: any, record: any) => React.ReactNode;
    sortable?: boolean;
    width?: string;
    minWidth?: string;
  }>;
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
  emptyState,
}) => {
  if (data.length === 0) {
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

  return (
    <TableBody>
      {data.map((record, index) => (
        <TableRow key={index} className="hover:bg-muted/50">
          {columns.map((column) => (
            <TableCell 
              key={`${index}-${column.key}`}
              style={{
                width: column.width || 'auto',
                minWidth: column.minWidth || '100px'
              }}
            >
              {column.render 
                ? column.render(record[column.key], record) 
                : record[column.key]}
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
