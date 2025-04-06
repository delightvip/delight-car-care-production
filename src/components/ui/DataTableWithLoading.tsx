
import React from 'react';
import DataTable from './data-table/DataTable';
import { DataTableProps } from './data-table/types';
import DataTableSkeleton from './data-table/DataTableSkeleton';

interface DataTableWithLoadingProps extends Omit<DataTableProps, 'pagination'> {
  isLoading: boolean;
  loadingRowCount?: number;
  pagination?: boolean | { pageSize: number };
  itemsPerPage?: number;
  className?: string;
  emptyState?: React.ReactNode;
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
  itemsPerPage,
  emptyState,
  stickyHeader = true,
  className,
  ...props
}) => {
  if (isLoading) {
    return (
      <DataTableSkeleton 
        columns={columns} 
        loadingRowCount={loadingRowCount} 
        actions={!!actions} 
      />
    );
  }

  // Handle pagination options to be compatible with DataTable
  const paginationOption = typeof pagination === 'boolean' 
    ? pagination 
    : true;
  
  // Handle itemsPerPage
  const finalItemsPerPage = typeof pagination === 'object' && pagination.pageSize
    ? pagination.pageSize
    : itemsPerPage || 10;

  // Make sure all needed props are properly passed to DataTable
  return (
    <DataTable
      columns={columns}
      data={data || []}
      searchable={searchable}
      searchKeys={searchKeys}
      actions={actions}
      pagination={paginationOption}
      itemsPerPage={finalItemsPerPage}
      emptyState={emptyState}
      stickyHeader={stickyHeader}
      className={className}
      {...props}
    />
  );
};

// Export both named and default export for backward compatibility
export default DataTableWithLoading;
