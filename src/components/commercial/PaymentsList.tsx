
import React from 'react';
import { Payment } from '@/services/CommercialTypes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Edit, Trash2 } from 'lucide-react';

interface PaymentsListProps {
  payments: Payment[];
  onConfirm: (paymentId: string) => void;
  onCancel: (paymentId: string) => void;
  onEdit: (payment: Payment) => void;
  onDelete: (paymentId: string) => void;
}

const PaymentsList: React.FC<PaymentsListProps> = ({ 
  payments, 
  onConfirm, 
  onCancel, 
  onEdit, 
  onDelete 
}) => {
  // تحديد لون البادج حسب حالة الدفعة
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">تم التأكيد</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">ملغاة</Badge>;
      case 'draft':
        return <Badge variant="outline">مسودة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // تحديد لون البادج حسب نوع الدفعة
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'collection':
        return <Badge variant="secondary">تحصيل</Badge>;
      case 'disbursement':
        return <Badge variant="destructive">دفع</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // تنسيق طريقة الدفع
  const formatMethod = (method: string) => {
    switch (method) {
      case 'cash':
        return 'نقدي';
      case 'check':
        return 'شيك';
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'other':
        return 'طريقة أخرى';
      default:
        return method;
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right font-bold">التاريخ</TableHead>
            <TableHead className="text-right font-bold">نوع المعاملة</TableHead>
            <TableHead className="text-right font-bold">الطرف</TableHead>
            <TableHead className="text-right font-bold">المبلغ</TableHead>
            <TableHead className="text-right font-bold">طريقة الدفع</TableHead>
            <TableHead className="text-right font-bold">الحالة</TableHead>
            <TableHead className="text-right font-bold">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length > 0 ? (
            payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="text-right">
                  {format(new Date(payment.date), 'yyyy-MM-dd')}
                </TableCell>
                <TableCell className="text-right">
                  {getTypeBadge(payment.payment_type)}
                </TableCell>
                <TableCell className="text-right">
                  {payment.party_name || "غير محدد"}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {payment.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {formatMethod(payment.method)}
                </TableCell>
                <TableCell className="text-right">
                  {getStatusBadge(payment.payment_status)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex space-x-2 justify-end items-center">
                    {payment.payment_status === 'draft' && (
                      <>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => onConfirm(payment.id)}
                          title="تأكيد"
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => onEdit(payment)}
                          title="تعديل"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => onDelete(payment.id)}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                    {payment.payment_status === 'confirmed' && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onCancel(payment.id)}
                        title="إلغاء"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4">
                لا توجد معاملات مالية مسجلة
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PaymentsList;
