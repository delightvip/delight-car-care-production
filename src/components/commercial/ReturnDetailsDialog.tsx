
import React from 'react';
import { Return, ReturnItem } from '@/services/CommercialService';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { FileText, User, Calendar, Trash2 } from 'lucide-react';
import PaymentStatusBadge from './PaymentStatusBadge';
import TransactionStatusActions from './TransactionStatusActions';

interface ReturnDetailsDialogProps {
  returnData: Return;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => Promise<void>;
  onConfirm?: (id: string) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
}

export const ReturnDetailsDialog: React.FC<ReturnDetailsDialogProps> = ({ 
  returnData, 
  open, 
  onOpenChange, 
  onDelete,
  onConfirm,
  onCancel
}) => {
  const handleDelete = async () => {
    await onDelete(returnData.id);
  };
  
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm(returnData.id);
    }
  };
  
  const handleCancel = async () => {
    if (onCancel) {
      await onCancel(returnData.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {returnData.return_type === 'sales_return' ? 'تفاصيل مرتجع المبيعات' : 'تفاصيل مرتجع المشتريات'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">نوع المرتجع:</span>
                <Badge variant={returnData.return_type === 'sales_return' ? 'destructive' : 'default'}>
                  {returnData.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">الطرف:</span>
                <span>{returnData.party_name || '-'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">التاريخ:</span>
                <span>{format(new Date(returnData.date), 'yyyy-MM-dd')}</span>
              </div>
              
              {returnData.invoice_id && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">الفاتورة المرتبطة:</span>
                  <span>{returnData.invoice_id.substring(0, 8)}...</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">حالة المعاملة:</span>
                <PaymentStatusBadge status={returnData.payment_status as any} />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">المبلغ الإجمالي:</span>
                <span className="font-bold">{returnData.amount.toFixed(2)}</span>
              </div>
              
              {returnData.notes && (
                <div>
                  <span className="font-medium">ملاحظات:</span>
                  <p className="text-sm text-muted-foreground mt-1 bg-secondary p-2 rounded">
                    {returnData.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {returnData.items && returnData.items.length > 0 && (
            <>
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-2">العناصر المرتجعة</h3>
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
                        <TableCell className="text-center">{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {(item.quantity * item.unit_price).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="flex justify-between">
          <div>
            {returnData.payment_status === 'draft' && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                حذف المرتجع
              </Button>
            )}
          </div>
          
          {onConfirm && onCancel && (
            <TransactionStatusActions
              status={returnData.payment_status as any}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              confirmText="هل أنت متأكد من تأكيد هذا المرتجع؟ سيتم تحديث المخزون وحساب الطرف المرتبط به."
              cancelText="هل أنت متأكد من إلغاء هذا المرتجع؟ سيتم إلغاء تأثيره على المخزون وحساب الطرف المرتبط به."
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
