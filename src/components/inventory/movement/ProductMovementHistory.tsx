
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, rpcFunctions } from '@/integrations/supabase/client';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryMovement } from '@/types/inventoryTypes';
import { MovementTypeBadge } from './MovementTypeBadge';

interface ProductMovementHistoryProps {
  itemId: string;
  itemType: string;
}

const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({ itemId, itemType }) => {
  const { data: movements, isLoading, error, refetch } = useQuery({
    queryKey: ['movements', itemType, itemId],
    queryFn: async () => {
      // استخدام وظيفة قاعدة البيانات الجديدة للحصول على حركات المخزون
      const { data, error } = await rpcFunctions.getInventoryMovementsByItem(itemId, itemType);
      
      if (error) throw error;
      // تحويل البيانات صراحةً إلى نوع InventoryMovement المطلوب
      return data as InventoryMovement[];
    }
  });
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, index) => (
          <div key={index} className="flex items-center space-x-4 space-x-reverse rtl:space-x-reverse">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive mb-2">حدث خطأ أثناء تحميل البيانات</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }
  
  if (!movements || movements.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">لا توجد حركات مخزون لهذا العنصر</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">النوع</TableHead>
            <TableHead className="text-right">الكمية</TableHead>
            <TableHead className="text-right">الرصيد بعد</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="text-right">السبب</TableHead>
            <TableHead className="text-right">بواسطة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell>
                <MovementTypeBadge type={movement.movement_type} />
              </TableCell>
              <TableCell>{movement.quantity}</TableCell>
              <TableCell>{movement.balance_after}</TableCell>
              <TableCell>{new Date(movement.created_at).toLocaleString('ar-EG')}</TableCell>
              <TableCell>{movement.reason || '-'}</TableCell>
              <TableCell>{movement.user_name || 'النظام'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductMovementHistory;
