
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import CommercialService from '@/services/CommercialService';

const paymentFormSchema = z.object({
  payment_type: z.enum(['collection', 'disbursement']),
  amount: z.number().min(0.01, 'يجب أن يكون المبلغ أكبر من صفر'),
  date: z.date(),
  method: z.enum(['cash', 'check', 'bank_transfer', 'other']),
  related_invoice_id: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  partyId: string;
  partyType: 'customer' | 'supplier' | 'other';
  initialData?: Partial<PaymentFormValues>;
  onSubmit: (data: PaymentFormValues) => void;
}

export function PaymentForm({ partyId, partyType, initialData, onSubmit }: PaymentFormProps) {
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payment_type: (initialData?.payment_type as any) || (partyType === 'customer' ? 'collection' : 'disbursement'),
      amount: initialData?.amount || 0,
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      method: initialData?.method || 'cash',
      related_invoice_id: initialData?.related_invoice_id || '',
      notes: initialData?.notes || '',
    },
  });

  // Get invoices for this party
  const { data: invoices } = useQuery({
    queryKey: ['party-invoices', partyId],
    queryFn: () => CommercialService.getInstance().getInvoicesByParty(partyId),
    enabled: !!partyId,
  });

  // Filter unpaid/partially paid invoices only
  const unpaidInvoices = invoices?.filter(
    (invoice) => invoice.status === 'unpaid' || invoice.status === 'partial'
  );

  const handleSubmit = (values: PaymentFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment Type */}
          <FormField
            control={form.control}
            name="payment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الدفعة</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={!!initialData?.payment_type}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الدفعة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="collection">تحصيل</SelectItem>
                    <SelectItem value="disbursement">سداد</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {partyType === 'customer' ? 
                    'التحصيل لاستلام دفعة من العميل، السداد لدفع مبلغ للعميل' : 
                    'السداد لدفع مبلغ للمورد، التحصيل لاستلام دفعة من المورد'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Payment Method */}
          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>طريقة الدفع</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المبلغ</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="أدخل المبلغ" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>تاريخ الدفعة</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ar })
                        ) : (
                          <span>اختر التاريخ</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Related Invoice */}
        <FormField
          control={form.control}
          name="related_invoice_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الفاتورة المرتبطة (اختياري)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفاتورة المرتبطة بالدفعة" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">بدون ربط بفاتورة</SelectItem>
                  {unpaidInvoices?.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {`${invoice.id.substring(0, 8)}... - ${format(new Date(invoice.date), 'yyyy-MM-dd')} - ${invoice.total_amount}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                يمكنك ربط الدفعة بفاتورة محددة أو تركها بدون ارتباط
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ملاحظات</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="أدخل أي ملاحظات إضافية" 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">حفظ الدفعة</Button>
        </div>
      </form>
    </Form>
  );
}
