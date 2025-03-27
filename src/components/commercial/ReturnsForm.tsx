
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import CommercialService, { Return } from '@/services/CommercialService';
import InventoryService from '@/services/InventoryService';
import PartyService from '@/services/PartyService';
import { toast } from 'sonner';
import { ReturnFormHeader } from './returns/ReturnFormHeader';
import { ReturnFormInvoice } from './returns/ReturnFormInvoice';
import { ReturnFormParty } from './returns/ReturnFormParty';
import { ReturnFormDetails } from './returns/ReturnFormDetails';
import ReturnItemsSection from './returns/ReturnItemsSection';
import { returnFormSchema, ReturnFormValues } from './returns/ReturnFormTypes';

interface ReturnsFormProps {
  onSubmit: (data: Omit<Return, 'id' | 'created_at'>) => void;
  initialData?: Return;
}

export function ReturnsForm({ onSubmit, initialData }: ReturnsFormProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string>('finished_products');
  const [loadingInvoiceItems, setLoadingInvoiceItems] = useState<boolean>(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  
  const commercialService = CommercialService.getInstance();
  const partyService = PartyService.getInstance();
  
  const defaultValues: ReturnFormValues = initialData 
    ? {
        ...initialData,
        date: initialData.date ? new Date(initialData.date) : new Date(),
        items: initialData.items || []
      }
    : {
        return_type: 'sales_return',
        date: new Date(),
        amount: 0,
        notes: '',
        items: []
      };
  
  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues
  });

  const returnType = form.watch('return_type');
  const selectedItems = form.watch('items');

  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => commercialService.getInvoices(),
  });

  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
  });

  const { data: inventoryItems, isLoading: isLoadingInventoryItems } = useQuery({
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

  const handleReturnTypeChange = (value: string) => {
    form.setValue('invoice_id', undefined);
    form.setValue('party_id', undefined);
    form.setValue('items', []);
    setSelectedInvoice(null);
    setInvoiceItems([]);
  };

  const handleInvoiceChange = async (invoiceId: string) => {
    form.setValue('invoice_id', invoiceId === 'no_invoice' ? undefined : invoiceId);
    setSelectedInvoice(invoiceId === 'no_invoice' ? null : invoiceId);
    
    if (invoiceId !== 'no_invoice') {
      setLoadingInvoiceItems(true);
      try {
        const invoice = await commercialService.getInvoiceById(invoiceId);
        
        if (invoice) {
          form.setValue('party_id', invoice.party_id || undefined);
          
          form.setValue('items', []);
          
          if (invoice.items && invoice.items.length > 0) {
            const returnItems = invoice.items.map(item => ({
              item_id: Number(item.item_id),
              item_type: item.item_type,
              item_name: item.item_name,
              quantity: 0,
              unit_price: item.unit_price,
              selected: false,
              max_quantity: item.quantity,
              invoice_quantity: item.quantity
            }));
            
            form.setValue('items', returnItems);
            setInvoiceItems(invoice.items);
            calculateTotal();
            
            toast.success('تم جلب أصناف الفاتورة بنجاح');
          } else {
            toast.info('لا توجد أصناف في الفاتورة المحددة');
          }
        }
      } catch (error) {
        console.error('Error fetching invoice details:', error);
        toast.error('حدث خطأ أثناء جلب تفاصيل الفاتورة');
      } finally {
        setLoadingInvoiceItems(false);
      }
    } else {
      form.setValue('party_id', undefined);
      form.setValue('items', []);
      setInvoiceItems([]);
    }
  };

  const handlePartyChange = (partyId: string) => {
    form.setValue('party_id', partyId === 'no_party' ? undefined : partyId);
  };

  const calculateTotal = () => {
    const items = form.getValues('items');
    if (items && items.length > 0) {
      const total = items.reduce((sum, item) => {
        return sum + (item.selected ? (item.quantity * item.unit_price) : 0);
      }, 0);
      form.setValue('amount', total);
      console.log('Calculated total amount:', total);
    } else {
      form.setValue('amount', 0);
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
        item_type: selectedItemType as 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products', 
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
    
    if (!selected) {
      updatedItems[index].quantity = 0;
    }
    
    form.setValue('items', updatedItems);
    calculateTotal();
  };

  const handleQuantityChange = (index: number, value: string) => {
    const parsedValue = parseFloat(value) || 0;
    const items = form.getValues('items');
    const item = items[index];
    
    const maxQty = item.max_quantity || Number.MAX_VALUE;
    const validatedQuantity = Math.min(parsedValue, maxQty);
    
    form.setValue(`items.${index}.quantity`, validatedQuantity);
    
    if (validatedQuantity > 0 && !item.selected) {
      toggleItemSelection(index, true);
    }
    
    calculateTotal();
  };

  const handleSubmitForm = async (values: ReturnFormValues) => {
    try {
      console.log('Form values before submission:', values);
      
      const selectedItems = values.items.filter(item => item.selected && item.quantity > 0);
      
      if (selectedItems.length === 0) {
        toast.error('يجب اختيار صنف واحد على الأقل وتحديد كمية له');
        return;
      }
      
      const returnData: Omit<Return, 'id' | 'created_at'> = {
        return_type: values.return_type,
        invoice_id: values.invoice_id,
        party_id: values.party_id,
        date: format(values.date, 'yyyy-MM-dd'),
        amount: values.amount,
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

      console.log('Submitting return data:', returnData);
      
      onSubmit(returnData);
    } catch (error) {
      console.error('Error submitting return form:', error);
      toast.error('حدث خطأ أثناء معالجة النموذج');
    }
  };

  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter(inv => 
      returnType === 'sales_return' 
        ? inv.invoice_type === 'sale' 
        : inv.invoice_type === 'purchase'
    );
  }, [invoices, returnType]);

  const filteredParties = React.useMemo(() => {
    if (!parties) return [];
    
    return parties.filter(party => 
      returnType === 'sales_return' 
        ? party.type === 'customer' 
        : party.type === 'supplier'
    );
  }, [parties, returnType]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReturnFormHeader form={form} onReturnTypeChange={handleReturnTypeChange} />

          <ReturnFormInvoice 
            form={form} 
            isLoadingInvoices={isLoadingInvoices}
            loadingInvoiceItems={loadingInvoiceItems}
            filteredInvoices={filteredInvoices}
            onInvoiceChange={handleInvoiceChange}
          />

          {!selectedInvoice && (
            <ReturnFormParty 
              form={form} 
              returnType={returnType}
              filteredParties={filteredParties}
              onPartyChange={handlePartyChange}
            />
          )}

          <ReturnFormDetails form={form} />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ملاحظات</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ReturnItemsSection
          form={form}
          selectedInvoice={selectedInvoice}
          selectedItemType={selectedItemType}
          loadingInvoiceItems={loadingInvoiceItems}
          isLoadingInventoryItems={isLoadingInventoryItems}
          inventoryItems={inventoryItems || []}
          setSelectedItemType={setSelectedItemType}
          addItem={addItem}
          removeItem={removeItem}
          toggleItemSelection={toggleItemSelection}
          handleQuantityChange={handleQuantityChange}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={loadingInvoiceItems || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            حفظ المرتجع
          </Button>
        </div>
      </form>
    </Form>
  );
}
