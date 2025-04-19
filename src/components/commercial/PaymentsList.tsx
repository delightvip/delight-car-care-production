import React from 'react';
import { format } from 'date-fns';
import { Payment } from '@/services/commercial/CommercialTypes';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash, CheckCircle, XCircle } from 'lucide-react';
import './PaymentsList.css';

export interface PaymentsListProps {
  payments: Payment[];
  onEditClick: (payment: Payment) => void;
  onDeleteClick: (payment: Payment) => void;
  onConfirmClick: (payment: Payment) => void;
  onCancelClick: (payment: Payment) => void;
  activeTab: string;
  onRowClick?: (payment: Payment, event?: React.MouseEvent) => void;
}

const PaymentsList: React.FC<PaymentsListProps> = ({
  payments,
  onEditClick,
  onDeleteClick,
  onConfirmClick,
  onCancelClick,
  activeTab,
  onRowClick
}) => {
  // لا يوجد أي مربع بحث أو حقل بحث عن المبلغ في هذا الملف.
  // إذا تمت إضافة مربع بحث في المستقبل، يرجى إزالته من هنا.

  // Filter payments based on the active tab
  const filteredPayments = payments.filter(payment => {
    if (activeTab === 'all') return true;
    return payment.payment_type === activeTab;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right w-32">التاريخ</TableHead>
          <TableHead className="text-right">الطرف</TableHead>
          <TableHead className="text-right">النوع</TableHead>
          <TableHead className="text-right">الطريقة</TableHead>
          <TableHead className="text-right">المبلغ</TableHead>
          <TableHead className="text-right">الحالة</TableHead>
          <TableHead className="text-right">الملاحظات</TableHead>
          <TableHead className="text-right">الإجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment, idx) => (
            <TableRow
              key={payment.id}
              className={`zebra-row payment-row cursor-pointer`}
              onClick={event => onRowClick && onRowClick(payment, event)}
            >
              <TableCell className="text-right">
                {format(new Date(payment.date), 'yyyy-MM-dd')}
              </TableCell>
              <TableCell className="text-right font-medium">
                {payment.party_name}
              </TableCell>
              <TableCell className="text-right">
                <Badge 
                  variant={payment.payment_type === 'collection' ? 'success' : 'default'}
                >
                  {payment.payment_type === 'collection' ? 'تحصيل' : 'صرف'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {payment.method === 'cash' && 'نقدي'}
                {payment.method === 'check' && 'شيك'}
                {payment.method === 'bank_transfer' && 'تحويل بنكي'}
                {payment.method === 'other' && 'أخرى'}
              </TableCell>
              <TableCell className="text-right payment-amount">
                {typeof payment.amount === 'number'
                  ? Number(payment.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '0.00'}
              </TableCell>
              <TableCell className={`text-right ${payment.payment_status === 'confirmed' ? 'payment-status-confirmed' : payment.payment_status === 'cancelled' ? 'payment-status-cancelled' : 'payment-status-draft'}`}>
                {payment.payment_status === 'confirmed' ? (
                  <Badge variant="success">مؤكد</Badge>
                ) : payment.payment_status === 'cancelled' ? (
                  <Badge variant="destructive">ملغي</Badge>
                ) : (
                  <Badge variant="outline">مسودة</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {payment.notes ? payment.notes : '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  {payment.payment_status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="action-btn"
                        onClick={e => { e.stopPropagation(); onEditClick(payment); }}
                      >
                        <Edit className="h-4 w-4 ml-1" />
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="action-btn"
                        onClick={e => { e.stopPropagation(); onDeleteClick(payment); }}
                      >
                        <Trash className="h-4 w-4 ml-1" />
                        حذف
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="action-btn"
                        onClick={e => { e.stopPropagation(); onConfirmClick(payment); }}
                      >
                        <CheckCircle className="h-4 w-4 ml-1" />
                        تأكيد
                      </Button>
                    </>
                  )}
                  {payment.payment_status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="action-btn"
                      onClick={e => { e.stopPropagation(); onCancelClick(payment); }}
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
            <TableCell colSpan={8} className="text-center py-6">
              لا توجد معاملات مالية مسجلة
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default PaymentsList;
