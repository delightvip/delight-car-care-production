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
import { Invoice, InvoiceItem } from '@/services/CommercialService';
import { Party } from '@/services/PartyService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';

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
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [selectedItemType, setSelectedItemType] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
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

  useEffect(() => {
    const calculatedTotal = invoiceItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    setTotal(calculatedTotal);
  }, [invoiceItems]);

  useEffect(() => {
    if (selectedItemId) {
      const selectedItem = items.find(item => item.id === Number(selectedItemId));
      if (selectedItem) {
        setItemPrice(selectedItem.unit_cost);
        setSelectedItemType(selectedItem.type);
      }
    }
  }, [selectedItemId, items]);

  const addItemToInvoice = () => {
    if (selectedItemId && itemQuantity > 0 && itemPrice > 0) {
      const selectedItem = items.find(item => item.id === Number(selectedItemId));
      
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
      notes: data.notes
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
                    <FormLabel>الطرف التجاري</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الطرف التجاري" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {parties.map(party => (
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
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium">المنتج</label>
                  <Select 
                    value={selectedItemId.toString() || undefined}
                    onValueChange={(value) => setSelectedItemId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">الكمية</label>
                  <Input 
                    type="number" 
                    min="1"
                    value={itemQuantity} 
                    onChange={(e) => setItemQuantity(Number(e.target.value))} 
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">السعر</label>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemPrice} 
                    onChange={(e) => setItemPrice(Number(e.target.value))} 
                  />
                </div>
                
                <div className="flex items-end">
                  <Button 
                    type="button" 
                    onClick={addItemToInvoice}
                    disabled={!selectedItemId || itemQuantity <= 0 || itemPrice <= 0}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" /> إضافة
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>المنتج</TableHead>
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
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-center">{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {(item.quantity * item.unit_price).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeItemFromInvoice(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                          لم يتم إضافة عناصر بعد
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {invoiceItems.length > 0 && (
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={4} className="text-right font-bold">
                          المجموع الكلي
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {total.toFixed(2)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
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
