import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { ReturnFormValues } from '@/types/returns';
import { Input } from '@/components/ui/input';

interface ReturnFormInvoiceFieldProps {
  form: UseFormReturn<ReturnFormValues>;
  filteredInvoices: any[];
  isLoadingInvoices: boolean;
  loadingInvoiceItems: boolean;
  onInvoiceChange: (invoiceId: string) => void;
  required?: boolean;
}

export default function ReturnFormInvoiceField({ 
  form, 
  filteredInvoices, 
  isLoadingInvoices, 
  loadingInvoiceItems, 
  onInvoiceChange,
  required = false
}: ReturnFormInvoiceFieldProps) {
  const [search, setSearch] = React.useState('');
  const filtered = React.useMemo(() => {
    if (!search) return filteredInvoices;
    return filteredInvoices.filter(inv =>
      (inv.id && inv.id.toLowerCase().includes(search.toLowerCase())) ||
      (inv.party_name && inv.party_name.toLowerCase().includes(search.toLowerCase()))
    );
  }, [filteredInvoices, search]);

  return (
    <FormField
      control={form.control}
      name="invoice_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
            رقم الفاتورة
          </FormLabel>
          <Input
            placeholder="بحث برقم الفاتورة أو اسم الطرف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2"
          />
          <Select 
            onValueChange={onInvoiceChange} 
            value={field.value || "none"}
            disabled={isLoadingInvoices || loadingInvoiceItems}
          >
            <FormControl>
              <SelectTrigger className={form.formState.errors.invoice_id ? 'border-red-500' : ''}>
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
              {filtered.map((invoice) => (
                <SelectItem key={invoice.id} value={invoice.id}>
                  {`${invoice.id.substring(0, 8)}... - ${invoice.party_name || 'غير محدد'} - ${invoice.total_amount}`}
                </SelectItem>
              ))}
              {filtered.length === 0 && (
                <SelectItem value="no-invoices" disabled>
                  لا توجد فواتير متاحة
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <FormDescription>
            اختر الفاتورة المرتبطة بالمرتجع لجلب أصنافها تلقائيًا
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
