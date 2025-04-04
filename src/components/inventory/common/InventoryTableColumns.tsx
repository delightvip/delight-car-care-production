
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash, Eye, PlusCircle, MinusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ensureNumericValue, formatCurrency } from './InventoryDataFormatter';

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
  sales_price?: number;
}

export const getCommonTableColumns = () => [
  { key: 'code', title: 'الكود', sortable: true },
  { key: 'name', title: 'الاسم', sortable: true },
  { key: 'unit', title: 'وحدة القياس', sortable: true },
  { 
    key: 'quantity', 
    title: 'الكمية',
    sortable: true,
    render: (value: number, record: any) => {
      // Ensure values are numeric
      const quantity = ensureNumericValue(value);
      const minStock = ensureNumericValue(record.min_stock);
      
      return (
        <div className="flex items-center">
          <div className="flex items-center gap-2 min-w-[120px]">
            <div 
              className={`w-3 h-3 rounded-full ${
                quantity <= minStock ? 'bg-red-500' : 
                quantity <= minStock * 1.5 ? 'bg-amber-500' : 
                'bg-green-500'
              }`} 
            />
            <div className="relative w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full ${
                  quantity <= minStock ? 'bg-red-500' : 
                  quantity <= minStock * 1.5 ? 'bg-amber-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, Math.round((quantity / (minStock * 2)) * 100))}%` }}
              ></div>
            </div>
            <span className={`font-medium ${
              quantity <= minStock ? 'text-red-700' : 
              quantity <= minStock * 1.5 ? 'text-amber-700' : 
              'text-green-700'
            }`}>{quantity} {record.unit}</span>
          </div>
        </div>
      );
    }
  },
  { 
    key: 'unit_cost', 
    title: 'التكلفة',
    sortable: true,
    render: (value: number) => formatCurrency(ensureNumericValue(value))
  },
  { 
    key: 'sales_price', 
    title: 'سعر البيع',
    sortable: true,
    render: (value: number) => value ? formatCurrency(ensureNumericValue(value)) : 'غير محدد'
  },
  { 
    key: 'min_stock', 
    title: 'الحد الأدنى',
    sortable: true,
    render: (value: number, record: any) => `${ensureNumericValue(value)} ${record.unit}`
  },
  { 
    key: 'totalValue', 
    title: 'إجمالي القيمة',
    sortable: true,
    render: (value: number, record: any) => {
      // If totalValue is not calculated correctly, calculate it here
      if (!value || typeof value === 'object') {
        const quantity = ensureNumericValue(record.quantity);
        const unitCost = ensureNumericValue(record.unit_cost);
        return formatCurrency(quantity * unitCost);
      }
      return formatCurrency(ensureNumericValue(value));
    }
  }
];

export const getImportanceColumn = () => ({
  key: 'importance',
  title: 'الأهمية',
  sortable: true,
  render: (value: number) => {
    const importanceValue = ensureNumericValue(value);
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
      <Badge className={`${colors[importanceValue as keyof typeof colors]}`}>
        {labels[importanceValue as keyof typeof labels]}
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
