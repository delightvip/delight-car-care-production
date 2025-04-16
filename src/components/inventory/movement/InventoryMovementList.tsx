
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import InventoryMovementTrackingService from '@/services/inventory/InventoryMovementTrackingService';
import { Skeleton } from '@/components/ui/skeleton';

// واجهة الحركة
interface MovementProps {
  id: string;
  movement_type: 'in' | 'out';
  item_type: string;
  item_name: string;
  quantity: number;
  reason?: string;
  created_at: string;
  user_name?: string;
}

// مكون حركة واحدة
const MovementItem: React.FC<{ movement: MovementProps }> = ({ movement }) => {
  // تحويل نوع العنصر إلى نص مفهوم
  const getItemTypeText = (type: string) => {
    switch (type) {
      case 'raw':
        return 'مادة خام';
      case 'packaging':
        return 'مادة تعبئة';
      case 'semi':
        return 'منتج نصف مصنع';
      case 'finished':
        return 'منتج نهائي';
      default:
        return type;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-2 md:mb-0">
            <h3 className="text-base font-medium">
              {movement.item_name}
              <Badge 
                variant="outline" 
                className="mr-2 bg-gray-100 text-xs"
              >
                {getItemTypeText(movement.item_type)}
              </Badge>
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              {movement.reason ? movement.reason : movement.movement_type === 'in' ? 'إضافة للمخزون' : 'صرف من المخزون'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left">
              <Badge 
                variant={movement.movement_type === 'in' ? 'default' : 'destructive'}
                className="mb-1"
              >
                {movement.movement_type === 'in' ? 'وارد' : 'صادر'}
              </Badge>
              <p className="text-lg font-semibold">{movement.quantity}</p>
            </div>
            <div className="text-sm text-muted-foreground text-left">
              <p>{format(new Date(movement.created_at), 'PPP', { locale: ar })}</p>
              <p>{movement.user_name || 'النظام'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// واجهة الخصائص
interface InventoryMovementListProps {
  itemId?: string;
  itemType?: string;
  limit?: number;
}

// مكون قائمة الحركات
const InventoryMovementList: React.FC<InventoryMovementListProps> = ({ 
  itemId, itemType, limit = 10 
}) => {
  const trackingService = InventoryMovementTrackingService.getInstance();
  
  // الحصول على حركات المخزون
  const { data: movements, isLoading, error } = useQuery({
    queryKey: ['inventory-movements', itemId, itemType, limit],
    queryFn: async () => {
      if (itemId && itemType) {
        return trackingService.getItemMovements(itemId, itemType);
      } else {
        return trackingService.getRecentMovements(limit);
      }
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">حدث خطأ أثناء تحميل البيانات</p>
      </div>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">لا توجد حركات مخزون لعرضها</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {movements.slice(0, limit).map((movement) => (
        <MovementItem key={movement.id} movement={movement} />
      ))}
    </div>
  );
};

export default InventoryMovementList;
