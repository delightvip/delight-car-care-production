
import React, { useState } from 'react';
import { format } from 'date-fns';
import { InventoryMovement } from '@/types/inventoryTypes';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, FileText, History } from 'lucide-react';
import { MovementTypeBadge } from './MovementTypeBadge';
import ProductMovementHistory from './ProductMovementHistory';

interface InventoryMovementTableProps {
  movements: InventoryMovement[];
  isLoading: boolean;
}

const InventoryMovementTable: React.FC<InventoryMovementTableProps> = ({ movements, isLoading }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const columns = [
    {
      key: 'movement_type',
      title: 'نوع الحركة',
      cell: ({ row }: { row: { original: InventoryMovement } }) => (
        <MovementTypeBadge type={row.original.movement_type} />
      ),
      minWidth: '120px',
    },
    {
      key: 'item_type',
      title: 'الفئة',
      cell: ({ row }: { row: { original: InventoryMovement } }) => {
        let typeName = row.original.item_type;
        switch (typeName) {
          case 'raw': return 'مواد خام';
          case 'semi': return 'نصف مصنعة';
          case 'packaging': return 'مواد تعبئة';
          case 'finished': return 'منتجات نهائية';
          default: return typeName;
        }
      },
      minWidth: '130px',
    },
    {
      key: 'item_id',
      title: 'الصنف',
      render: (value: string, record: InventoryMovement) => {
        return record.item_name || value;
      },
      minWidth: '200px',
    },
    {
      key: 'quantity',
      title: 'الكمية',
      render: (value: number) => {
        const absValue = Math.abs(value);
        const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
        return <span className={value > 0 ? 'text-green-600' : value < 0 ? 'text-amber-600' : ''}>{prefix}{absValue}</span>;
      },
      minWidth: '100px',
    },
    {
      key: 'balance_after',
      title: 'الرصيد بعد',
      render: (value: number) => {
        return value.toFixed(2);
      },
      minWidth: '120px',
    },
    {
      key: 'reason',
      title: 'السبب',
      render: (value: string) => {
        return value || '-';
      },
      minWidth: '200px',
    },
    {
      key: 'created_at',
      title: 'التاريخ',
      render: (value: string) => {
        return format(new Date(value), 'yyyy/MM/dd hh:mm a');
      },
      minWidth: '150px',
      sortable: true,
    },
    {
      key: 'user_name',
      title: 'بواسطة',
      render: (value: string) => {
        return value || 'النظام';
      },
      minWidth: '120px',
    },
  ];

  const viewItemHistory = (itemId: string, itemType: string) => {
    setSelectedItemId(itemId);
    setSelectedItemType(itemType);
    setIsHistoryOpen(true);
  };

  const actions = (record: InventoryMovement) => {
    return (
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => viewItemHistory(record.item_id, record.item_type)}
          title="عرض سجل حركات الصنف"
        >
          <History className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={movements}
        searchable={true}
        searchKeys={['item_name', 'reason', 'reference']}
        searchPlaceholder="بحث في الأصناف والسبب..."
        pagination={true}
        itemsPerPage={15}
        actions={actions}
        noDataMessage="لا توجد حركات مخزون"
        stickyHeader={true}
      />
      
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>سجل حركات الصنف</DialogTitle>
          </DialogHeader>
          {selectedItemId && selectedItemType && (
            <ProductMovementHistory 
              itemId={selectedItemId} 
              itemType={selectedItemType} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InventoryMovementTable;
