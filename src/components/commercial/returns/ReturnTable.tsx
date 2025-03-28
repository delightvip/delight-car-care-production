
import React from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { Return } from '@/types/returns';

interface ReturnTableProps {
  returns: Return[];
  onViewDetails: (id: string) => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  isProcessing: boolean;
}

export const ReturnTable: React.FC<ReturnTableProps> = ({
  returns,
  onViewDetails,
  onConfirm,
  onCancel,
  isProcessing
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right w-24">التاريخ</TableHead>
          <TableHead className="text-right">النوع</TableHead>
          <TableHead className="text-right">الطرف</TableHead>
          <TableHead className="text-right">المبلغ</TableHead>
          <TableHead className="text-right">الحالة</TableHead>
          <TableHead className="text-right">الإجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {returns.length > 0 ? (
          returns.map((returnItem) => (
            <TableRow key={returnItem.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewDetails(returnItem.id)}>
              <TableCell className="text-right">
                {format(new Date(returnItem.date), 'yyyy-MM-dd')}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={returnItem.return_type === 'sales_return' ? 'destructive' : 'default'}>
                  {returnItem.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {returnItem.party_name || "غير محدد"}
              </TableCell>
              <TableCell className="text-right font-medium">
                {returnItem.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                {returnItem.payment_status === 'confirmed' ? (
                  <Badge className="bg-green-500">مؤكد</Badge>
                ) : returnItem.payment_status === 'cancelled' ? (
                  <Badge variant="destructive">ملغي</Badge>
                ) : (
                  <Badge variant="outline">مسودة</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2 rtl:space-x-reverse" onClick={(e) => e.stopPropagation()}>
                  {returnItem.payment_status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirm(returnItem.id);
                      }}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 ml-1" />
                      تأكيد
                    </Button>
                  )}
                  {returnItem.payment_status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel(returnItem.id);
                      }}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-4 w-4 ml-1" />
                      إلغاء
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-6">
              لا توجد مرتجعات مسجلة
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
