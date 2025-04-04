
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash, Eye, PlusCircle, MinusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface InventoryItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  min_stock: number;
  totalValue?: number;
  importance?: number;
}

export const getCommonTableColumns = () => [
  { key: 'code', title: 'الكود', sortable: true },
  { key: 'name', title: 'الاسم', sortable: true },
  { key: 'unit', title: 'وحدة القياس', sortable: true },
  { 
    key: 'quantity', 
    title: 'الكمية',
    sortable: true,
    render: (value: number, record: any) => (
      <div className="flex items-center">
        <div className="flex items-center gap-2 min-w-[120px]">
          <div 
            className={`w-3 h-3 rounded-full ${
              value <= record.min_stock ? 'bg-red-500' : 
              value <= record.min_stock * 1.5 ? 'bg-amber-500' : 
              'bg-green-500'
            }`} 
          />
          <div className="relative w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full rounded-full ${
                value <= record.min_stock ? 'bg-red-500' : 
                value <= record.min_stock * 1.5 ? 'bg-amber-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, Math.round((value / (record.min_stock * 2)) * 100))}%` }}
            ></div>
          </div>
          <span className={`font-medium ${
            value <= record.min_stock ? 'text-red-700' : 
            value <= record.min_stock * 1.5 ? 'text-amber-700' : 
            'text-green-700'
          }`}>{value} {record.unit}</span>
        </div>
      </div>
    )
  },
  { 
    key: 'unit_cost', 
    title: 'التكلفة',
    sortable: true,
    render: (value: number) => `${value} ج.م`
  },
  { 
    key: 'min_stock', 
    title: 'الحد الأدنى',
    sortable: true,
    render: (value: number, record: any) => `${value} ${record.unit}`
  },
  { 
    key: 'totalValue', 
    title: 'إجمالي القيمة',
    sortable: true,
    render: (value: number) => `${value} ج.م`
  }
];

export const getImportanceColumn = () => ({
  key: 'importance',
  title: 'الأهمية',
  sortable: true,
  render: (value: number) => {
    const labels = {
      0: 'منخفضة',
      1: 'متوسطة',
      2: 'عالية'
    };
    const colors = {
      0: 'bg-blue-100 text-blue-800',
      1: 'bg-amber-100 text-amber-800',
      2: 'bg-red-100 text-red-800'
    };
    return (
      <Badge className={`${colors[value as keyof typeof colors]}`}>
        {labels[value as keyof typeof labels]}
      </Badge>
    );
  }
});

export const renderInventoryActions = (
  record: any, 
  onEdit: (record: any) => void, 
  onDelete: (record: any) => void, 
  onView: (record: any) => void,
  onIncrement?: (record: any) => void,
  onDecrement?: (record: any) => void
) => (
  <div className="flex space-x-2 rtl:space-x-reverse">
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onEdit(record)}
    >
      <Edit size={16} />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onDelete(record)}
    >
      <Trash size={16} />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onView(record)}
    >
      <Eye size={16} />
    </Button>
    {onIncrement && (
      <Button
        variant="ghost"
        size="icon"
        title="زيادة الكمية"
        onClick={() => onIncrement(record)}
      >
        <PlusCircle size={16} />
      </Button>
    )}
    {onDecrement && (
      <Button
        variant="ghost"
        size="icon"
        title="نقص الكمية"
        onClick={() => onDecrement(record)}
      >
        <MinusCircle size={16} />
      </Button>
    )}
  </div>
);
