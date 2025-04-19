import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Invoice, InvoiceItem } from '@/services/CommercialService';
import { Party } from '@/services/PartyService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { FormStepper } from '@/components/ui/FormStepper';
import { InvoiceSummaryCard } from '@/components/ui/InvoiceSummaryCard';

const invoiceFormSchema = z.object({
  invoice_type: z.enum(['sale', 'purchase'], {
    required_error: 'الرجاء اختيار نوع الفاتورة',
  }),
  party_id: z.string({
    required_error: 'الرجاء اختيار الطرف التجاري',
  }),
  date: z.date({
    required_error: 'الرجاء تحديد تاريخ الفاتورة',
  }),
  status: z.enum(['paid', 'partial', 'unpaid'], {
    required_error: 'الرجاء اختيار حالة الفاتورة',
  }),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceProductItem {
  id: number;
  name: string;
  type: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products';
  quantity: number;
  unit_cost: number;
  code?: string;
}

interface InvoiceFormProps {
  onSubmit: (data: Omit<Invoice, 'id' | 'created_at'>) => void;
  parties: Party[];
  items: InvoiceProductItem[];
  initialData?: Partial<Invoice>;
  isEditing?: boolean;
}

export function InvoiceForm({ 
  onSubmit, 
  parties, 
  items, 
  initialData, 
  isEditing = false 
}: InvoiceFormProps) {
  const [invoiceItems, setInvoiceItems] = useState<Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>[]>(
    initialData?.items ? initialData.items.map(item => ({
      item_id: item.item_id,
      item_type: item.item_type,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price
    })) : []
  );
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [selectedItemType, setSelectedItemType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('finished_products');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [productSearch, setProductSearch] = useState<string>('');
  const [partySearch, setPartySearch] = useState<string>('');

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice_type: (initialData?.invoice_type as any) || 'sale',
      party_id: initialData?.party_id || '',
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      status: (initialData?.status as any) || 'unpaid',
      notes: initialData?.notes || '',
    },
  });

  const invoiceType = form.watch('invoice_type');
  
  // Filter parties based on invoice type
  const filteredParties = invoiceType === 'sale' 
    ? parties.filter(party => party.type === 'customer') 
    : parties.filter(party => party.type === 'supplier');

  useEffect(() => {
    const calculatedTotal = invoiceItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    setTotal(calculatedTotal);
  }, [invoiceItems]);

  useEffect(() => {
    if (selectedItemId) {
      const selectedItem = items.find(item => item.id === Number(selectedItemId) && item.type === selectedCategory);
      if (selectedItem) {
        setItemPrice(selectedItem.unit_cost);
        setSelectedItemType(selectedItem.type);
      }
    }
  }, [selectedItemId, selectedCategory, items]);
  
  // Categorized items
  const categorizedItems = React.useMemo(() => {
    return {
      raw_materials: items.filter(item => item.type === 'raw_materials'),
      packaging_materials: items.filter(item => item.type === 'packaging_materials'),
      semi_finished_products: items.filter(item => item.type === 'semi_finished_products'),
      finished_products: items.filter(item => item.type === 'finished_products')
    };
  }, [items]);

  const addItemToInvoice = () => {
    if (selectedItemId && itemQuantity > 0 && itemPrice > 0) {
      const selectedItem = items.find(item => item.id === Number(selectedItemId) && item.type === selectedCategory);
      
      if (!selectedItem) return;
      
      const newItem: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'> = {
        item_id: Number(selectedItemId),
        item_type: selectedItem.type,
        item_name: selectedItem.name,
        quantity: itemQuantity,
        unit_price: itemPrice,
        total: itemQuantity * itemPrice
      };
      
      setInvoiceItems([...invoiceItems, newItem]);
      
      setSelectedItemId('');
      setItemQuantity(1);
      setItemPrice(0);
    }
  };

  const removeItemFromInvoice = (index: number) => {
    const updatedItems = [...invoiceItems];
    updatedItems.splice(index, 1);
    setInvoiceItems(updatedItems);
  };

  const handleSubmit = (data: InvoiceFormValues) => {
    if (invoiceItems.length === 0) {
      return; // يمكن إضافة رسالة خطأ هنا
    }
    
    const formattedDate = format(data.date, 'yyyy-MM-dd');
    
    onSubmit({
      invoice_type: data.invoice_type,
      party_id: data.party_id,
      date: formattedDate,
      total_amount: total,
      items: invoiceItems,
      status: data.status,
      payment_status: 'confirmed', // Set default payment_status to confirmed
      notes: data.notes || ''
    });
  };

  const getCategoryTranslation = (category: string) => {
    switch (category) {
      case 'raw_materials':
        return 'المواد الخام';
      case 'packaging_materials':
        return 'مواد التعبئة';
      case 'semi_finished_products':
        return 'المنتجات نصف المصنعة';
      case 'finished_products':
        return 'المنتجات النهائية';
      default:
        return '';
    }
  };

  // Stepper state
  const [step, setStep] = useState(0);
  const steps = [
    { label: 'معلومات الفاتورة', description: 'النوع، الطرف، التاريخ، الحالة' },
    { label: 'عناصر الفاتورة', description: 'إضافة المنتجات أو الخدمات' },
    { label: 'مراجعة وتأكيد', description: 'تأكيد البيانات قبل الحفظ' },
  ];

  // Step navigation
  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));
  const gotoStep = (idx: number) => setStep(Math.max(0, Math.min(idx, steps.length - 1)));

  // دالة بحث ذكي للأطراف
  function partyMatches(party, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      party.name?.toLowerCase().includes(q) ||
      party.phone?.toLowerCase().includes(q) ||
      party.email?.toLowerCase().includes(q) ||
      party.id?.toLowerCase().includes(q)
    );
  }
  // دالة بحث ذكي للمنتجات
  function itemMatches(item: InvoiceProductItem, query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name?.toLowerCase().includes(q) ||
      (item.code && item.code.toLowerCase().includes(q))
    );
  }

  return (
    <FormProvider {...form}>
      <FormStepper steps={steps} currentStep={step} onStepClick={gotoStep} />
      <div className="flex flex-col md:flex-row gap-6">
        {/* --- ملخص جانبي --- */}
        <div className="md:w-1/3 order-2 md:order-1">
          <InvoiceSummaryCard total={total} itemsCount={invoiceItems.length} />
        </div>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 order-1 md:order-2">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold">
                {isEditing ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {step === 0 && (
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="invoice_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الفاتورة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">فاتورة مبيعات</SelectItem>
                          <SelectItem value="purchase">فاتورة مشتريات</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="party_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الطرف التجاري</FormLabel>
                      <div className="relative w-full">
                        <span className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 pointer-events-none">
                          <Search className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          className="input input-bordered w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-primary px-3 py-2 pr-9 transition-colors"
                          placeholder="ابحث بالاسم أو الهاتف أو البريد أو الرقم..."
                          value={partySearch}
                          onChange={e => setPartySearch(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الطرف" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {filteredParties
                            .filter(party => partyMatches(party, partySearch))
                            .map((party) => (
                              <SelectItem key={party.id} value={party.id}>
                                <div className="flex flex-col text-right">
                                  <span className="font-bold text-primary-700 dark:text-primary-300">{party.name}</span>
                                  <span className="text-xs text-muted-foreground">{party.phone} {party.email && `| ${party.email}`}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الفاتورة</FormLabel>
                      <DatePicker selected={field.value} onSelect={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>حالة الفاتورة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">مدفوعة</SelectItem>
                          <SelectItem value="partial">مدفوعة جزئيا</SelectItem>
                          <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات</FormLabel>
                      <Textarea {...field} rows={2} placeholder="أدخل أي ملاحظات إضافية..." />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
              {step === 1 && (
                <>
                  {/* --- إضافة عناصر الفاتورة --- */}
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block mb-1 font-medium">الفئة</label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الفئة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="finished_products">منتج نهائي</SelectItem>
                            <SelectItem value="semi_finished_products">منتج نصف مصنع</SelectItem>
                            <SelectItem value="raw_materials">مواد خام</SelectItem>
                            <SelectItem value="packaging_materials">مواد تعبئة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="relative w-full">
                        <label className="block mb-1 font-medium">البحث عن المنتج</label>
                        <div className="relative">
                          <span className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 pointer-events-none">
                            <Search className="h-4 w-4" />
                          </span>
                          <input
                            type="text"
                            className="input input-bordered w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-primary px-3 py-2 pr-9 transition-colors"
                            placeholder="ابحث باسم المنتج أو الكود..."
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                          />
                        </div>
                        <Select value={selectedItemId ? String(selectedItemId) : ''} onValueChange={v => setSelectedItemId(Number(v))}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المنتج" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto">
                            {items
                              .filter(item => item.type === selectedCategory && itemMatches(item, productSearch))
                              .map(item => (
                                <SelectItem key={item.id} value={String(item.id)}>
                                  <div className="flex flex-col text-right">
                                    <span className="font-bold text-primary-700 dark:text-primary-300">{item.name}</span>
                                    {item.code && <span className="text-xs text-muted-foreground">كود: {item.code}</span>}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block mb-1 font-medium">الكمية</label>
                        <Input type="number" min={1} value={itemQuantity} onChange={e => setItemQuantity(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium">السعر</label>
                        <Input type="number" min={0} step={0.01} value={itemPrice} onChange={e => setItemPrice(Number(e.target.value))} />
                      </div>
                    </div>
                    <div>
                      <Button type="button" onClick={addItemToInvoice} disabled={!selectedItemId || itemQuantity <= 0 || itemPrice <= 0} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> إضافة
                      </Button>
                    </div>
                  </div>
                  {/* --- جدول العناصر --- */}
                  <div className="border rounded-md overflow-hidden mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>المنتج</TableHead>
                          <TableHead>الفئة</TableHead>
                          <TableHead className="text-center">الكمية</TableHead>
                          <TableHead className="text-center">السعر</TableHead>
                          <TableHead className="text-right">المجموع</TableHead>
                          <TableHead className="text-center w-[80px]">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.length > 0 ? (
                          invoiceItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{item.item_name}</TableCell>
                              <TableCell>{getCategoryTranslation(item.item_type)}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-center">{item.unit_price.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                              <TableCell className="text-center">
                                <Button variant="ghost" size="icon" onClick={() => removeItemFromInvoice(index)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">لم يتم إضافة عناصر بعد</TableCell>
                          </TableRow>
                        )}
                        {invoiceItems.length > 0 && (
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={5} className="text-right font-bold">المجموع الكلي</TableCell>
                            <TableCell className="text-right font-bold">{total.toFixed(2)}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h3 className="font-bold mb-2">مراجعة الفاتورة</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><b>نوع الفاتورة:</b> {form.getValues('invoice_type') === 'sale' ? 'مبيعات' : 'مشتريات'}</div>
                      <div><b>الطرف:</b> {filteredParties.find(p => p.id === form.getValues('party_id'))?.name || ''}</div>
                      <div><b>التاريخ:</b> {form.getValues('date') ? form.getValues('date').toLocaleDateString() : ''}</div>
                      <div><b>الحالة:</b> {(() => {
                        switch(form.getValues('status')) {
                          case 'paid': return 'مدفوعة';
                          case 'partial': return 'مدفوعة جزئيا';
                          case 'unpaid': return 'غير مدفوعة';
                          default: return '';
                        }
                      })()}</div>
                      <div className="md:col-span-2"><b>ملاحظات:</b> {form.getValues('notes')}</div>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-bold mb-2">العناصر:</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>المنتج</TableHead>
                            <TableHead>الفئة</TableHead>
                            <TableHead>الكمية</TableHead>
                            <TableHead>السعر</TableHead>
                            <TableHead>المجموع</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{item.item_name}</TableCell>
                              <TableCell>{getCategoryTranslation(item.item_type)}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.unit_price.toFixed(2)}</TableCell>
                              <TableCell>{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={5} className="text-right font-bold">المجموع الكلي</TableCell>
                            <TableCell className="text-right font-bold">{total.toFixed(2)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="px-0 pt-6 flex justify-between">
              {step > 0 && (
                <Button variant="outline" type="button" onClick={prevStep}>
                  السابق
                </Button>
              )}
              {step < steps.length - 1 && (
                <Button type="button" onClick={nextStep} disabled={step === 1 && invoiceItems.length === 0}>
                  التالي
                </Button>
              )}
              {step === steps.length - 1 && (
                <Button type="submit" disabled={invoiceItems.length === 0}>
                  {isEditing ? 'تحديث الفاتورة' : 'إنشاء الفاتورة'}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                className="ml-2"
                onClick={() => setStep(2)}
                disabled={step === 2}
              >
                معاينة الفاتورة
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </FormProvider>
  );
}
