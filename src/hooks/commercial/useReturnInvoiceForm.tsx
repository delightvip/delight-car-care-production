
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UseFormReturn } from 'react-hook-form';
import { ReturnFormValues } from '@/types/returns';
import CommercialService from '@/services/CommercialService';

export const useReturnInvoiceForm = (form: UseFormReturn<ReturnFormValues>) => {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(form.getValues('invoice_id') || null);
  const [selectedItemType, setSelectedItemType] = useState<string>('finished_products');
  const [loadingInvoiceItems, setLoadingInvoiceItems] = useState<boolean>(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoadingInventoryItems, setIsLoadingInventoryItems] = useState<boolean>(false);

  const commercialService = CommercialService.getInstance();

  // حساب المبلغ الإجمالي للمرتجع
  const calculateTotal = useCallback(() => {
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
  }, [form]);

  // تغيير كمية الصنف
  const handleQuantityChange = useCallback((index: number, value: string) => {
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
  }, [form, calculateTotal]);

  // تغيير حالة اختيار الصنف
  const toggleItemSelection = useCallback((index: number, selected: boolean) => {
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
  }, [form, calculateTotal]);

  // حذف صنف
  const removeItem = useCallback((index: number) => {
    const currentItems = form.getValues('items');
    const filteredItems = currentItems.filter((_, i) => i !== index);
    form.setValue('items', filteredItems);
    calculateTotal();
  }, [form, calculateTotal]);

  // معالجة تغيير الفاتورة المحددة
  const handleInvoiceChange = useCallback(async (invoiceId: string) => {
    if (!invoiceId) {
      return;
    }
    
    form.setValue('invoice_id', invoiceId);
    setSelectedInvoice(invoiceId);
    
    setLoadingInvoiceItems(true);
    try {
      const invoice = await commercialService.getInvoiceById(invoiceId);
      
      if (invoice) {
        console.log("Invoice loaded:", invoice);
        
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
  }, [form, commercialService, calculateTotal]);

  return {
    selectedInvoice,
    selectedItemType,
    loadingInvoiceItems,
    inventoryItems,
    isLoadingInventoryItems,
    handleInvoiceChange,
    setSelectedItemType,
    handleQuantityChange,
    toggleItemSelection,
    removeItem,
    calculateTotal
  };
};
