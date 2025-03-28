
import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ReturnFormValues } from '@/types/returns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import ReturnFormTypeField from './fields/ReturnFormTypeField';
import ReturnFormInvoiceField from './fields/ReturnFormInvoiceField';
import ReturnFormDateField from './fields/ReturnFormDateField';
import ReturnFormNotesField from './fields/ReturnFormNotesField';
import ReturnItemsList from './ReturnItemsList';
import CommercialService from '@/services/CommercialService';

interface ReturnInvoiceFormProps {
  form: UseFormReturn<ReturnFormValues>;
  isLoadingInvoices: boolean;
  filteredInvoices: any[];
}

export default function ReturnInvoiceForm({ 
  form, 
  isLoadingInvoices, 
  filteredInvoices 
}: ReturnInvoiceFormProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(form.getValues('invoice_id') || null);
  const [selectedItemType, setSelectedItemType] = useState<string>('finished_products');
  const [loadingInvoiceItems, setLoadingInvoiceItems] = useState<boolean>(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoadingInventoryItems, setIsLoadingInventoryItems] = useState<boolean>(false);

  const returnType = form.watch('return_type');
  const items = form.watch('items') || [];

  const commercialService = CommercialService.getInstance();

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

  // حذف صنف
  const removeItem = (index: number) => {
    const currentItems = form.getValues('items');
    const filteredItems = currentItems.filter((_, i) => i !== index);
    form.setValue('items', filteredItems);
    calculateTotal();
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

  // معالجة تغيير الفاتورة المحددة
  const handleInvoiceChange = async (invoiceId: string) => {
    if (!invoiceId) {
      return;
    }
    
    form.setValue('invoice_id', invoiceId);
    setSelectedInvoice(invoiceId);
    
    setLoadingInvoiceItems(true);
    try {
      const invoice = await commercialService.getInvoiceById(invoiceId);
      
      if (invoice) {
        if (invoice.party_id) {
          form.setValue('party_id', invoice.party_id);
        }
        
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

  // مراقبة التغييرات في الأصناف لإعادة حساب المبلغ الإجمالي
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items.') || name === 'items') {
        calculateTotal();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* حقل نوع المرتجع */}
        <ReturnFormTypeField 
          form={form} 
          onReturnTypeChange={(type) => {
            form.setValue('invoice_id', undefined);
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
          required={true}
        />
        
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
        removeItem={removeItem}
        toggleItemSelection={toggleItemSelection}
        handleQuantityChange={handleQuantityChange}
      />
    </div>
  );
}
