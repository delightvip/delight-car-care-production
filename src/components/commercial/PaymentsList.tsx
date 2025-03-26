
import React from 'react';
import { format } from 'date-fns';
import { Payment } from '@/services/CommercialTypes';
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

export interface PaymentsListProps {
  payments: Payment[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onEditClick: (payment: Payment) => void;
  onDeleteClick: (payment: Payment) => void;
  onConfirmClick: (payment: Payment) => void;
  onCancelClick: (payment: Payment) => void;
  activeTab: string;
}

const PaymentsList: React.FC<PaymentsListProps> = ({
  payments,
  onEditClick,
  onDeleteClick,
  onConfirmClick,
  onCancelClick,
  activeTab
}) => {
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
          <TableHead className="text-right">الإجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <TableRow key={payment.id}>
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
              <TableCell className="text-right font-medium">
                {payment.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                {payment.payment_status === 'confirmed' ? (
                  <Badge variant="success">مؤكد</Badge>
                ) : payment.payment_status === 'cancelled' ? (
                  <Badge variant="destructive">ملغي</Badge>
                ) : (
                  <Badge variant="outline">مسودة</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  {payment.payment_status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditClick(payment)}
                      >
                        <Edit className="h-4 w-4 ml-1" />
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDeleteClick(payment)}
                      >
                        <Trash className="h-4 w-4 ml-1" />
                        حذف
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConfirmClick(payment)}
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
                      onClick={() => onCancelClick(payment)}
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
            <TableCell colSpan={7} className="text-center py-6">
              لا توجد معاملات مالية مسجلة
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default PaymentsList;
