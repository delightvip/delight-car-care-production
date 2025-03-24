
import React from 'react';
import DataTable from './DataTable';
import { Skeleton } from './skeleton';

export interface DataTableWithLoadingProps {
  columns: {
    key: string;
    title: string;
    render?: (value: any, record: any) => any;
  }[];
  data: any[];
  searchable?: boolean;
  searchKeys?: string[];
  actions?: (record: any) => React.ReactNode;
  isLoading?: boolean;
}

const DataTableWithLoading: React.FC<DataTableWithLoadingProps> = ({ 
  columns, 
  data, 
  searchable, 
  searchKeys, 
  actions,
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {searchable && (
          <div className="mb-4">
            <Skeleton className="h-10 w-full max-w-sm" />
          </div>
        )}
        <div className="rounded-md border">
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
      data={data} 
      searchable={searchable} 
      searchKeys={searchKeys} 
      actions={actions} 
    />
  );
};

export default DataTableWithLoading;
