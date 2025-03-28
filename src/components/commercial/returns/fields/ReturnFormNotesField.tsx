
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { UseFormReturn } from 'react-hook-form';
import { ReturnFormValues } from '@/types/returns';

interface ReturnFormNotesFieldProps {
  form: UseFormReturn<ReturnFormValues>;
}

export default function ReturnFormNotesField({ form }: ReturnFormNotesFieldProps) {
  return (
    <FormField
      control={form.control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>ملاحظات</FormLabel>
          <FormControl>
            <Textarea 
              rows={3} 
              placeholder="أدخل أي ملاحظات إضافية عن المرتجع"
              {...field} 
              value={field.value || ''} 
            />
          </FormControl>
          <FormDescription>
            يمكنك إضافة أي معلومات إضافية عن المرتجع هنا
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
