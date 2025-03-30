
import React from 'react';
import { Skeleton } from './skeleton';
import DataTable from './data-table/DataTable';
import { DataTableProps } from './data-table/types';

interface DataTableWithLoadingProps extends DataTableProps {
  isLoading: boolean;
  loadingRowCount?: number;
  className?: string; // Add className prop
}

export const DataTableWithLoading: React.FC<DataTableWithLoadingProps> = ({
  columns,
  data,
  isLoading,
  loadingRowCount = 5,
  searchable,
  searchKeys,
  actions,
  pagination,
  emptyState,
  stickyHeader = true,
  className,
  ...props
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          {searchable && (
            <Skeleton className="h-10 w-[250px]" />
          )}
          <div className="flex ml-auto gap-2">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
        <div className="border rounded-md">
          <div className="h-12 px-4 border-b flex items-center">
            <div className="flex w-full">
              {columns.map((column, i) => (
                <div 
                  key={i} 
                  className="flex-1 h-4"
                  style={column.width ? { width: column.width } : {}}
                >
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
              {actions && <div className="w-[100px]" />}
            </div>
          </div>
          <div className="divide-y">
            {Array(loadingRowCount).fill(0).map((_, i) => (
              <div key={i} className="h-16 px-4 flex items-center">
                <div className="flex w-full">
                  {columns.map((column, j) => (
                    <div 
                      key={j} 
                      className="flex-1 h-4"
                      style={column.width ? { width: column.width } : {}}
                    >
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                  {actions && (
                    <div className="w-[100px] flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchable={searchable}
      searchKeys={searchKeys}
      actions={actions}
      pagination={pagination}
      emptyState={emptyState}
      stickyHeader={stickyHeader}
      className={className} // Pass className prop
      {...props}
    />
  );
};

// For backward compatibility
export default DataTableWithLoading;
