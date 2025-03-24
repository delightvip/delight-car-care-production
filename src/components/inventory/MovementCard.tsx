
import React from 'react';
import { format } from 'date-fns';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface InventoryMovementProps {
  id: number;
  type: 'in' | 'out';
  category: string;
  item_name: string;
  quantity: number;
  date: Date;
  note: string;
}

const MovementCard: React.FC<{ movement: InventoryMovementProps }> = ({ movement }) => {
  return (
    <div className="flex items-start p-4 border rounded-lg transition-colors">
      <div className={`shrink-0 p-2 rounded-full mr-4 ${
        movement.type === 'in' 
          ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' 
          : 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300'
      }`}>
        {movement.type === 'in' ? (
          <ArrowDownIcon className="h-6 w-6" />
        ) : (
          <ArrowUpIcon className="h-6 w-6" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between">
          <div>
            <h3 className="font-medium">{movement.item_name}</h3>
            <p className="text-sm text-muted-foreground">{movement.note}</p>
          </div>
          <div className="text-left">
            <span className="font-medium">
              {movement.type === 'in' ? '+' : '-'}{movement.quantity}
            </span>
            <p className="text-xs text-muted-foreground">
              {format(movement.date, 'yyyy/MM/dd')}
            </p>
          </div>
        </div>
        <div className="mt-2">
          <Badge 
            variant="outline" 
            className={`
              ${movement.category === 'raw_materials' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
              ${movement.category === 'semi_finished' ? 'bg-green-50 text-green-700 border-green-200' : ''}
              ${movement.category === 'packaging' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
              ${movement.category === 'finished_products' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
            `}
          >
            {movement.category === 'raw_materials' && 'المواد الأولية'}
            {movement.category === 'semi_finished' && 'المنتجات النصف مصنعة'}
            {movement.category === 'packaging' && 'مستلزمات التعبئة'}
            {movement.category === 'finished_products' && 'المنتجات النهائية'}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default MovementCard;
