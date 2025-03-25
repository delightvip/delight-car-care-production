import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
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
import { CalendarIcon, PlusCircle, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Return, ReturnItem } from '@/services/CommercialService';
import CommercialService from '@/services/CommercialService';
import InventoryService from '@/services/InventoryService';

const returnFormSchema = z.object({
  return_type: z.enum(['sales_return', 'purchase_return']),
  invoice_id: z.string().optional(),
  date: z.date(),
  amount: z.number().min(0, 'يجب أن يكون المبلغ أكبر من صفر'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      item_id: z.number(),
      item_type: z.enum(['raw_materials', 'packaging_materials', 'semi_finished_products', 'finished_products']),
      item_name: z.string(),
      quantity: z.number().min(0.1, 'يجب أن تكون الكمية أكبر من صفر'),
      unit_price: z.number().min(0, 'يجب أن يكون السعر أكبر من أو يساوي صفر')
    })
  ).min(1, 'يجب إضافة عنصر واحد على الأقل')
});

type ReturnFormValues = z.infer<typeof returnFormSchema>;

interface ReturnsFormProps {
  onSubmit: (data: Omit<Return, 'id' | 'created_at'>) => void;
  initialData?: Return;
}

export function ReturnsForm({ onSubmit, initialData }: ReturnsFormProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string>('finished_products');
  
  // Prepare form default values, converting string date to Date object if initialData is provided
  const defaultValues = initialData 
    ? {
        ...initialData,
        // Convert string date to Date object
        date: initialData.date ? new Date(initialData.date) : new Date(),
        // Ensure items are properly formatted
        items: initialData.items || []
      }
    : {
        return_type: 'sales_return' as const,
        date: new Date(),
        amount: 0,
        notes: '',
        items: []
      };
  
  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => CommercialService.getInstance().getInvoices(),
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory', selectedItemType],
    queryFn: () => {
      const inventoryService = InventoryService.getInstance();
      switch (selectedItemType) {
        case 'raw_materials':
          return inventoryService.getRawMaterials();
        case 'packaging_materials':
          return inventoryService.getPackagingMaterials();
        case 'semi_finished_products':
          return inventoryService.getSemiFinishedProducts();
        case 'finished_products':
          return inventoryService.getFinishedProducts();
        default:
          return [];
      }
    },
    enabled: !!selectedItemType,
  });

  // Recalculate total amount when items change
  useEffect(() => {
    const items = form.watch('items');
    if (items && items.length > 0) {
      const total = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
      }, 0);
      form.setValue('amount', total);
    } else {
      form.setValue('amount', 0);
    }
  }, [form.watch('items')]);

  // Add a new empty item to the form
  const addItem = () => {
    const currentItems = form.getValues('items') || [];
    form.setValue('items', [
      ...currentItems, 
      { item_id: 0, item_type: 'finished_products' as const, item_name: '', quantity: 1, unit_price: 0 }
    ]);
  };

  // Remove an item from the form
  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    form.setValue('items', currentItems.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmitForm = (values: ReturnFormValues) => {
    // Create a return object from form values
    const returnData: Omit<Return, 'id' | 'created_at'> = {
      return_type: values.return_type,
      invoice_id: values.invoice_id,
      date: format(values.date, 'yyyy-MM-dd'),
      amount: values.amount,
      notes: values.notes,
      items: values.items.map(item => ({
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Return Type */}
          <FormField
            control={form.control}
            name="return_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع المرتجع</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المرتجع" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sales_return">مرتجع مبيعات</SelectItem>
                    <SelectItem value="purchase_return">مرتجع مشتريات</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Invoice Reference (Optional) */}
          <FormField
            control={form.control}
            name="invoice_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الفاتورة (اختياري)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفاتورة المرتبطة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">بدون فاتورة</SelectItem>
                    {invoices?.filter(inv => 
                      form.getValues('return_type') === 'sales_return' 
                        ? inv.invoice_type === 'sale' 
                        : inv.invoice_type === 'purchase'
                    ).map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {`${invoice.id.substring(0, 8)}... - ${invoice.party_name} - ${invoice.total_amount}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  يمكنك ربط المرتجع بفاتورة محددة أو تركه بدون ارتباط
                </FormDescription>
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
                <FormLabel>التاريخ</FormLabel>
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

          {/* Amount (calculated from items) */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>إجمالي المبلغ</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    disabled
                    className="bg-muted"
                  />
                </FormControl>
                <FormDescription>
                  يتم حساب هذا المبلغ تلقائيًا من الأصناف
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
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

        {/* Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">الأصناف</h3>
            <div className="flex space-x-2">
              <Select value={selectedItemType} onValueChange={setSelectedItemType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="نوع الصنف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw_materials">مواد خام</SelectItem>
                  <SelectItem value="packaging_materials">مواد تعبئة</SelectItem>
                  <SelectItem value="semi_finished_products">منتجات نصف مصنعة</SelectItem>
                  <SelectItem value="finished_products">منتجات تامة</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addItem}>
                <PlusCircle className="h-4 w-4 mr-2" />
                إضافة صنف
              </Button>
            </div>
          </div>

          <div className="border rounded-md p-4">
            {form.watch('items')?.length > 0 ? (
              <div className="space-y-4">
                {form.watch('items').map((_, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`items.${index}.item_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الصنف</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(parseInt(value));
                                // Find the selected item and set its name
                                const item = inventoryItems?.find(i => i.id === parseInt(value));
                                if (item) {
                                  form.setValue(`items.${index}.item_name`, item.name);
                                  form.setValue(`items.${index}.item_type`, selectedItemType as any);
                                }
                              }}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر الصنف" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {inventoryItems?.map((item) => (
                                  <SelectItem key={item.id} value={item.id.toString()}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الكمية</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>سعر الوحدة</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                لا توجد أصناف. انقر على "إضافة صنف" لإضافة أصناف للمرتجع.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">حفظ المرتجع</Button>
        </div>
      </form>
    </Form>
  );
}
