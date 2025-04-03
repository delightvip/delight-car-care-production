
import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Invoice, InvoiceItem } from '@/services/CommercialTypes';
import { Party } from '@/services/PartyService';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import InvoiceItemsTable from './InvoiceItemsTable';
import InvoiceItemForm from './InvoiceItemForm';

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

interface InvoiceFormProps {
  onSubmit: (data: Omit<Invoice, 'id' | 'created_at'>) => void;
  parties: Party[];
  items: Array<{
    id: number;
    name: string;
    type: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products';
    quantity: number;
    unit_cost: number;
    sales_price?: number;
  }>;
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
  const [total, setTotal] = useState<number>(0);
  
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

  const invoiceType = form.watch('invoice_type') as 'sale' | 'purchase';
  
  // Filter parties based on invoice type
  const filteredParties = invoiceType === 'sale' 
    ? parties.filter(party => party.type === 'customer') 
    : parties.filter(party => party.type === 'supplier');

  useEffect(() => {
    const calculatedTotal = invoiceItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    setTotal(calculatedTotal);
  }, [invoiceItems]);
  
  // Categorized items
  const categorizedItems = React.useMemo(() => {
    return {
      raw_materials: items.filter(item => item.type === 'raw_materials'),
      packaging_materials: items.filter(item => item.type === 'packaging_materials'),
      semi_finished_products: items.filter(item => item.type === 'semi_finished_products'),
      finished_products: items.filter(item => item.type === 'finished_products')
    };
  }, [items]);

  const addItemToInvoice = (newItem: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>) => {
    setInvoiceItems([...invoiceItems, newItem]);
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          {isEditing ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoice_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الفاتورة</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isEditing}
                    >
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
                      {invoiceType === 'sale' ? 'العميل' : 'المورد'}
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`اختر ${invoiceType === 'sale' ? 'العميل' : 'المورد'}`} />
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الفاتورة</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة الفاتورة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paid">مدفوعة</SelectItem>
                        <SelectItem value="partial">مدفوعة جزئياً</SelectItem>
                        <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Textarea placeholder="ملاحظات إضافية..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-4">عناصر الفاتورة</h3>
              
              <InvoiceItemForm 
                invoiceType={invoiceType}
                onAddItem={addItemToInvoice}
                items={items}
                categorizedItems={categorizedItems}
              />
              
              <InvoiceItemsTable 
                items={invoiceItems}
                onRemoveItem={removeItemFromInvoice}
                total={total}
              />
            </div>
            
            <CardFooter className="px-0 pt-6 flex justify-between">
              <Button variant="outline" type="button" onClick={() => form.reset()}>
                إعادة تعيين
              </Button>
              <Button 
                type="submit"
                disabled={invoiceItems.length === 0}
              >
                {isEditing ? 'تحديث الفاتورة' : 'إنشاء الفاتورة'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
