import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, PlusCircle, Trash, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Invoice, InvoiceItem, Party } from '@/services/CommercialTypes';
import CommercialService from '@/services/CommercialService';
import PartyService from '@/services/PartyService';
import { toast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const invoiceFormSchema = z.object({
  invoice_type: z.enum(['sale', 'purchase']),
  party_id: z.string(),
  date: z.date(),
  status: z.enum(['draft', 'pending', 'paid', 'partially_paid', 'cancelled', 'overdue']),
  payment_status: z.enum(['draft', 'confirmed', 'cancelled']).optional(),
  total_amount: z.number(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      item_id: z.number(),
      item_type: z.enum(['raw_materials', 'packaging_materials', 'semi_finished_products', 'finished_products']),
      item_name: z.string(),
      quantity: z.number().min(0.1, 'يجب أن تكون الكمية أكبر من صفر'),
      unit_price: z.number().min(0, 'يجب أن يكون السعر أكبر من أو يساوي صفر'),
      selected: z.boolean().optional()
    })
  )
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  onSubmit: (data: Omit<Invoice, 'id' | 'created_at'>) => void;
  initialData?: Invoice;
}

export function InvoiceForm({ onSubmit, initialData }: InvoiceFormProps) {
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([]);
  
  const commercialService = CommercialService.getInstance();
  const partyService = PartyService.getInstance();
  
  const defaultValues: InvoiceFormValues = initialData
    ? {
        invoice_type: initialData.invoice_type,
        party_id: initialData.party_id,
        date: new Date(initialData.date),
        status: initialData.status,
        payment_status: initialData.payment_status,
        total_amount: initialData.total_amount,
        notes: initialData.notes || '',
        items: initialData.items.map(item => ({
          item_id: item.item_id,
          item_type: item.item_type as 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products',
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          selected: true
        }))
      }
    : {
        invoice_type: 'sale',
        party_id: '',
        date: new Date(),
        status: 'draft',
        payment_status: 'draft',
        total_amount: 0,
        notes: '',
        items: []
      };
  
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
    mode: "onChange"
  });

  const { data: parties, isLoading: isLoadingParties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
  });

  const handlePartyChange = (partyId: string) => {
    form.setValue('party_id', partyId);
    setSelectedParty(partyId);
  };

  const calculateTotal = () => {
    const items = form.getValues('items');
    if (items && items.length > 0) {
      const total = items.reduce((sum, item) => {
        return sum + (item.selected ? (item.quantity * item.unit_price) : 0);
      }, 0);
      form.setValue('total_amount', total);
    } else {
      form.setValue('total_amount', 0);
    }
  };

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items.') || name === 'items') {
        calculateTotal();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const addItem = () => {
    const currentItems = form.getValues('items') || [];
    form.setValue('items', [
      ...currentItems, 
      { 
        item_id: 0, 
        item_type: 'finished_products', 
        item_name: '', 
        quantity: 1, 
        unit_price: 0,
        selected: true
      }
    ]);
    calculateTotal();
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    form.setValue('items', currentItems.filter((_, i) => i !== index));
    calculateTotal();
  };

  const toggleItemSelection = (index: number, selected: boolean) => {
    const items = form.getValues('items');
    const updatedItems = [...items];
    
    updatedItems[index] = {
      ...updatedItems[index],
      selected
    };
    
    form.setValue('items', updatedItems);
    calculateTotal();
  };

  const handleQuantityChange = (index: number, value: string) => {
    const parsedValue = parseFloat(value) || 0;
    form.setValue(`items.${index}.quantity`, parsedValue);
    calculateTotal();
  };

const handleSubmitForm = async (values: any) => {
  try {
    console.log('Form values before submission:', values);
    
    const formattedDate = format(values.date, 'yyyy-MM-dd');
    const selectedItems = values.items.filter((item: any) => item.selected && item.quantity > 0);
    const total = values.total_amount;
    
    if (selectedItems.length === 0) {
      toast({
        title: "خطأ",
        description: "يجب اختيار صنف واحد على الأقل وتحديد كمية له",
        variant: "destructive"
      });
      return;
    }
    
    const invoiceData: Omit<Invoice, 'id' | 'created_at'> = {
      date: formattedDate,
      invoice_type: values.invoice_type,
      notes: values.notes,
      party_id: values.party_id,
      total_amount: total,
      status: values.status,
      payment_status: values.payment_status || 'draft',
      party_name: values.party_name,
      items: selectedItems.map((item: any) => ({
        item_id: item.item_id,
        item_type: item.item_type,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }))
    };

    console.log('Submitting invoice data:', invoiceData);
    
    onSubmit(invoiceData);
  } catch (error) {
    console.error('Error submitting invoice form:', error);
    toast({
      title: "خطأ",
      description: "حدث خطأ أثناء معالجة النموذج",
      variant: "destructive"
    });
  }
};

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="invoice_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الفاتورة</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الفاتورة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sale">فاتورة مبيعات</SelectItem>
                    <SelectItem value="purchase">فاتورة مشتريات</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  حدد نوع الفاتورة سواء كانت فاتورة مبيعات أو فاتورة مشتريات
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="party_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الطرف</FormLabel>
                <Select 
                  onValueChange={handlePartyChange} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطرف" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parties?.map((party) => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  حدد الطرف المرتبط بهذه الفاتورة (عميل أو مورد)
                </FormDescription>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-right font-normal",
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

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الحالة</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="pending">معلقة</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="partially_paid">مدفوعة جزئياً</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                    <SelectItem value="overdue">متأخرة</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  حدد حالة الفاتورة
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>حالة الدفع</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر حالة الدفع" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="confirmed">مؤكدة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  حدد حالة الدفع للفاتورة
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="total_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>إجمالي المبلغ</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                </FormControl>
                <FormDescription>
                  أدخل إجمالي المبلغ للفاتورة
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ملاحظات</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4">
          <Label htmlFor="items">أصناف الفاتورة</Label>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>
            <PlusCircle className="h-4 w-4 ml-2" />
            إضافة صنف
          </Button>
          <div className="grid gap-2">
            {form.watch('items')?.map((item, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Checkbox 
                  checked={item.selected} 
                  onCheckedChange={(checked) => toggleItemSelection(index, Boolean(checked))}
                  aria-label="Select row"
                />
                <div className="grid gap-1.5">
                  <Label htmlFor={`item-${index}`}>الصنف {index + 1}</Label>
                  <Input
                    type="text"
                    id={`item-${index}`}
                    defaultValue={item.item_name}
                    className="w-24"
                    onChange={(e) => form.setValue(`items.${index}.item_name`, e.target.value)}
                  />
                  <Input
                    type="number"
                    id={`quantity-${index}`}
                    defaultValue={item.quantity}
                    className="w-24"
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                  />
                  <Input
                    type="number"
                    id={`unit_price-${index}`}
                    defaultValue={item.unit_price}
                    className="w-24"
                    onChange={(e) => form.setValue(`items.${index}.unit_price`, parseFloat(e.target.value) || 0)}
                  />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          حفظ الفاتورة
        </Button>
      </form>
    </Form>
  );
}
