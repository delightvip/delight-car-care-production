
import React from 'react';
import { format } from 'date-fns';
import { Return } from '@/types/returns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, User, Calendar, CreditCard, Check, X, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ReturnDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnData: Return;
  onConfirm?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  onDelete?: () => void;
  isProcessing?: boolean;
}

export function ReturnDetailsDialog({
  open,
  onOpenChange,
  returnData,
  onConfirm,
  onCancel,
  onDelete,
  isProcessing = false,
}: ReturnDetailsDialogProps) {
  if (!returnData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>تفاصيل المرتجع</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">نوع المرتجع:</span>
            <Badge variant={returnData.return_type === 'sales_return' ? 'destructive' : 'default'}>
              {returnData.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
            </Badge>
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
            <span className="font-bold">{returnData.amount.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
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
        
        {returnData.notes && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">ملاحظات:</h4>
            <p className="text-sm text-muted-foreground bg-secondary p-3 rounded">
              {returnData.notes}
            </p>
          </div>
        )}
        
        <Separator className="my-4" />
        
        {returnData.items && returnData.items.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">الأصناف:</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>الصنف</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead className="text-center">السعر</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnData.items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center">{item.unit_price.toFixed(2)}</TableCell>
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
        
        <div className="flex justify-between mt-6">
          {returnData.payment_status === 'draft' && (
            <>
              {onDelete && (
                <Button
                  variant="outline"
                  onClick={onDelete}
                  disabled={isProcessing}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  حذف
                </Button>
              )}
              
              {onConfirm && (
                <Button
                  onClick={onConfirm}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  تأكيد المرتجع
                </Button>
              )}
            </>
          )}
          
          {returnData.payment_status === 'confirmed' && onCancel && (
            <Button
              variant="destructive"
              onClick={onCancel}
              disabled={isProcessing}
              className="ml-auto"
            >
              <X className="mr-2 h-4 w-4" />
              إلغاء المرتجع
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
