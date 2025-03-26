
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
import { AlertCircle, CalendarIcon, PlusCircle, Trash, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Return, ReturnItem } from '@/services/CommercialTypes';
import CommercialService from '@/services/CommercialService';
import InventoryService from '@/services/InventoryService';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define the ReturnFormValues schema
const returnFormSchema = z.object({
  return_type: z.enum(['sales_return', 'purchase_return']),
  invoice_id: z.string().optional(),
  party_id: z.string().optional(),
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
  const [isLoadingInvoiceItems, setIsLoadingInvoiceItems] = useState<boolean>(false);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  
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

  // Fetch invoices based on the selected return type
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices', form.watch('return_type')],
    queryFn: async () => {
      const invoiceType = form.watch('return_type') === 'sales_return' ? 'sale' : 'purchase';
      const { data, error } = await supabase
        .from('invoices')
        .select('*, parties(name)')
        .eq('invoice_type', invoiceType)
        .eq('status', 'completed')
        .order('date', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch parties
  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => CommercialService.getInstance().getParties(),
  });

  // Fetch inventory items based on the selected type
  const { data: inventoryItems, isLoading: isLoadingItems } = useQuery({
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

  // When invoice is selected, fetch its items
  useEffect(() => {
    async function fetchInvoiceDetails() {
      if (selectedInvoice && selectedInvoice !== 'no_invoice') {
        setIsLoadingInvoiceItems(true);
        try {
          // Fetch invoice details including items
          const { data, error } = await supabase
            .from('invoices')
            .select(`
              *,
              invoice_items(*),
              parties(*)
            `)
            .eq('id', selectedInvoice)
            .single();
          
          if (error) throw error;
          
          setInvoiceDetails(data);
          
          // Update party ID in the form
          if (data.party_id) {
            form.setValue('party_id', data.party_id);
          }
          
          // Clear existing items
          form.setValue('items', []);
          
        } catch (error) {
          console.error('Error fetching invoice details:', error);
        } finally {
          setIsLoadingInvoiceItems(false);
        }
      } else {
        setInvoiceDetails(null);
      }
    }
    
    fetchInvoiceDetails();
  }, [selectedInvoice, form]);

  // Recalculate total amount when items change
  useEffect(() => {
    const items = form.watch('items');
    if (items && items.length > 0) {
      const total = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
      }, 0);
      form.setValue('amount', Number(total.toFixed(2)));
    } else {
      form.setValue('amount', 0);
    }
  }, [form.watch('items')]);

  // Add item from invoice to the return
  const addItemFromInvoice = (invoiceItem: any) => {
    const currentItems = form.getValues('items') || [];
    
    // Check if item already exists in the form
    const existingItemIndex = currentItems.findIndex(
      item => item.item_id === invoiceItem.item_id && item.item_type === invoiceItem.item_type
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity if item already exists
      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex].quantity += 1;
      form.setValue('items', updatedItems);
    } else {
      // Add new item
      form.setValue('items', [
        ...currentItems,
        {
          item_id: parseInt(invoiceItem.item_id),
          item_type: invoiceItem.item_type,
          item_name: invoiceItem.item_name,
          quantity: 1,
          unit_price: invoiceItem.unit_price
        }
      ]);
    }
  };

  // Add a new empty item to the form
  const addItem = () => {
    const currentItems = form.getValues('items') || [];
    form.setValue('items', [
      ...currentItems, 
      { 
        item_id: 0, 
        item_type: selectedItemType as any, 
        item_name: '', 
        quantity: 1, 
        unit_price: 0 
      }
    ]);
  };

  // Remove an item from the form
  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    form.setValue('items', currentItems.filter((_, i) => i !== index));
  };

  // Handle change in return type
  const handleReturnTypeChange = (type: string) => {
    // Reset invoice and items when return type changes
    form.setValue('invoice_id', undefined);
    form.setValue('items', []);
    setSelectedInvoice(null);
    setInvoiceDetails(null);
  };

  // Handle form submission
  const handleSubmitForm = (values: ReturnFormValues) => {
    // Create a return object from form values
    const returnData: Omit<Return, 'id' | 'created_at'> = {
      return_type: values.return_type,
      invoice_id: values.invoice_id === 'no_invoice' ? undefined : values.invoice_id,
      party_id: values.party_id,
      date: format(values.date, 'yyyy-MM-dd'),
      amount: values.amount,
      notes: values.notes,
      payment_status: 'draft',
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
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleReturnTypeChange(value);
                  }} 
                  defaultValue={field.value}
                >
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
                <FormLabel>رقم الفاتورة</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedInvoice(value);
                  }} 
                  value={field.value || "no_invoice"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفاتورة المرتبطة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="no_invoice">بدون فاتورة</SelectItem>
                    {isLoadingInvoices ? (
                      <div className="flex items-center justify-center p-2">
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                        جاري التحميل...
                      </div>
                    ) : (
                      invoices?.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {`${invoice.id.substring(0, 8)}... - ${invoice.parties?.name || 'غير محدد'} - ${invoice.total_amount}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  يُفضل اختيار فاتورة مرتبطة لضمان دقة المعلومات
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Party Selection (if no invoice selected) */}
          {(!selectedInvoice || selectedInvoice === 'no_invoice') && (
            <FormField
              control={form.control}
              name="party_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الطرف</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الطرف" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parties?.filter(party => 
                        form.getValues('return_type') === 'sales_return' 
                          ? party.type === 'customer' 
                          : party.type === 'supplier'
                      ).map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    اختر العميل أو المورد المرتبط بالمرتجع
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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

        {/* Display invoice items if an invoice is selected */}
        {selectedInvoice && selectedInvoice !== 'no_invoice' && (
          <div className="space-y-4 border rounded-md p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">أصناف الفاتورة</h3>
              {isLoadingInvoiceItems && (
                <div className="flex items-center">
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  جاري التحميل...
                </div>
              )}
            </div>
            
            {invoiceDetails?.invoice_items?.length > 0 ? (
              <div className="space-y-2">
                {invoiceDetails.invoice_items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center bg-muted p-2 rounded-md">
                    <div>
                      <span className="font-medium">{item.item_name}</span>
                      <div className="text-sm text-muted-foreground">
                        الكمية: {item.quantity} | السعر: {item.unit_price}
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => addItemFromInvoice(item)}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      إضافة للمرتجع
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                لا توجد أصناف في هذه الفاتورة
              </p>
            )}
          </div>
        )}

        {/* Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">الأصناف المرتجعة</h3>
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
                              value={field.value?.toString() || "0"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر الصنف" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingItems ? (
                                  <div className="flex items-center justify-center p-2">
                                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                                    جاري التحميل...
                                  </div>
                                ) : (
                                  inventoryItems?.map((item) => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                      {item.name}
                                    </SelectItem>
                                  ))
                                )}
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

        {/* Warning when no invoice is selected */}
        {(!selectedInvoice || selectedInvoice === 'no_invoice') && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>تنبيه</AlertTitle>
            <AlertDescription>
              يُفضل ربط المرتجع بفاتورة محددة لضمان دقة البيانات والإجراءات المالية والمخزنية.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button type="submit">حفظ المرتجع</Button>
        </div>
      </form>
    </Form>
  );
}
