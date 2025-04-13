
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { InventoryMovement } from '@/types/inventoryTypes';

interface MovementCardProps {
  movement: InventoryMovement;
}

const MovementCard: React.FC<MovementCardProps> = ({ movement }) => {
  const getMovementTypeColor = (type: string | undefined) => {
    switch (type) {
      case 'in':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'out':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'adjustment':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getMovementTypeText = (type: string | undefined) => {
    switch (type) {
      case 'in':
        return 'وارد';
      case 'out':
        return 'صادر';
      case 'adjustment':
        return 'تسوية';
      default:
        return 'غير معروف';
    }
  };
  
  const getCategoryName = (category: string | undefined) => {
    switch (category) {
      case 'raw_materials':
        return 'المواد الأولية';
      case 'packaging':
        return 'مستلزمات التعبئة';
      case 'semi_finished':
        return 'المنتجات النصف مصنعة';
      case 'finished_products':
        return 'المنتجات النهائية';
      default:
        return category || '';
    }
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={`${getMovementTypeColor(movement.type)}`}>
                {getMovementTypeText(movement.type)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getCategoryName(movement.category)}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold">
              {movement.item_name || movement.item_id}
            </h3>
            <p className="text-sm text-muted-foreground">
              {movement.reason}
            </p>
          </div>
          
          <div className="text-right">
            <div className="flex flex-col items-end">
              <span className={`text-xl font-bold ${movement.type === 'in' ? 'text-green-600' : movement.type === 'out' ? 'text-red-600' : 'text-blue-600'}`}>
                {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : ''}
                {Math.abs(movement.quantity)}
              </span>
              <span className="text-xs text-muted-foreground">
                الرصيد: {movement.balance_after}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              <span>{formatDate(movement.created_at)}</span>
              {movement.user_name && (
                <span className="mr-2">بواسطة: {movement.user_name}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MovementCard;
