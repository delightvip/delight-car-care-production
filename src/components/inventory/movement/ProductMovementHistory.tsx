
import React, { useState, useEffect } from 'react';
import { InventoryMovement } from '@/types/inventoryTypes';
import { InventoryMovementService } from '@/services/InventoryMovementService';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatDate } from '@/lib/utils';
import { MovementTypeBadge } from './MovementTypeBadge';
import { utils, writeFile } from 'xlsx';

export interface ProductMovementHistoryProps {
  itemId: string;
  itemType: string;
}

const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({ itemId, itemType }) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory-movements', itemId, itemType],
    queryFn: async () => {
      const service = InventoryMovementService.getInstance();
      return service.getMovementsForItem(itemId, itemType as any);
    }
  });
  
  useEffect(() => {
    if (data) {
      setMovements(data);
    }
  }, [data]);
  
  const handleExportToExcel = () => {
    if (!movements.length) return;
    
    const formattedData = movements.map(m => ({
      'العملية': m.movement_type === 'in' ? 'وارد' : m.movement_type === 'out' ? 'صادر' : 'تسوية',
      'الكمية': m.quantity,
      'الرصيد': m.balance_after,
      'التاريخ': formatDate(m.created_at),
      'ملاحظات': m.reason || ''
    }));
    
    const worksheet = utils.json_to_sheet(formattedData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Movements');
    
    writeFile(workbook, `inventory-movements-${itemId}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">حدث خطأ أثناء تحميل البيانات.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!movements || movements.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">لا توجد حركات مخزون لهذا المنتج حتى الآن.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">سجل حركة المخزون</h3>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportToExcel}>
          <Download className="h-4 w-4" />
          <span>تصدير</span>
        </Button>
      </div>
      
      <div className="space-y-3">
        {movements.map((movement) => (
          <Card key={movement.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MovementTypeBadge type={movement.movement_type} />
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(movement.created_at), 'yyyy/MM/dd HH:mm')}
                    </span>
                  </div>
                  
                  {movement.reason && (
                    <p className="text-sm">{movement.reason}</p>
                  )}
                  
                  {movement.user_name && (
                    <p className="text-xs text-muted-foreground">
                      بواسطة: {movement.user_name}
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  <div className={`font-medium ${movement.movement_type === 'in' ? 'text-green-600' : movement.movement_type === 'out' ? 'text-amber-600' : 'text-blue-600'}`}>
                    {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}{Math.abs(movement.quantity)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    الرصيد: {movement.balance_after}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductMovementHistory;
