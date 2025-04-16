
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, Package2Icon } from 'lucide-react';
import InventoryMovementTrackingService from '@/services/inventory/InventoryMovementTrackingService';

interface InventoryMovementListProps {
  limit?: number;
  selectedCategory?: string;
  movementType?: string;
  searchTerm?: string;
}

const InventoryMovementList: React.FC<InventoryMovementListProps> = ({
  limit = 50,
  selectedCategory,
  movementType,
  searchTerm,
}) => {
  const trackingService = InventoryMovementTrackingService.getInstance();
  
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['inventory-movements-list', limit, selectedCategory, movementType, searchTerm],
    queryFn: async () => {
      const recentMovements = await trackingService.getRecentMovements(limit);
      
      // تطبيق التصفية
      return recentMovements.filter(movement => {
        // التصفية حسب الفئة
        if (selectedCategory && selectedCategory !== 'all' && movement.item_type !== selectedCategory) {
          return false;
        }
        
        // التصفية حسب نوع الحركة
        if (movementType && movementType !== 'all' && movement.movement_type !== movementType) {
          return false;
        }
        
        // التصفية حسب مصطلح البحث
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const itemName = (movement.item_name || '').toLowerCase();
          const reason = (movement.reason || '').toLowerCase();
          if (!itemName.includes(term) && !reason.includes(term)) {
            return false;
          }
        }
        
        return true;
      });
    },
  });
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  
  if (!movements.length) {
    return (
      <div className="text-center py-12">
        <Package2Icon className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
        <h3 className="mt-4 text-lg font-medium">لم يتم العثور على حركات</h3>
        <p className="text-muted-foreground">
          لا توجد حركات مخزون تطابق معايير البحث
        </p>
      </div>
    );
  }
  
  // ترجمة نوع العنصر
  const getItemTypeName = (type: string) => {
    switch (type) {
      case 'raw':
        return 'مادة خام';
      case 'packaging':
        return 'مادة تعبئة';
      case 'semi':
        return 'نصف مصنع';
      case 'finished':
        return 'منتج نهائي';
      default:
        return type;
    }
  };
  
  return (
    <div className="space-y-4">
      {movements.map((movement) => (
        <Card key={movement.id} className="overflow-hidden hover:bg-muted/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${movement.movement_type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {movement.movement_type === 'in' ? (
                  <ArrowUpIcon className="h-5 w-5" />
                ) : (
                  <ArrowDownIcon className="h-5 w-5" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {movement.item_name || 'عنصر غير معروف'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(movement.created_at), 'PPP', { locale: ar })}
                    </div>
                  </div>
                  
                  <div className="md:text-right">
                    <div className="text-xl font-bold">
                      {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">
                        {getItemTypeName(movement.item_type)}
                      </Badge>
                      {movement.user_name && (
                        <Badge variant="secondary">
                          {movement.user_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {movement.reason && (
                  <div className="mt-2 text-sm border-t pt-2 text-muted-foreground">
                    {movement.reason}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InventoryMovementList;
