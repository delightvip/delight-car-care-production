import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { InventoryMovement } from '@/types/inventoryTypes';

interface ProductMovementHistoryProps {
  itemId: string;
  itemType: string;
}

const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({ itemId, itemType }) => {
  const { data: movements, isLoading, error, refetch } = useQuery({
    queryKey: ['movements', itemType, itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          item_id,
          item_type,
          movement_type,
          quantity,
          balance_after,
          reason,
          created_at,
          users (name)
        `)
        .eq('item_id', itemId)
        .eq('item_type', itemType)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InventoryMovement[];
    }
  });
  
  const getMovementTypeDetails = (type: string) => {
    switch (type) {
      case 'in':
        return {
          label: 'وارد',
          icon: <ArrowUp className="h-4 w-4 text-success" />,
          variant: 'outline',
          className: 'border-success text-success'
        };
      case 'out':
        return {
          label: 'صادر',
          icon: <ArrowDown className="h-4 w-4 text-destructive" />,
          variant: 'outline',
          className: 'border-destructive text-destructive'
        };
      case 'adjustment':
        return {
          label: 'تسوية',
          icon: <RefreshCw className="h-4 w-4 text-warning" />,
          variant: 'outline',
          className: 'border-warning text-warning'
        };
      default:
        return {
          label: type,
          icon: null,
          variant: 'outline',
          className: ''
        };
    }
  };
  
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
          {movements.map((movement) => {
            const typeDetails = getMovementTypeDetails(movement.movement_type);
            
            return (
              <TableRow key={movement.id}>
                <TableCell>
                  <Badge variant="outline" className={typeDetails.className}>
                    <span className="flex items-center gap-1">
                      {typeDetails.icon}
                      {typeDetails.label}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell>{movement.quantity}</TableCell>
                <TableCell>{movement.balance_after}</TableCell>
                <TableCell>{new Date(movement.created_at).toLocaleString('ar-EG')}</TableCell>
                <TableCell>{movement.reason || '-'}</TableCell>
                <TableCell>{movement.users?.name || 'النظام'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductMovementHistory;
