import React from 'react';
import { Button } from '@/components/ui/button';
import { PenSquare, Trash2, Eye, PlusCircle, MinusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ensureNumericValue, formatCurrency, formatDisplayValue } from './InventoryDataFormatter';

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
  { 
    key: 'code', 
    title: 'الكود', 
    sortable: true,
    className: 'px-1 text-xs py-1.5 md:py-2 align-middle',
    headerClassName: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    minWidth: '60px',
    maxWidth: '80px',
  },
  { 
    key: 'name', 
    title: 'اسم المادة', 
    sortable: true,
    className: 'px-1 text-xs font-bold truncate py-1.5 md:py-2 align-middle',
    headerClassName: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    minWidth: '100px',
    maxWidth: '160px',
  },
  { 
    key: 'quantity', 
    title: 'الكمية',
    sortable: true,
    className: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    headerClassName: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    minWidth: '90px',
    maxWidth: '120px',
    render: (value: number, record: any) => {
      const quantity = ensureNumericValue(value);
      const minStock = ensureNumericValue(record.min_stock);
      let displayQuantity = 0;
      if (quantity === 0) displayQuantity = 0;
      else if (quantity > 0 && quantity < 1) displayQuantity = Number(quantity.toFixed(2));
      else displayQuantity = Math.round(quantity);
      const percent = minStock > 0 ? Math.min(100, Math.round((quantity / minStock) * 100)) : 0;
      let barColor = 'bg-green-500';
      let textColor = 'text-green-700';
      let percentColor = 'text-green-500';
      if (quantity <= minStock) {
        barColor = 'bg-red-500';
        textColor = 'text-red-700 dark:text-red-400 font-bold';
        percentColor = 'text-red-500';
      } else if (quantity > minStock && quantity < minStock * 2) {
        barColor = 'bg-amber-400';
        textColor = 'text-amber-700 dark:text-yellow-400 font-semibold';
        percentColor = 'text-amber-500';
      }
      return (
        <div className="flex flex-col items-center justify-center gap-0.5 py-0.5">
          <span className={`block text-center font-bold text-[15px] leading-tight ${textColor}`}>{displayQuantity}</span>
          <div className="relative w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <span
            className={`text-[10px] font-bold mt-0 ${percentColor}`}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
          >
            {percent}%
          </span>
        </div>
      );
    }
  },
  { 
    key: 'unit', 
    title: 'الوحدة', 
    sortable: false,
    className: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    headerClassName: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    minWidth: '50px',
    maxWidth: '60px',
  },
  { 
    key: 'unit_cost', 
    title: 'التكلفة',
    sortable: true,
    className: 'px-1 text-xs py-1.5 md:py-2 align-middle',
    headerClassName: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    minWidth: '70px',
    maxWidth: '90px',
    render: (value: number) => {
      const unitCost = ensureNumericValue(value, 'unit_cost');
      let color = 'text-gray-800';
      if (unitCost >= 1000) color = 'text-red-700 dark:text-red-400 font-bold';
      else if (unitCost >= 300) color = 'text-amber-700 dark:text-yellow-400 font-semibold';
      else if (unitCost > 0) color = 'text-green-700 dark:text-green-300';
      else color = 'text-gray-400';
      return <span className={color + ' text-base'}>{formatCurrency(unitCost)}</span>;
    }
  },
  { 
    key: 'sales_price', 
    title: 'سعر البيع',
    sortable: true,
    className: 'px-1 text-sm font-bold font-[Cairo] text-blue-700 dark:text-blue-300 py-1.5 md:py-2 align-middle',
    headerClassName: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    minWidth: '80px',
    maxWidth: '120px',
    render: (value: number) => (
      <span className="font-bold text-base font-[Cairo] text-blue-700 dark:text-blue-300">{formatCurrency(ensureNumericValue(value, 'sales_price'))}</span>
    ),
  },
  { 
    key: 'min_stock', 
    title: 'الحد الأدنى',
    sortable: true,
    className: 'px-1 text-sm font-semibold font-[Cairo] text-amber-700 dark:text-yellow-400 py-1.5 md:py-2 align-middle',
    headerClassName: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    minWidth: '70px',
    maxWidth: '100px',
    render: (value: number) => (
      <span className="font-semibold text-base font-[Cairo] text-amber-700 dark:text-yellow-400">{ensureNumericValue(value, 'min_stock')}</span>
    ),
  },
  { 
    key: 'totalValue',
    title: 'إجمالي التكلفة',
    sortable: true,
    className: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    headerClassName: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
    minWidth: '100px',
    maxWidth: '140px',
    render: (value: number, record: any) => {
      if (value === undefined || value === null) {
        const quantity = ensureNumericValue(record.quantity, 'quantity');
        const unitCost = ensureNumericValue(record.unit_cost, 'unit_cost');
        return (
          <span className="font-bold text-sm font-[Cairo] text-green-900 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded-md shadow-sm tracking-wide border border-green-100 dark:border-green-800 flex items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap" style={{width:'92px', height:'32px', fontVariantNumeric:'tabular-nums', lineHeight:'2'}}>
            {formatCurrency(quantity * unitCost)}
          </span>
        );
      }
      return (
        <span className="font-bold text-sm font-[Cairo] text-green-900 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded-md shadow-sm tracking-wide border border-green-100 dark:border-green-800 flex items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap" style={{width:'92px', height:'32px', fontVariantNumeric:'tabular-nums', lineHeight:'2'}}>
          {formatCurrency(ensureNumericValue(value, 'totalValue'))}
        </span>
      );
    },
  },
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
  <div className="flex space-x-1 rtl:space-x-reverse">
    <Button
      variant="ghost"
      size="icon"
      className="w-7 h-7 min-w-0 min-h-0 p-1 bg-blue-900/15 hover:bg-blue-900/25 border border-blue-700/10 dark:bg-blue-700/20 dark:hover:bg-blue-700/30 dark:border-blue-600/10 shadow-sm"
      onClick={() => onEdit(record)}
      aria-label="تعديل"
    >
      <PenSquare size={15} />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="w-7 h-7 min-w-0 min-h-0 p-1 bg-red-600/10 hover:bg-red-700/15 border border-red-700/10 dark:bg-red-700/20 dark:hover:bg-red-800/30 dark:border-red-800/10 shadow-sm"
      onClick={() => onDelete(record)}
      aria-label="حذف"
    >
      <Trash2 size={15} />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="w-7 h-7 min-w-0 min-h-0 p-1 bg-yellow-900/10 hover:bg-yellow-900/15 border border-yellow-700/10 dark:bg-yellow-700/15 dark:hover:bg-yellow-700/25 dark:border-yellow-600/10 shadow-sm"
      onClick={() => onView(record)}
      aria-label="عرض"
    >
      <Eye size={15} />
    </Button>
    {onIncrement && (
      <Button
        variant="ghost"
        size="icon"
        title="زيادة الكمية"
        className="w-7 h-7 min-w-0 min-h-0 p-1 bg-green-900/10 hover:bg-green-900/15 border border-green-700/10 dark:bg-green-700/15 dark:hover:bg-green-700/25 dark:border-green-600/10 shadow-sm"
        onClick={() => onIncrement(record)}
      >
        <PlusCircle size={15} />
      </Button>
    )}
    {onDecrement && (
      <Button
        variant="ghost"
        size="icon"
        title="نقص الكمية"
        className="w-7 h-7 min-w-0 min-h-0 p-1 bg-orange-600/10 hover:bg-orange-700/15 border border-orange-700/10 dark:bg-orange-700/15 dark:hover:bg-orange-800/25 dark:border-orange-800/10 shadow-sm"
        onClick={() => onDecrement(record)}
      >
        <MinusCircle size={15} />
      </Button>
    )}
  </div>
);
