
import React from 'react';
import { StatusBadge } from './StatusBadge';
import { ImportanceBadge } from './ImportanceBadge';
import { InventoryItem } from './types';

export const getTableColumns = () => [
  {
    key: "code",
    title: "الرمز",
    render: (value: any, row: InventoryItem) => (
      <div className="font-medium">{row.code}</div>
    )
  },
  {
    key: "name",
    title: "الاسم",
    render: (value: any, row: InventoryItem) => (
      <div className="max-w-[200px] truncate" title={row.name}>
        {row.name}
      </div>
    )
  },
  {
    key: "current_stock",
    title: "المخزون الحالي",
    render: (value: any, row: InventoryItem) => (
      <div className="font-medium">
        {row.quantity} {row.unit}
      </div>
    )
  },
  {
    key: "min_stock",
    title: "الحد الأدنى",
    render: (value: any, row: InventoryItem) => (
      <div>
        {row.min_stock} {row.unit}
      </div>
    )
  },
  {
    key: "status",
    title: "الحالة",
    render: (value: any, row: InventoryItem) => (
      <StatusBadge quantity={row.quantity} minStock={row.min_stock} />
    )
  },
  {
    key: "importance",
    title: "الأهمية",
    render: (value: any, row: InventoryItem) => (
      <ImportanceBadge importance={row.importance || 0} />
    )
  }
];
