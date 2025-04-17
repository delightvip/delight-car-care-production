import React, { useMemo } from 'react';
import DataTable from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { getCommonTableColumns, renderInventoryActions } from '@/components/inventory/common/InventoryTableColumns';

interface PackagingMaterialsListProps {
  data: any[];
  isLoading: boolean;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  quickUpdateQuantity: (id: number, change: number) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
  onView: (record: any) => void;
}

const PackagingMaterialsList: React.FC<PackagingMaterialsListProps> = ({
  data,
  isLoading,
  sortConfig,
  onSort,
  quickUpdateQuantity,
  onEdit,
  onDelete,
  onView,
}) => {
  // تعريف الأعمدة مع تخصيص الحقول حسب مستلزمات التعبئة
  const columns = useMemo(() => {
    const baseColumns = getCommonTableColumns()
      .map(col => {
        if (col.key === 'unit_cost') return { ...col, key: 'price' };
        if (col.key === 'min_stock') return { ...col, key: 'minStock' };
        return col;
      });
    return baseColumns;
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      onSort={onSort}
      sortConfig={sortConfig}
      actions={(record: any) =>
        renderInventoryActions(
          record,
          onEdit,
          onDelete,
          onView,
          (rec) => quickUpdateQuantity(rec.id, 1),
          (rec) => quickUpdateQuantity(rec.id, -1)
        )
      }
      className="raw-materials-table"
    />
  );
};

export default PackagingMaterialsList;
