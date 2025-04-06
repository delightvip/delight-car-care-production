
import React from 'react';
import { Skeleton } from '../skeleton';

interface DataTableSkeletonProps {
  columns: { key: string; title: string; width?: string }[];
  loadingRowCount?: number;
  actions?: boolean;
}

const DataTableSkeleton: React.FC<DataTableSkeletonProps> = ({
  columns,
  loadingRowCount = 5,
  actions = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-[250px]" />
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
};

export default DataTableSkeleton;
