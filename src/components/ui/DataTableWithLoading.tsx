import React from 'react';
import DataTable from './DataTable';
import { Skeleton } from './skeleton';

export interface DataTableWithLoadingProps {
  columns: {
    key: string;
    title: string;
    render?: (value: any, record: any) => any;
    sortable?: boolean;
    width?: string; // إضافة خاصية العرض للعمود
  }[];
  data: any[];
  searchable?: boolean;
  searchKeys?: string[];
  actions?: (record: any) => React.ReactNode;
  isLoading?: boolean;
  searchPlaceholder?: string;
  noDataMessage?: string;
  onSort?: (key: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  className?: string; // إضافة خاصية CSS إضافية
}

const DataTableWithLoading: React.FC<DataTableWithLoadingProps> = ({ 
  columns, 
  data, 
  searchable = true, 
  searchKeys, 
  actions,
  isLoading = false,
  searchPlaceholder = "بحث...",
  noDataMessage = "لا توجد بيانات لعرضها.",
  onSort,
  sortConfig,
  className = ""
}) => {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {searchable && (
          <div className="mb-4">
            <Skeleton className="h-10 w-full max-w-sm" />
          </div>
        )}
        <div className="rounded-md border data-table-container">
          <div className="p-4">
            <div className="space-y-3">
              {Array(5).fill(0).map((_, idx) => (
                <Skeleton key={idx} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DataTable 
      columns={columns} 
      data={data || []} 
      searchable={searchable} 
      searchKeys={searchKeys} 
      actions={actions} 
      searchPlaceholder={searchPlaceholder}
      noDataMessage={noDataMessage}
      onSort={onSort}
      sortConfig={sortConfig}
      className={className}
    />
  );
};

export default DataTableWithLoading;
