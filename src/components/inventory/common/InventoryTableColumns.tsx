
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  Minus,
  AlertTriangle
} from 'lucide-react';
import { 
  formatCurrency, 
  ensureNumericValue, 
  isLowStock 
} from './InventoryDataFormatter';

/**
 * Returns the common columns used across different inventory tables
 */
export const getCommonTableColumns = () => [
  {
    key: 'code',
    title: 'الكود',
    sortable: true,
    width: '120px'
  },
  {
    key: 'name',
    title: 'الاسم',
    sortable: true,
    minWidth: '200px'
  },
  {
    key: 'unit',
    title: 'الوحدة',
    sortable: false,
    width: '100px'
  },
  {
    key: 'quantity',
    title: 'الكمية',
    sortable: true,
    width: '120px',
    render: (value: any, record: any) => (
      <div className="flex items-center">
        <span className="mr-2">{value}</span>
        {isLowStock(record) && (
          <span className="inline-flex">
            <AlertTriangle size={16} className="text-amber-500" />
          </span>
        )}
      </div>
    )
  },
  {
    key: 'min_stock',
    title: 'الحد الأدنى',
    sortable: true,
    width: '120px'
  },
  {
    key: 'unit_cost',
    title: 'التكلفة',
    sortable: true,
    width: '120px',
    render: (value: any) => formatCurrency(ensureNumericValue(value))
  },
  {
    key: 'totalValue',
    title: 'القيمة الإجمالية',
    sortable: true,
    width: '150px',
    render: (value: any, record: any) => {
      const quantity = ensureNumericValue(record.quantity);
      const unitCost = ensureNumericValue(record.unit_cost);
      const totalValue = quantity * unitCost;
      
      return formatCurrency(totalValue);
    }
  }
];

/**
 * Returns the common actions used across different inventory tables
 */
export const renderInventoryActions = (
  record: any,
  onEdit: (record: any) => void,
  onDelete: (record: any) => void,
  onView: (record: any) => void,
  onIncrement?: (record: any) => void,
  onDecrement?: (record: any) => void
) => {
  return (
    <div className="flex justify-end gap-2">
      {onIncrement && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={(e) => {
            e.stopPropagation();
            onIncrement(record);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
      
      {onDecrement && record.quantity > 0 && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={(e) => {
            e.stopPropagation();
            onDecrement(record);
          }}
        >
          <Minus className="h-4 w-4" />
        </Button>
      )}
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={(e) => {
          e.stopPropagation();
          onView(record);
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={(e) => {
          e.stopPropagation();
          onEdit(record);
        }}
      >
        <Edit className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(record);
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
};

export const getInventoryStatusBadge = (record: any) => {
  const quantity = ensureNumericValue(record.quantity);
  const minStock = ensureNumericValue(record.min_stock);
  
  if (quantity <= 0) {
    return <Badge variant="destructive">نفد من المخزون</Badge>;
  } else if (quantity <= minStock) {
    return <Badge variant="destructive">أقل من الحد الأدنى</Badge>;
  } else if (quantity <= minStock * 1.2) {
    return <Badge variant="warning">مخزون منخفض</Badge>;
  } else {
    return <Badge variant="success">متوفر</Badge>;
  }
};
