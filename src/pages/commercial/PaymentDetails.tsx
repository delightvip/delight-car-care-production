import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PaymentService from '@/services/commercial/payment/PaymentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';

const PaymentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const paymentService = PaymentService.getInstance();

  const { data: payment, isLoading, error } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentService.getPayments().then(payments => payments.find(p => p.id === id)),
    enabled: !!id,
  });

  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editedAmount, setEditedAmount] = useState(payment?.amount || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleAmountEdit = () => setIsEditingAmount(true);
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditedAmount(Number(e.target.value));
  const handleAmountSave = async () => {
    setIsSaving(true);
    try {
      // تحديث المبلغ في قاعدة البيانات
      await paymentService.updatePayment(payment.id, {
        party_id: payment.party_id,
        date: payment.date,
        amount: editedAmount,
        payment_type: payment.payment_type,
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status,
        notes: payment.notes || '',
      });
      setIsEditingAmount(false);
      window.location.reload();
    } catch (err) {
      alert('حدث خطأ أثناء حفظ المبلغ الجديد');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-40 w-full mt-8" />;
  }

  if (error || !payment) {
    return (
      <div className="text-center text-red-600 mt-8">
        حدث خطأ أثناء تحميل تفاصيل المعاملة أو لم يتم العثور عليها
        <button className="block mx-auto mt-4 text-blue-600 underline" onClick={() => navigate(-1)}>
          العودة
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>
            تفاصيل أمر الدفع #{payment.id}
          </CardTitle>
        </CardHeader>
        {/* DialogTitle and DialogDescription for accessibility compliance */}
        <DialogTitle className="sr-only">تفاصيل أمر الدفع #{payment.id}</DialogTitle>
        <DialogDescription className="sr-only">
          تفاصيل كاملة حول أمر الدفع، تشمل التاريخ، الطرف، النوع، الطريقة، المبلغ، الحالة، والملاحظات.
        </DialogDescription>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="font-bold">التاريخ:</div>
            <div>{format(new Date(payment.date), 'yyyy-MM-dd')}</div>
            <div className="font-bold">الطرف:</div>
            <div>{payment.party_name}</div>
            <div className="font-bold">النوع:</div>
            <div>
              <Badge variant={payment.payment_type === 'collection' ? 'success' : 'default'}>
                {payment.payment_type === 'collection' ? 'تحصيل' : 'صرف'}
              </Badge>
            </div>
            <div className="font-bold">الطريقة:</div>
            <div>
              {payment.method === 'cash' && 'نقدي'}
              {payment.method === 'check' && 'شيك'}
              {payment.method === 'bank_transfer' && 'تحويل بنكي'}
              {payment.method === 'other' && 'أخرى'}
            </div>
            <div className="font-bold">المبلغ:</div>
            <div className="flex items-center gap-2">
              {payment.payment_status === 'draft' && isEditingAmount ? (
                <>
                  <Input
                    type="number"
                    value={editedAmount}
                    onChange={handleAmountChange}
                    min={0}
                    className="w-32"
                    disabled={isSaving}
                  />
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                    onClick={handleAmountSave}
                    disabled={isSaving}
                  >
                    حفظ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-3 py-1 rounded border-gray-300"
                    onClick={() => { setIsEditingAmount(false); setEditedAmount(payment.amount); }}
                    disabled={isSaving}
                  >
                    إلغاء
                  </Button>
                </>
              ) : (
                <>
                  {Number(payment.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {payment.payment_status === 'draft' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2 text-xs text-blue-600 hover:bg-blue-50"
                      onClick={handleAmountEdit}
                    >
                      تعديل
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="font-bold">الحالة:</div>
            <div>
              {payment.payment_status === 'confirmed' ? (
                <Badge variant="success">مؤكد</Badge>
              ) : payment.payment_status === 'cancelled' ? (
                <Badge variant="destructive">ملغي</Badge>
              ) : (
                <Badge variant="outline">مسودة</Badge>
              )}
            </div>
            <div className="font-bold">الملاحظات:</div>
            <div>{payment.notes || '-'}</div>
          </div>

          {/* زر التعديل يظهر فقط إذا كانت حالة أمر الدفع 'draft' */}
          {payment.payment_status === 'draft' && (
            <Button
              className="mt-8 block mx-auto bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded shadow-sm font-bold"
              onClick={() => navigate(`/commercial/payments/edit/${payment.id}`)}
              size="lg"
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3h3z" /></svg>
                تعديل المعاملة
              </span>
            </Button>
          )}

          <Button
            className="mt-4 block mx-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow-sm font-bold"
            onClick={() => navigate(-1)}
            size="lg"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              العودة
            </span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentDetails;
