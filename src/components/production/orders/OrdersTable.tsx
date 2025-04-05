
import React from 'react';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { ProductionOrder, PackagingOrder } from '@/services/production/ProductionTypes';

type OrdersTableProps = {
  data: (ProductionOrder | PackagingOrder)[];
  isLoading: boolean;
  onView: (order: ProductionOrder | PackagingOrder) => void;
  onStatus: (order: ProductionOrder | PackagingOrder) => void;
  onEdit: (order: ProductionOrder | PackagingOrder) => void;
  onDelete: (order: ProductionOrder | PackagingOrder) => void;
};

const OrdersTable = ({
  data,
  isLoading,
  onView,
  onStatus,
  onEdit,
  onDelete
}: OrdersTableProps) => {
  const columns = [
    { key: 'code', title: 'كود الأمر' },
    { key: 'productName', title: 'المنتج' },
    { 
      key: 'quantity', 
      title: 'الكمية',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { 
      key: 'status', 
      title: 'الحالة',
      render: (value: 'pending' | 'inProgress' | 'completed' | 'cancelled') => (
        <StatusBadge status={value} />
      )
    },
    { key: 'date', title: 'التاريخ' },
    { 
      key: 'totalCost', 
      title: 'التكلفة الإجمالية',
      render: (value: number) => `${value.toFixed(2)} ج.م`
    }
  ];

  const renderActions = (record: ProductionOrder | PackagingOrder) => (
    <div className="flex space-x-2 rtl:space-x-reverse">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onView(record)}
        className="hover:bg-primary/10"
      >
        <Eye size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onStatus(record)}
        className="hover:bg-primary/10"
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(record)}
        disabled={record.status !== 'pending'}
        className="hover:bg-primary/10"
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(record)}
        disabled={record.status !== 'pending'}
        className="hover:bg-primary/10"
      >
        <Trash size={16} />
      </Button>
    </div>
  );

  return (
    <DataTableWithLoading
      columns={columns}
      data={data}
      searchable
      searchKeys={['code', 'productName']}
      actions={renderActions}
      isLoading={isLoading}
    />
  );
};

export default OrdersTable;
