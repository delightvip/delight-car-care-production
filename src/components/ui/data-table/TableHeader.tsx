import React from 'react';
import { TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ArrowDownUp, ArrowDown, ArrowUp } from 'lucide-react';
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
            className={`font-semibold border-b border-muted-foreground/10 whitespace-nowrap align-middle h-8 px-1 py-1 text-xs bg-white dark:bg-neutral-900 ${column.headerClassName || ''}`}
            style={{ 
              minWidth: column.minWidth, 
              maxWidth: column.maxWidth,
              position: 'relative',
              whiteSpace: 'nowrap'
            }}
          >
            <div className="flex items-center gap-1 justify-center select-none w-full">
              <span className="w-full text-center block truncate text-gray-800 dark:text-gray-100 font-bold tracking-wide">
                {column.title}
              </span>
              {column.sortable && onSort && (
                <button
                  className={`group p-0.5 rounded hover:bg-muted/70 focus:outline-none transition border border-transparent focus:border-primary/40`}
                  style={{ lineHeight: 1 }}
                  tabIndex={0}
                  onClick={() => onSort(column.key)}
                  aria-label={`إعادة ترتيب ${column.title}`}
                >
                  {sortConfig?.key === column.key ? (
                    sortConfig.direction === 'asc' ? (
                      <ArrowUp size={15} className="text-primary scale-110 transition-transform" />
                    ) : (
                      <ArrowDown size={15} className="text-primary scale-110 transition-transform" />
                    )
                  ) : (
                    <ArrowUpDown size={15} className="text-gray-400 group-hover:text-primary/80 transition-transform" />
                  )}
                </button>
              )}
            </div>
          </TableHead>
        ))}
        {hasActions && (
          <TableHead 
            className="font-semibold border-b border-muted-foreground/10 whitespace-nowrap text-right align-middle h-8 px-1 py-1 text-xs bg-white dark:bg-neutral-900"
          >
            الإجراءات
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );
};

export default TableHeaderComponent;
