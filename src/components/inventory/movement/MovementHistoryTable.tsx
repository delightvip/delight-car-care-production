
import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InventoryMovement } from '@/types/inventoryTypes';
import { InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';

interface MovementHistoryTableProps {
  movements: InventoryMovement[];
  isLoading?: boolean;
}

const MovementHistoryTable: React.FC<MovementHistoryTableProps> = ({ movements, isLoading = false }) => {
  // تحويل نوع الحركة إلى النص المناسب والألوان
  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'in':
        return <Badge variant="success">وارد</Badge>;
      case 'out':
        return <Badge variant="destructive">صادر</Badge>;
      case 'adjustment':
        return <Badge variant="warning">تعديل</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  // تحويل نوع الصنف إلى اسم مناسب
  const getItemTypeName = (type: string) => {
    switch (type) {
      case 'raw':
        return 'مادة خام';
      case 'semi':
        return 'نصف مصنع';
      case 'packaging':
        return 'مواد تعبئة';
      case 'finished':
        return 'منتج نهائي';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-lg">لا توجد حركات مخزون لعرضها</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>التاريخ</TableHead>
            <TableHead>نوع الحركة</TableHead>
            <TableHead>نوع الصنف</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>الرصيد بعد الحركة</TableHead>
            <TableHead>السبب</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell>
                {movement.created_at && 
                  format(new Date(movement.created_at), 'yyyy/MM/dd - HH:mm', { locale: ar })}
              </TableCell>
              <TableCell>{getMovementBadge(movement.movement_type)}</TableCell>
              <TableCell>{getItemTypeName(movement.item_type)}</TableCell>
              <TableCell dir="ltr" className="text-center">
                {new Intl.NumberFormat('ar-EG').format(Number(movement.quantity))}
              </TableCell>
              <TableCell dir="ltr" className="text-center">
                {new Intl.NumberFormat('ar-EG').format(Number(movement.balance_after))}
              </TableCell>
              <TableCell>
                {movement.reason ? (
                  <div className="flex items-center">
                    <span className="truncate max-w-[200px]">{movement.reason}</span>
                    {movement.reason.length > 20 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[300px] break-words">{movement.reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MovementHistoryTable;
