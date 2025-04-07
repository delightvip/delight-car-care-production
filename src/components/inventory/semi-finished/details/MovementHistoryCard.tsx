
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Loader, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MovementHistoryCardProps {
  itemId: string;
  itemType: string;
}

const MovementHistoryCard: React.FC<MovementHistoryCardProps> = ({ itemId, itemType }) => {
  const { data: movements = [], isLoading, error } = useQuery({
    queryKey: ['inventoryMovements', itemId, itemType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inventory_movements_by_item', {
        p_item_id: itemId,
        p_item_type: itemType
      });
      
      if (error) throw error;
      return data || [];
    }
  });
  
  const getMovementBadgeColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'bg-green-500';
      case 'out':
        return 'bg-red-500';
      case 'adjustment':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const getMovementTypeInArabic = (type: string) => {
    switch (type) {
      case 'in':
        return 'وارد';
      case 'out':
        return 'صادر';
      case 'adjustment':
        return 'تعديل';
      default:
        return type;
    }
  };
  
  if (isLoading) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader className="h-8 w-8 animate-spin" />
          <p className="mt-2">جاري تحميل حركة المخزون...</p>
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>حركة المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription>
              حدث خطأ أثناء تحميل بيانات حركة المخزون. يرجى المحاولة مرة أخرى.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>حركة المخزون</CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length > 0 ? (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>نوع الحركة</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>الرصيد بعد</TableHead>
                  <TableHead>السبب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {format(new Date(movement.created_at), 'Pp', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getMovementBadgeColor(movement.movement_type)}>
                        {getMovementTypeInArabic(movement.movement_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {Math.abs(movement.quantity)}
                    </TableCell>
                    <TableCell>{movement.balance_after}</TableCell>
                    <TableCell>{movement.reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            لا توجد حركات مخزنية لهذا المنتج حتى الآن
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MovementHistoryCard;
