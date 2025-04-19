import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Payment } from '@/services/commercial/CommercialTypes';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, FileText, Edit2 } from 'lucide-react';

interface PaymentDetailsDialogProps {
  payment: Payment;
  onClose: () => void;
}

const PaymentDetailsDialog: React.FC<PaymentDetailsDialogProps> = ({ payment, onClose }) => {
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editedAmount, setEditedAmount] = useState(payment.amount);
  const [isSaving, setIsSaving] = useState(false);

  const handleAmountEdit = () => setIsEditingAmount(true);
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditedAmount(Number(e.target.value));
  const handleAmountSave = async () => {
    setIsSaving(true);
    try {
      // هنا يمكنك استدعاء خدمة التحديث إذا أردت
      setIsEditingAmount(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg w-full p-0 rounded-lg overflow-hidden bg-background">
      <DialogHeader className="bg-primary/5 px-6 py-4 border-b">
        <DialogTitle asChild>
          <span className="sr-only">تفاصيل أمر الدفع #{payment.id}</span>
        </DialogTitle>
        <DialogDescription asChild>
          <span className="sr-only">مراجعة جميع تفاصيل أمر الدفع والتأكد من صحتها</span>
        </DialogDescription>
        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-primary">
          <FileText className="w-6 h-6 text-primary" />
          تفاصيل أمر الدفع #{payment.id}
        </DialogTitle>
        <DialogDescription className="text-base text-muted-foreground mt-1">
          مراجعة جميع تفاصيل أمر الدفع والتأكد من صحتها.
        </DialogDescription>
      </DialogHeader>
      <div className="px-6 py-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-sm text-muted-foreground font-medium">التاريخ</div>
          <div className="text-end font-semibold">{format(new Date(payment.date), 'yyyy-MM-dd')}</div>
          <div className="text-sm text-muted-foreground font-medium">الطرف</div>
          <div className="text-end font-semibold">{payment.party_name}</div>
          <div className="text-sm text-muted-foreground font-medium">النوع</div>
          <div className="text-end">
            <Badge variant={payment.payment_type === 'collection' ? 'success' : 'default'}>
              {payment.payment_type === 'collection' ? 'تحصيل' : 'صرف'}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground font-medium">الطريقة</div>
          <div className="text-end">
            {payment.method === 'cash' && 'نقدي'}
            {payment.method === 'check' && 'شيك'}
            {payment.method === 'bank_transfer' && 'تحويل بنكي'}
            {payment.method === 'other' && 'أخرى'}
          </div>
          <div className="text-sm text-muted-foreground font-medium">المبلغ</div>
          <div className="text-end flex items-center gap-2">
            {payment.payment_status === 'draft' && isEditingAmount ? (
              <>
                <Input
                  type="number"
                  value={editedAmount}
                  onChange={handleAmountChange}
                  min={0}
                  className="w-28 text-end"
                  disabled={isSaving}
                />
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                  onClick={handleAmountSave}
                  disabled={isSaving}
                >
                  حفظ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2 py-1 rounded border-gray-300"
                  onClick={() => { setIsEditingAmount(false); setEditedAmount(payment.amount); }}
                  disabled={isSaving}
                >
                  إلغاء
                </Button>
              </>
            ) : (
              <>
                <span className="font-bold text-lg">
                  {Number(payment.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {payment.payment_status === 'draft' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-blue-600 hover:bg-blue-50"
                    onClick={handleAmountEdit}
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="sr-only">تعديل</span>
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground font-medium">الحالة</div>
          <div className="text-end">
            {payment.payment_status === 'confirmed' ? (
              <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-4 h-4" />مؤكد</Badge>
            ) : payment.payment_status === 'cancelled' ? (
              <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-4 h-4" />ملغي</Badge>
            ) : (
              <Badge variant="outline">مسودة</Badge>
            )}
          </div>
        </div>
        <Separator className="my-4" />
        <div className="mb-1 text-sm text-muted-foreground font-medium">الملاحظات</div>
        <div className="mb-4 text-end min-h-[24px]">{payment.notes || <span className="text-gray-400">لا توجد ملاحظات</span>}</div>
        <Button
          className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded shadow-sm font-bold"
          onClick={onClose}
          size="lg"
        >
          <span className="flex items-center gap-2 justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            إغلاق
          </span>
        </Button>
      </div>
    </DialogContent>
  );
};

export default PaymentDetailsDialog;
