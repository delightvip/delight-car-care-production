import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Return } from '@/types/returns';
import { ReturnFormValues, returnFormSchema } from '@/types/returns';
import CommercialService from '@/services/CommercialService';
import ReturnInvoiceForm from './ReturnInvoiceForm';

interface ReturnFormProps {
  initialData?: Return;
  onSubmit: (data: Omit<Return, 'id' | 'created_at'>) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function ReturnForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  onCancel
}: ReturnFormProps) {
  const commercialService = CommercialService.getInstance();
  const [returnType, setReturnType] = useState<string>(initialData?.return_type || 'sales_return');
  
  // توفير القيم الافتراضية للنموذج
  const defaultValues: Partial<ReturnFormValues> = {
    return_type: initialData?.return_type || 'sales_return',
    invoice_id: initialData?.invoice_id,
    party_id: initialData?.party_id,
    date: initialData?.date ? new Date(initialData.date) : new Date(),
    notes: initialData?.notes || '',
    amount: initialData?.amount || 0,
    items: initialData?.items?.map(item => ({
      item_id: item.item_id,
      item_type: item.item_type,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      selected: true,
      max_quantity: item.quantity,
      total: item.total
    })) || []
  };

  // إعداد نموذج التحقق
  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues
  });

  // إذا تغير نوع المرتجع، نقوم بتغييره في الحالة
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'return_type') {
        setReturnType(value.return_type || 'sales_return');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // استعلام الفواتير
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => commercialService.getInvoices(),
  });

  // تصفية الفواتير حسب نوع المرتجع
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter(inv => 
      returnType === 'sales_return' 
        ? inv.invoice_type === 'sale' 
        : inv.invoice_type === 'purchase'
    );
  }, [invoices, returnType]);

  // معالجة تقديم النموذج
  const handleSubmitForm = (values: ReturnFormValues) => {
    const selectedItems = values.items.filter(item => item.selected && item.quantity > 0);
    
    if (selectedItems.length === 0) {
      toast.error('يجب اختيار صنف واحد على الأقل وتحديد كمية له');
      return;
    }
    
    const returnData: Omit<Return, 'id' | 'created_at'> = {
      return_type: values.return_type,
      invoice_id: values.invoice_id,
      party_id: values.party_id,
      date: format(values.date, 'yyyy-MM-dd'),
      amount: values.amount || selectedItems.reduce((sum, item) => sum + (item.selected ? item.quantity * item.unit_price : 0), 0),
      notes: values.notes,
      payment_status: 'draft',
      items: selectedItems.map(item => ({
        item_id: item.item_id,
        item_type: item.item_type,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }))
    };
    
    onSubmit(returnData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {initialData ? 'تعديل مرتجع' : 'إضافة مرتجع جديد'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReturnInvoiceForm 
                form={form}
                isLoadingInvoices={isLoadingInvoices}
                filteredInvoices={filteredInvoices}
              />
            </div>
            <CardFooter className="px-0 pt-6 flex flex-col md:flex-row md:justify-between gap-2">
              <Button 
                variant="outline" 
                type="button"
                onClick={onCancel}
              >
                إلغاء
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'تحديث المرتجع' : 'حفظ المرتجع'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ReturnForm;
