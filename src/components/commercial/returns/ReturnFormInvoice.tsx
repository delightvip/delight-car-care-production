
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { ReturnFormValues } from './ReturnFormTypes';

interface ReturnFormInvoiceProps {
  form: UseFormReturn<ReturnFormValues>;
  isLoadingInvoices: boolean;
  loadingInvoiceItems: boolean;
  filteredInvoices: any[];
  onInvoiceChange: (invoiceId: string) => void;
}

export function ReturnFormInvoice({ 
  form, 
  isLoadingInvoices, 
  loadingInvoiceItems, 
  filteredInvoices, 
  onInvoiceChange 
}: ReturnFormInvoiceProps) {
  return (
    <FormField
      control={form.control}
      name="invoice_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>رقم الفاتورة (اختياري)</FormLabel>
          <Select 
            onValueChange={onInvoiceChange} 
            value={field.value || "no_invoice"}
            disabled={isLoadingInvoices || loadingInvoiceItems}
          >
            <FormControl>
              <SelectTrigger>
                {isLoadingInvoices || loadingInvoiceItems ? (
                  <div className="flex items-center justify-center w-full">
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    <span>جاري التحميل...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="اختر الفاتورة المرتبطة" />
                )}
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="no_invoice">بدون فاتورة</SelectItem>
              {filteredInvoices.map((invoice) => (
                <SelectItem key={invoice.id} value={invoice.id}>
                  {`${invoice.id.substring(0, 8)}... - ${invoice.party_name || 'غير محدد'} - ${invoice.total_amount}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            يمكنك ربط المرتجع بفاتورة محددة لتسهيل عملية إرجاع الأصناف
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
