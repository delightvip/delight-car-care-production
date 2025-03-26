
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { InventoryMovement } from '@/types/inventoryTypes';

interface ProductMovementHistoryProps {
  movements: InventoryMovement[];
}

const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({ movements }) => {
  if (!movements || movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>سجل حركات المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4 text-muted-foreground">لا توجد حركات مخزنية لعرضها.</p>
        </CardContent>
      </Card>
    );
  }

  const getMovementTypeDisplay = (type: string) => {
    switch (type) {
      case 'in':
        return { label: 'إضافة', variant: 'default' as const };
      case 'out':
        return { label: 'صرف', variant: 'destructive' as const };
      case 'adjustment':
        return { label: 'تعديل', variant: 'warning' as const };
      case 'production':
        return { label: 'إنتاج', variant: 'default' as const };
      case 'return':
        return { label: 'مرتجع', variant: 'secondary' as const };
      default:
        return { label: type, variant: 'outline' as const };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل حركات المخزون</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>نوع الحركة</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>السبب</TableHead>
              <TableHead className="text-right">الرصيد بعد</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => {
              const { label, variant } = getMovementTypeDisplay(movement.movement_type);
              return (
                <TableRow key={movement.id}>
                  <TableCell>
                    {format(new Date(movement.created_at), 'yyyy-MM-dd HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>{label}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={movement.movement_type === 'out' ? 'text-red-600' : 'text-green-600'}>
                      {movement.movement_type === 'out' ? '-' : '+'}{Math.abs(movement.quantity)}
                    </span>
                  </TableCell>
                  <TableCell>{movement.reason || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {movement.balance_after}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ProductMovementHistory;
