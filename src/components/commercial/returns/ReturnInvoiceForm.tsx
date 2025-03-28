
import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ReturnFormValues } from '@/types/returns';
import ReturnFormTypeField from './fields/ReturnFormTypeField';
import ReturnFormInvoiceField from './fields/ReturnFormInvoiceField';
import ReturnFormDateField from './fields/ReturnFormDateField';
import ReturnFormNotesField from './fields/ReturnFormNotesField';
import ReturnItemsList from './ReturnItemsList';
import { useReturnInvoiceForm } from '@/hooks/commercial/useReturnInvoiceForm';

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
  const {
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
  } = useReturnInvoiceForm(form);

  // مراقبة التغييرات في الأصناف لإعادة حساب المبلغ الإجمالي
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items.') || name === 'items') {
        calculateTotal();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, calculateTotal]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* حقل نوع المرتجع */}
        <ReturnFormTypeField 
          form={form} 
          onReturnTypeChange={(type) => {
            form.setValue('invoice_id', undefined);
            form.setValue('items', []);
            setSelectedItemType('finished_products');
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
