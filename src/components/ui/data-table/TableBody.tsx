
import React from 'react';
import { TableBody as ShadcnTableBody, TableCell, TableRow } from "@/components/ui/table";
import { Column } from './types';

interface TableBodyProps {
  columns: Column[];
  data: any[];
  actions?: (record: any) => React.ReactNode;
  noDataMessage: string;
}

const TableBodyComponent: React.FC<TableBodyProps> = ({ 
  columns, 
  data, 
  actions, 
  noDataMessage 
}) => {
  if (data.length === 0) {
    return (
      <ShadcnTableBody>
        <TableRow>
          <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
            {noDataMessage}
          </TableCell>
        </TableRow>
      </ShadcnTableBody>
    );
  }

  return (
    <ShadcnTableBody>
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
    </ShadcnTableBody>
  );
};

export default TableBodyComponent;
