
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Return } from '@/services/CommercialService';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface ReturnDetailsDialogProps {
  returnData: Return;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (returnId: string) => void;
}

export function ReturnDetailsDialog({ 
  returnData, 
  open, 
  onOpenChange,
  onDelete
}: ReturnDetailsDialogProps) {
  const formatDate = (dateString: string | Date) => {
    try {
      if (typeof dateString === 'string') {
        return format(new Date(dateString), 'yyyy-MM-dd');
      } else {
        return format(dateString, 'yyyy-MM-dd');
      }
    } catch (error) {
      return String(dateString);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(returnData.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>تفاصيل المرتجع</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">رقم المرتجع</span>
              <span className="font-medium">{returnData.id?.substring(0, 8)}...</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">التاريخ</span>
              <span className="font-medium">{formatDate(returnData.date)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">النوع</span>
              <Badge variant={returnData.return_type === 'sales_return' ? 'destructive' : 'default'}>
                {returnData.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
              </Badge>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">المبلغ</span>
              <span className="font-medium">{returnData.amount.toFixed(2)}</span>
            </div>
          </div>
          
          {returnData.invoice_id && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">رقم الفاتورة المرتبطة</span>
              <span className="font-medium">{returnData.invoice_id.substring(0, 8)}...</span>
            </div>
          )}
          
          {returnData.notes && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">ملاحظات</span>
              <span>{returnData.notes}</span>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="ml-2 h-4 w-4" />
              حذف المرتجع
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
