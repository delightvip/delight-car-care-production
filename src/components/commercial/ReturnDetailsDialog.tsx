
import { Return, ReturnItem } from '@/services/CommercialTypes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import TransactionStatusActions from './TransactionStatusActions';
import { FileText, User, Calendar, CreditCard } from 'lucide-react';

interface ReturnDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnData: Return;
  onDelete?: () => void;
}

export function ReturnDetailsDialog({
  open,
  onOpenChange,
  returnData,
  onDelete,
}: ReturnDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>تفاصيل المرتجع</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">نوع المرتجع:</span>
              <span>
                {returnData.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">الطرف:</span>
              <span>{returnData.party_name || 'غير محدد'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">التاريخ:</span>
              <span>{format(new Date(returnData.date), 'yyyy-MM-dd')}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">المبلغ:</span>
              <span>{returnData.amount}</span>
            </div>
            
            {returnData.payment_status && (
              <div className="flex items-center gap-2">
                <span className="font-medium">حالة المعاملة:</span>
                <Badge
                  className={
                    returnData.payment_status === 'confirmed'
                      ? 'bg-green-500'
                      : returnData.payment_status === 'cancelled'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }
                >
                  {returnData.payment_status === 'confirmed'
                    ? 'مؤكد'
                    : returnData.payment_status === 'cancelled'
                    ? 'ملغي'
                    : 'مسودة'}
                </Badge>
              </div>
            )}
          </div>
          
          {returnData.notes && (
            <div className="space-y-2">
              <h4 className="font-medium">ملاحظات:</h4>
              <p className="text-sm text-muted-foreground bg-secondary p-3 rounded">
                {returnData.notes}
              </p>
            </div>
          )}
          
          {returnData.items && returnData.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">الأصناف:</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead className="text-center">الكمية</TableHead>
                    <TableHead className="text-center">السعر</TableHead>
                    <TableHead className="text-right">المجموع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnData.items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">{item.unit_price}</TableCell>
                      <TableCell className="text-right">
                        {(item.quantity * item.unit_price).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">
                      المجموع
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {returnData.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          
          {returnData.payment_status && onDelete && (
            <TransactionStatusActions 
              status={returnData.payment_status}
              onDelete={onDelete}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
