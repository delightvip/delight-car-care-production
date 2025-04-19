import React, { useState, useCallback, useEffect } from 'react';
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
  party_name?: string;
  total_amount: number;
  date: string;
  status: 'paid' | 'partial' | 'unpaid';
  remaining_amount?: number;
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
  const [showSummary, setShowSummary] = useState(false);
  
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

  useEffect(() => {
    // تعبئة نوع المعاملة والعميل تلقائياً إذا توفرت initialData
    if (initialData) {
      if (initialData.payment_type) {
        setSelectedPaymentType(initialData.payment_type);
        form.setValue('payment_type', initialData.payment_type);
      }
      if (initialData.party_id) {
        form.setValue('party_id', initialData.party_id);
      }
      // تعبئة الفاتورة المرتبطة تلقائياً إذا توفرت
      if (initialData.related_invoice_id) {
        form.setValue('related_invoice_id', initialData.related_invoice_id);
      }
    }
  }, [initialData, form]);

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
      // فلترة الفواتير حسب نوع المعاملة (تحصيل من العملاء، صرف للموردين)
      if (selectedPaymentType === 'collection') {
        return invoice.party_id === selectedPartyId && 
               invoice.invoice_type === 'sale' && 
               (invoice.status === 'unpaid' || invoice.status === 'partial');
      } else {
        return invoice.party_id === selectedPartyId && 
               invoice.invoice_type === 'purchase' && 
               (invoice.status === 'unpaid' || invoice.status === 'partial');
      }
    });
  }, [selectedPartyId, invoices, selectedPaymentType]);
  
  // تحويل المعرفات إلى أسماء قابلة للقراءة
  const getPartyName = useCallback((partyId: string) => {
    const party = parties.find(p => p.id === partyId);
    return party?.name || partyId;
  }, [parties]);
  
  const getPaymentMethodText = useCallback((method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'check': return 'شيك';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'other': return 'طريقة أخرى';
      default: return method;
    }
  }, []);
  
  const getInvoiceReference = useCallback((invoiceId: string) => {
    if (invoiceId === 'no_invoice' || !invoiceId) return 'بدون ربط بفاتورة';
    const invoice = relevantInvoices.find(inv => inv.id === invoiceId);
    return invoice 
      ? `فاتورة: ${invoice.id.substring(0, 8)}... (${format(new Date(invoice.date), 'yyyy-MM-dd')})`
      : invoiceId;
  }, [relevantInvoices]);

  const handleSubmit = useCallback((data: PaymentFormValues) => {
    if (!showSummary) {
      setShowSummary(true);
      return;
    }
    
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
    
    setShowSummary(false);
  }, [onSubmit, showSummary]);

  // إضافة رسالة تأكيد عند اختيار فاتورة
  const [confirmationMessage, setConfirmationMessage] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  // دالة لتعبئة المبلغ تلقائياً عند اختيار فاتورة
  const handleInvoiceSelection = useCallback((invoiceId: string) => {
    form.setValue('related_invoice_id', invoiceId);
    
    if (invoiceId && invoiceId !== 'no_invoice') {
      const selectedInvoice = relevantInvoices.find(inv => inv.id === invoiceId);
      if (selectedInvoice) {
        // استخدام المبلغ المتبقي إذا كان متاحاً، وإلا استخدام المبلغ الإجمالي
        const amountToSet = selectedInvoice.remaining_amount || selectedInvoice.total_amount;
        form.setValue('amount', amountToSet);
        
        // إظهار رسالة تأكيد
        setConfirmationMessage({
          message: `تم تحديد الفاتورة وتعبئة المبلغ تلقائياً (${amountToSet.toFixed(2)} ج.م)`,
          type: 'success'
        });
        
        // إخفاء الرسالة بعد 3 ثواني
        setTimeout(() => {
          setConfirmationMessage(null);
        }, 3000);
      }
    } else {
      // رسالة عند إلغاء الارتباط بفاتورة
      setConfirmationMessage({
        message: "تم إلغاء الارتباط بالفاتورة. يمكنك إدخال المبلغ يدوياً الآن.",
        type: 'info'
      });
      
      setTimeout(() => {
        setConfirmationMessage(null);
      }, 3000);
    }
  }, [form, relevantInvoices]);

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
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        autoComplete="off"
                        value={field.value}
                        onChange={e => {
                          // اقبل القيمة كما هي (نصية) للسماح بالكتابة الطبيعية
                          field.onChange(e.target.value);
                        }}
                        onBlur={e => {
                          // عند الخروج من الحقل، قم بتحويل القيمة إلى رقم وتنسيقها
                          const val = e.target.value;
                          const num = parseFloat(val);
                          if (!isNaN(num)) {
                            field.onChange(Number(num.toFixed(2)));
                          } else {
                            field.onChange('');
                          }
                        }}
                      />
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
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>الفواتير المستحقة</FormLabel>
                      <div className="grid grid-cols-1 gap-4 mt-2">
                        <div className="flex items-center mb-2">
                          <input
                            type="radio"
                            id="no_invoice"
                            value="no_invoice"
                            checked={field.value === 'no_invoice' || !field.value}
                            onChange={() => {
                              field.onChange('no_invoice');
                              form.setValue('amount', 0);
                            }}
                            className="ml-2"
                          />
                          <label htmlFor="no_invoice" className="text-sm font-medium">
                            بدون ربط بفاتورة
                          </label>
                        </div>
                        
                        <div className="bg-muted/40 rounded-lg p-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {relevantInvoices.map(invoice => (                                <div 
                                key={invoice.id}
                                className={`border rounded-md p-3 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-sm ${
                                  field.value === invoice.id 
                                    ? 'border-primary bg-primary/10 shadow-md' 
                                    : 'border-border hover:border-primary/50'
                                }`}
                                onClick={() => handleInvoiceSelection(invoice.id)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <div className="font-medium">
                                      فاتورة: {invoice.id.substring(0, 8)}...
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {format(new Date(invoice.date), 'yyyy-MM-dd')}
                                    </div>
                                  </div>                                  <div className={`px-2 py-1 text-xs rounded-full flex items-center ${
                                    invoice.status === 'unpaid' 
                                      ? 'bg-destructive/10 text-destructive' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {invoice.status === 'unpaid' 
                                      ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>غير مدفوعة</>
                                      : <><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>مدفوعة جزئياً</>
                                    }
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>نسبة السداد</span>
                                    <span>{invoice.remaining_amount && invoice.total_amount ? 
                                      Math.round(((invoice.total_amount - invoice.remaining_amount) / invoice.total_amount) * 100) : 0}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div 
                                      className="bg-primary rounded-full h-2 transition-all duration-500"
                                      style={{ 
                                        width: `${invoice.remaining_amount && invoice.total_amount ? 
                                          Math.round(((invoice.total_amount - invoice.remaining_amount) / invoice.total_amount) * 100) : 0}%` 
                                      }}
                                    ></div>
                                  </div>
                                </div>
                                <input
                                  type="radio"
                                  name="invoice_selection"
                                  checked={field.value === invoice.id}
                                  onChange={() => handleInvoiceSelection(invoice.id)}
                                  className="hidden"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
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
        {showSummary && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 my-6">
                <h3 className="text-lg font-semibold mb-4">ملخص المعاملة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">نوع المعاملة:</span>
                    <span className="font-medium">
                      {form.getValues('payment_type') === 'collection' ? 'تحصيل (استلام دفعة)' : 'دفع (تسديد دفعة)'}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">
                      {form.getValues('payment_type') === 'collection' ? 'العميل' : 'المورد'}:
                    </span>
                    <span className="font-medium">{getPartyName(form.getValues('party_id'))}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">التاريخ:</span>
                    <span className="font-medium">{format(form.getValues('date'), 'yyyy-MM-dd')}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">طريقة الدفع:</span>
                    <span className="font-medium">{getPaymentMethodText(form.getValues('method'))}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">الفاتورة المرتبطة:</span>
                    <span className="font-medium">{getInvoiceReference(form.getValues('related_invoice_id'))}</span>
                  </div>                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">المبلغ:</span>
                    <span className="font-medium text-lg">
                      {typeof form.getValues('amount') === 'number'
                        ? Number(form.getValues('amount')).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '0.00'} ج.م
                    </span>
                  </div>
                </div>
                {form.getValues('notes') && (
                  <div className="mt-4">
                    <span className="text-sm text-muted-foreground">ملاحظات:</span>
                    <p className="mt-1 text-sm bg-background p-2 rounded">{form.getValues('notes')}</p>
                  </div>
                )}
                <div className="flex justify-between mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowSummary(false)}
                  >
                    تعديل
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => handleSubmit(form.getValues())}
                  >
                    تأكيد المعاملة
                  </Button>
                </div>
              </div>
            )}
            {confirmationMessage && (
              <div className={`p-4 rounded-md my-4 text-sm ${confirmationMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'} flex items-center justify-between transition-all duration-300 animate-in slide-in-from-top-5`}>
                <div className="flex items-center">
                  {confirmationMessage.type === 'success' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                  {confirmationMessage.message}
                </div>
                <button 
                  onClick={() => setConfirmationMessage(null)} 
                  className="text-sm opacity-70 hover:opacity-100"
                >
                  x
                </button>
              </div>
            )}
      </CardContent>
    </Card>
  );
}
