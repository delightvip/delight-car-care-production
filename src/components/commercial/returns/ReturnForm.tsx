
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Return } from '@/types/returns';
import { ReturnFormValues, returnFormSchema } from '@/types/returns';
import CommercialService from '@/services/CommercialService';
import PartyService from '@/services/PartyService';
import InventoryService from '@/services/InventoryService';
import ReturnFormTypeField from './fields/ReturnFormTypeField';
import ReturnFormInvoiceField from './fields/ReturnFormInvoiceField';
import ReturnFormPartyField from './fields/ReturnFormPartyField';
import ReturnFormDateField from './fields/ReturnFormDateField';
import ReturnFormNotesField from './fields/ReturnFormNotesField';
import ReturnItemsList from './ReturnItemsList';

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
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(initialData?.invoice_id || null);
  const [selectedItemType, setSelectedItemType] = useState<string>('finished_products');
  const [loadingInvoiceItems, setLoadingInvoiceItems] = useState<boolean>(false);
  
  const commercialService = CommercialService.getInstance();
  const inventoryService = InventoryService.getInstance();
  const partyService = PartyService.getInstance();

  // توفير القيم الافتراضية للنموذج
  const defaultValues: Partial<ReturnFormValues> = {
    return_type: initialData?.return_type || 'sales_return',
    invoice_id: initialData?.invoice_id,
    date: initialData?.date ? new Date(initialData.date) : new Date(),
    notes: initialData?.notes || '',
    items: initialData?.items?.map(item => ({
      item_id: item.item_id,
      item_type: item.item_type,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      selected: true,
      max_quantity: item.quantity, // نفترض أن أقصى كمية هي الكمية الحالية في حالة التعديل
      total: item.total
    })) || []
  };

  // إعداد نموذج التحقق
  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues
  });

  // استخراج قيم مفيدة من النموذج
  const returnType = form.watch('return_type');
  const items = form.watch('items') || [];

  // استعلام الفواتير
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => commercialService.getInvoices(),
  });

  // استعلام الأطراف
  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
  });

  // استعلام أصناف المخزون
  const { data: inventoryItems, isLoading: isLoadingInventoryItems } = useQuery({
    queryKey: ['inventory', selectedItemType],
    queryFn: () => {
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

  // معالجة تغيير الفاتورة المحددة
  const handleInvoiceChange = async (invoiceId: string) => {
    form.setValue('invoice_id', invoiceId === 'no_invoice' ? undefined : invoiceId);
    setSelectedInvoice(invoiceId === 'no_invoice' ? null : invoiceId);
    
    if (invoiceId === 'no_invoice') {
      form.setValue('party_id', undefined);
      form.setValue('items', []);
      return;
    }
    
    setLoadingInvoiceItems(true);
    try {
      const invoice = await commercialService.getInvoiceById(invoiceId);
      
      if (invoice) {
        form.setValue('party_id', invoice.party_id);
        
        if (invoice.items && invoice.items.length > 0) {
          const returnItems = invoice.items.map(item => ({
            item_id: Number(item.item_id),
            item_type: item.item_type as any,
            item_name: item.item_name,
            quantity: 0,
            unit_price: item.unit_price,
            selected: false,
            max_quantity: item.quantity,
            invoice_quantity: item.quantity
          }));
          
          form.setValue('items', returnItems);
          calculateTotal();
          
          toast.success('تم جلب أصناف الفاتورة بنجاح');
        } else {
          toast('لا توجد أصناف في الفاتورة المحددة');
        }
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('حدث خطأ أثناء جلب تفاصيل الفاتورة');
    } finally {
      setLoadingInvoiceItems(false);
    }
  };

  // معالجة تغيير الطرف المحدد
  const handlePartyChange = (partyId: string) => {
    form.setValue('party_id', partyId === 'no_party' ? undefined : partyId);
  };

  // حساب المبلغ الإجمالي للمرتجع
  const calculateTotal = () => {
    const items = form.getValues('items');
    if (items && items.length > 0) {
      const total = items.reduce((sum, item) => {
        if (item.selected) {
          const itemTotal = item.quantity * item.unit_price;
          // تحديث المجموع الفرعي للصنف
          item.total = itemTotal;
          return sum + itemTotal;
        }
        return sum;
      }, 0);
      
      form.setValue('amount', total);
    } else {
      form.setValue('amount', 0);
    }
  };

  // إضافة صنف جديد (في حالة عدم اختيار فاتورة)
  const addItem = () => {
    if (!inventoryItems || isLoadingInventoryItems) return;
    
    const selectedItem = inventoryItems.length > 0 ? inventoryItems[0] : null;
    
    if (!selectedItem) {
      toast.error('لا توجد أصناف متاحة من النوع المحدد');
      return;
    }
    
    const currentItems = form.getValues('items') || [];
    form.setValue('items', [
      ...currentItems, 
      { 
        item_id: selectedItem.id, 
        item_type: selectedItemType as any, 
        item_name: selectedItem.name, 
        quantity: 1, 
        unit_price: selectedItem.unit_cost || 0,
        selected: true,
        max_quantity: Number.MAX_SAFE_INTEGER
      }
    ]);
    calculateTotal();
  };

  // حذف صنف
  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    const filteredItems = currentItems.filter((_, i) => i !== index);
    form.setValue('items', filteredItems);
    calculateTotal();
  };

  // تغيير حالة اختيار الصنف
  const toggleItemSelection = (index: number, selected: boolean) => {
    const items = form.getValues('items');
    const updatedItems = [...items];
    
    updatedItems[index] = {
      ...updatedItems[index],
      selected
    };
    
    if (!selected) {
      updatedItems[index].quantity = 0;
    }
    
    form.setValue('items', updatedItems);
    calculateTotal();
  };

  // تغيير كمية الصنف
  const handleQuantityChange = (index: number, value: string) => {
    const parsedValue = parseFloat(value) || 0;
    const items = form.getValues('items');
    const item = items[index];
    
    const maxQty = item.max_quantity || Number.MAX_SAFE_INTEGER;
    const validatedQuantity = Math.min(parsedValue, maxQty);
    
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: validatedQuantity
    };
    
    if (validatedQuantity > 0 && !item.selected) {
      updatedItems[index].selected = true;
    }
    
    form.setValue('items', updatedItems);
    calculateTotal();
  };

  // مراقبة التغييرات في الأصناف لإعادة حساب المبلغ الإجمالي
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items.') || name === 'items') {
        calculateTotal();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

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
      party_id: values.invoice_id ? undefined : form.getValues('party_id'),
      date: format(values.date, 'yyyy-MM-dd'),
      amount: values.items.reduce((sum, item) => sum + (item.selected ? item.quantity * item.unit_price : 0), 0),
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

  // تصفية الفواتير حسب نوع المرتجع
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter(inv => 
      returnType === 'sales_return' 
        ? inv.invoice_type === 'sale' 
        : inv.invoice_type === 'purchase'
    );
  }, [invoices, returnType]);

  // تصفية الأطراف حسب نوع المرتجع
  const filteredParties = React.useMemo(() => {
    if (!parties) return [];
    
    return parties.filter(party => 
      returnType === 'sales_return' 
        ? party.type === 'customer' 
        : party.type === 'supplier'
    );
  }, [parties, returnType]);

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
              {/* حقل نوع المرتجع */}
              <ReturnFormTypeField 
                form={form} 
                onReturnTypeChange={(type) => {
                  form.setValue('invoice_id', undefined);
                  form.setValue('party_id', undefined);
                  form.setValue('items', []);
                  setSelectedInvoice(null);
                }} 
              />
              
              {/* حقل اختيار الفاتورة */}
              <ReturnFormInvoiceField 
                form={form}
                filteredInvoices={filteredInvoices}
                isLoadingInvoices={isLoadingInvoices}
                loadingInvoiceItems={loadingInvoiceItems}
                onInvoiceChange={handleInvoiceChange}
              />
              
              {/* حقل اختيار الطرف (يظهر فقط إذا لم يتم اختيار فاتورة) */}
              {!selectedInvoice && (
                <ReturnFormPartyField 
                  form={form}
                  returnType={returnType}
                  filteredParties={filteredParties}
                  onPartyChange={handlePartyChange}
                />
              )}
              
              {/* حقل التاريخ */}
              <ReturnFormDateField form={form} />
            </div>
            
            {/* حقل الملاحظات */}
            <ReturnFormNotesField form={form} />
            
            {/* قائمة الأصناف */}
            <ReturnItemsList 
              form={form}
              selectedInvoice={selectedInvoice}
              selectedItemType={selectedItemType}
              setSelectedItemType={setSelectedItemType}
              loadingInvoiceItems={loadingInvoiceItems}
              isLoadingInventoryItems={isLoadingInventoryItems}
              inventoryItems={inventoryItems || []}
              addItem={addItem}
              removeItem={removeItem}
              toggleItemSelection={toggleItemSelection}
              handleQuantityChange={handleQuantityChange}
            />
            
            <CardFooter className="px-0 pt-6 flex justify-between">
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
