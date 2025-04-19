import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CommercialService, { Invoice } from '@/services/CommercialService';
import PartyService from '@/services/PartyService';
import InventoryService from '@/services/InventoryService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoiceForm } from '@/components/commercial/InvoiceForm';
import { toast } from 'sonner';

const InvoiceEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // جلب بيانات الفاتورة
  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => CommercialService.getInstance().getInvoiceById(id!),
    enabled: !!id,
  });

  // جلب بيانات الأطراف
  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => PartyService.getInstance().getParties(),
  });

  // جلب بيانات المخزون
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => InventoryService.getInstance().getFinishedProducts(),
  });

  // معالجة مشكلة updateInvoice
  const handleUpdateInvoice = async (invoiceData: Omit<Invoice, 'id' | 'created_at'>) => {
    if (!invoice) return;
    try {
      // مؤقتاً: إظهار رسالة فقط لأن الدالة غير موجودة
      toast.info('تحديث الفاتورة غير متاح حالياً.');
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الفاتورة');
    }
  };

  if (isLoadingInvoice) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (invoiceError || !invoice) {
    return <div className="text-destructive">حدث خطأ أثناء تحميل الفاتورة</div>;
  }

  // السماح بالتعديل فقط إذا كانت الفاتورة في حالة مسودة
  const isDraft = invoice?.payment_status === 'draft';

  if (!isDraft) {
    return (
      <Card className="max-w-2xl mx-auto mt-10">
        <CardHeader>
          <CardTitle>تعديل الفاتورة #{invoice?.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive text-lg py-8">
            لا يمكن تعديل هذه الفاتورة لأنها مؤكدة أو ملغاة.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>تعديل الفاتورة #{invoice.id}</CardTitle>
      </CardHeader>
      <CardContent>
        {parties && inventoryItems && (
          <InvoiceForm
            onSubmit={handleUpdateInvoice}
            parties={parties}
            items={inventoryItems.map(item => ({
              ...item,
              type: 'finished_products', // مؤقتاً حتى تعود دالة الدمج القديمة
            }))}
            initialData={invoice}
            isEditing={true}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceEdit;
