
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { ReturnFormValues } from '@/types/returns';

interface ReturnFormTypeFieldProps {
  form: UseFormReturn<ReturnFormValues>;
  onReturnTypeChange: (value: string) => void;
}

export default function ReturnFormTypeField({ form, onReturnTypeChange }: ReturnFormTypeFieldProps) {
  return (
    <FormField
      control={form.control}
      name="return_type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>نوع المرتجع</FormLabel>
          <Select 
            onValueChange={(value) => {
              field.onChange(value);
              onReturnTypeChange(value);
            }}
            defaultValue={field.value}
            value={field.value}
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
          <FormDescription>
            حدد نوع المرتجع سواء كان مرتجع مبيعات (من العميل) أو مرتجع مشتريات (للمورد)
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
