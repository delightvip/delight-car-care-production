
import React from 'react';
import { StatusBadge } from './StatusBadge';
import { ImportanceBadge } from './ImportanceBadge';
import { InventoryItem } from './types';

export const getTableColumns = () => [
  {
    key: "code",
    title: "الرمز",
    render: (record: InventoryItem) => (
      <div className="font-medium">{record.code}</div>
    )
  },
  {
    key: "name",
    title: "الاسم",
    render: (record: InventoryItem) => (
      <div className="max-w-[200px] truncate" title={record.name}>
        {record.name}
      </div>
    )
  },
  {
    key: "current_stock",
    title: "المخزون الحالي",
    render: (record: InventoryItem) => (
      <div className="font-medium">
        {record.quantity} {record.unit}
      </div>
    )
  },
  {
    key: "min_stock",
    title: "الحد الأدنى",
    render: (record: InventoryItem) => (
      <div>
        {record.min_stock} {record.unit}
      </div>
    )
  },
  {
    key: "status",
    title: "الحالة",
    render: (record: InventoryItem) => (
      <StatusBadge quantity={record.quantity} minStock={record.min_stock} />
    )
  },
  {
    key: "importance",
    title: "الأهمية",
    render: (record: InventoryItem) => (
      <ImportanceBadge importance={record.importance || 0} />
    )
  }
];
