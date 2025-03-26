
import React from 'react';
import { Return } from '@/services/CommercialTypes';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  FileText, 
  User, 
  Calendar, 
  Tag, 
  ClipboardList 
} from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ReturnDetailsDialogProps {
  return: Return;
}

const ReturnDetailsDialog: React.FC<ReturnDetailsDialogProps> = ({ return: returnData }) => {
  const totalAmount = returnData.items?.reduce((total, item) => {
    return total + (item.quantity * item.unit_price);
  }, 0) || 0;

  // Format the status and return type for display
  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'confirmed':
        return { label: 'مؤكد', variant: 'success' as const };
      case 'cancelled':
        return { label: 'ملغي', variant: 'destructive' as const };
      default:
        return { label: 'مسودة', variant: 'outline' as const };
    }
  };

  const getReturnTypeDisplay = (type: string) => {
    return type === 'sales_return' 
      ? { label: 'مرتجع مبيعات', variant: 'destructive' as const } 
      : { label: 'مرتجع مشتريات', variant: 'default' as const };
  };

  const statusDisplay = getStatusDisplay(returnData.payment_status);
  const typeDisplay = getReturnTypeDisplay(returnData.return_type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{typeDisplay.label}</h3>
          <p className="text-sm text-muted-foreground">
            رقم المرتجع: {returnData.id.substring(0, 8)}...
          </p>
        </div>
        <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">
              <span className="font-medium">التاريخ:</span>{' '}
              {format(new Date(returnData.date), 'yyyy-MM-dd')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">
              <span className="font-medium">الطرف:</span>{' '}
              {returnData.party_name || 'غير محدد'}
            </p>
          </div>

          {returnData.invoice_id && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                <span className="font-medium">الفاتورة المرتبطة:</span>{' '}
                {returnData.invoice_id.substring(0, 8)}...
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">
              <span className="font-medium">إجمالي المبلغ:</span>{' '}
              <span className="font-bold">{returnData.amount.toFixed(2)}</span>
            </p>
          </div>

          {returnData.notes && (
            <div className="flex items-start gap-2 mt-4">
              <ClipboardList className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">ملاحظات:</p>
                <p className="text-sm mt-1">{returnData.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">الأصناف</h3>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الصنف</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">سعر الوحدة</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnData.items && returnData.items.length > 0 ? (
                returnData.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-right font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {(item.quantity * item.unit_price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                    لا توجد أصناف مسجلة لهذا المرتجع
                  </TableCell>
                </TableRow>
              )}
              {returnData.items && returnData.items.length > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">
                    الإجمالي
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {totalAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ReturnDetailsDialog;
