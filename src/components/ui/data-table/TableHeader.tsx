
import React from 'react';
import { TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Column, SortConfig } from './types';

interface TableHeaderProps {
  columns: Column[];
  onSort?: (key: string) => void;
  sortConfig?: SortConfig | null;
  stickyHeader?: boolean;
  hasActions?: boolean;
}

const TableHeaderComponent: React.FC<TableHeaderProps> = ({
  columns,
  onSort,
  sortConfig,
  stickyHeader = true,
  hasActions = false
}) => {
  return (
    <TableHeader className={stickyHeader ? "sticky top-0 z-10" : ""}>
      <TableRow>
        {columns.map((column) => (
          <TableHead 
            key={column.key} 
            className="bg-muted font-semibold"
            style={{
              width: column.width || 'auto', 
              minWidth: column.minWidth || '100px',
              position: 'relative',
              whiteSpace: 'nowrap'
            }}
          >
            <div className="flex items-center">
              {column.title}
              {column.sortable && (
                <div className="mr-1 flex flex-col">
                  <ArrowUp
                    onClick={() => onSort?.(column.key)}
                    className={`h-4 w-4 cursor-pointer ${sortConfig?.key === column.key && sortConfig?.direction === 'asc' ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <ArrowDown
                    onClick={() => onSort?.(column.key)}
                    className={`h-4 w-4 cursor-pointer ${sortConfig?.key === column.key && sortConfig?.direction === 'desc' ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                </div>
              )}
            </div>
          </TableHead>
        ))}
        {hasActions && (
          <TableHead 
            className="bg-muted sticky right-0 z-20 shadow-md" 
            style={{ 
              minWidth: '120px',
              backgroundColor: 'var(--muted)'
            }}
          >
            الإجراءات
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default TableHeaderComponent;
