
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import DataTable from '@/components/ui/data-table';
import { Column } from '@/components/ui/data-table/types';

interface DataTableWithLoadingProps {
  isLoading: boolean;
  columns: Column[];
  data: any[];
  searchable?: boolean;
  searchKeys?: string[];
  pagination?: boolean;
  itemsPerPage?: number;
  actions?: (record: any) => React.ReactNode;
  searchPlaceholder?: string;
  noDataMessage?: string;
  onSort?: (key: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  stickyHeader?: boolean;
  containerClassName?: string;
  className?: string;
}

export function DataTableWithLoading({
  isLoading,
  columns,
  data,
  searchable = true,
  searchKeys = [],
  pagination = true,
  itemsPerPage = 10,
  actions,
  searchPlaceholder,
  noDataMessage,
  onSort,
  sortConfig,
  stickyHeader = true,
  containerClassName,
  className,
}: DataTableWithLoadingProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, index) => (
          <Skeleton 
            key={index} 
            className="h-12 w-full"
          />
        ))}
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchable={searchable}
      searchKeys={searchKeys}
      pagination={pagination}
      itemsPerPage={itemsPerPage}
      actions={actions}
      searchPlaceholder={searchPlaceholder}
      noDataMessage={noDataMessage}
      onSort={onSort}
      sortConfig={sortConfig}
      stickyHeader={stickyHeader}
      containerClassName={containerClassName}
      className={className}
    />
  );
}
