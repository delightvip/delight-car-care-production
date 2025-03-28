
import React, { useState, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Payment } from '@/services/commercial/CommercialTypes';
import { Party } from '@/services/PartyService';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';

const paymentFormSchema = z.object({
  payment_type: z.enum(['collection', 'disbursement'], {
    required_error: 'الرجاء اختيار نوع المعاملة',
  }),
  party_id: z.string({
    required_error: 'الرجاء اختيار الطرف التجاري',
  }),
  date: z.date({
    required_error: 'الرجاء تحديد تاريخ المعاملة',
  }),
  amount: z.coerce.number({
    required_error: 'الرجاء إدخال المبلغ',
    invalid_type_error: 'الرجاء إدخال مبلغ صحيح',
  }).positive({
    message: 'يجب أن يكون المبلغ أكبر من صفر',
  }),
  method: z.enum(['cash', 'check', 'bank_transfer', 'other'], {
    required_error: 'الرجاء اختيار طريقة الدفع',
  }),
  related_invoice_id: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface InvoiceForPayment {
  id: string;
  invoice_type: string;
  party_id: string;
  party_name: string;
  total_amount: number;
  date: string;
}

interface PaymentFormProps {
  onSubmit: (data: Omit<Payment, 'id' | 'created_at'>) => void;
  parties: Party[];
  initialData?: Partial<Payment>;
  isEditing?: boolean;
  invoices?: InvoiceForPayment[];
}

export function PaymentForm({ 
  onSubmit, 
  parties, 
  initialData,
  isEditing = false,
  invoices = []
}: PaymentFormProps) {
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>(initialData?.payment_type || 'collection');
  
  // تصفية الأطراف حسب نوع المعاملة (تحصيل من العملاء، صرف للموردين)
  const filteredParties = selectedPaymentType === 'collection' 
    ? parties.filter(party => party.type === 'customer')
    : parties.filter(party => party.type === 'supplier');
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payment_type: (initialData?.payment_type as any) || 'collection',
      party_id: initialData?.party_id || '',
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      amount: initialData?.amount || 0,
      method: (initialData?.method as any) || 'cash',
      related_invoice_id: initialData?.related_invoice_id || '',
      notes: initialData?.notes || '',
    },
  });

  const handlePaymentTypeChange = useCallback((value: string) => {
    setSelectedPaymentType(value);
    form.setValue('party_id', '');
    form.setValue('related_invoice_id', '');
  }, [form]);
  
  const selectedPartyId = form.watch('party_id');
  
  // تصفية الفواتير المرتبطة بالطرف المحدد - تم تحسين الأداء هنا
  const relevantInvoices = React.useMemo(() => {
    if (!selectedPartyId) return [];
    
    return invoices.filter(invoice => {
      if (selectedPaymentType === 'collection') {
        return invoice.party_id === selectedPartyId && invoice.invoice_type === 'sale';
      } else {
        return invoice.party_id === selectedPartyId && invoice.invoice_type === 'purchase';
      }
    });
  }, [selectedPartyId, invoices, selectedPaymentType]);

  const handleSubmit = useCallback((data: PaymentFormValues) => {
    const formattedDate = format(data.date, 'yyyy-MM-dd');
    
    onSubmit({
      payment_type: data.payment_type,
      party_id: data.party_id,
      date: formattedDate,
      amount: data.amount,
      method: data.method,
      related_invoice_id: data.related_invoice_id || undefined,
      payment_status: 'draft',
      notes: data.notes
    });
  }, [onSubmit]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          {isEditing ? 'تعديل بيانات المعاملة' : 'تسجيل معاملة جديدة'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المعاملة</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        handlePaymentTypeChange(value);
                      }} 
                      defaultValue={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع المعاملة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="collection">تحصيل (استلام دفعة)</SelectItem>
                        <SelectItem value="disbursement">دفع (تسديد دفعة)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="party_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedPaymentType === 'collection' ? 'العميل' : 'المورد'}
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`اختر ${selectedPaymentType === 'collection' ? 'العميل' : 'المورد'}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredParties.map(party => (
                          <SelectItem key={party.id} value={party.id}>
                            {party.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>التاريخ</FormLabel>
                    <DatePicker
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={isEditing}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="أدخل المبلغ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة الدفع</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر طريقة الدفع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="check">شيك</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="other">طريقة أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {selectedPartyId && relevantInvoices.length > 0 && (
                <FormField
                  control={form.control}
                  name="related_invoice_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفاتورة المرتبطة (اختياري)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الفاتورة المرتبطة (اختياري)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="no_invoice">بدون فاتورة</SelectItem>
                          {relevantInvoices.map(invoice => (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              {format(new Date(invoice.date), 'yyyy-MM-dd')} - {invoice.total_amount.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="ملاحظات إضافية..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <CardFooter className="px-0 pt-6 flex justify-between">
              <Button variant="outline" type="button" onClick={() => form.reset()}>
                إعادة تعيين
              </Button>
              <Button type="submit">
                {isEditing ? 'تحديث المعاملة' : 'تسجيل المعاملة'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
