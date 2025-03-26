
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { ReturnFormValues } from './ReturnFormTypes';

interface ReturnFormPartyProps {
  form: UseFormReturn<ReturnFormValues>;
  returnType: string;
  filteredParties: any[];
  onPartyChange: (partyId: string) => void;
}

export function ReturnFormParty({ 
  form, 
  returnType, 
  filteredParties, 
  onPartyChange 
}: ReturnFormPartyProps) {
  return (
    <FormField
      control={form.control}
      name="party_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{returnType === 'sales_return' ? 'العميل' : 'المورد'}</FormLabel>
          <Select 
            onValueChange={onPartyChange} 
            value={field.value || "no_party"}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={`اختر ${returnType === 'sales_return' ? 'العميل' : 'المورد'}`} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="no_party">غير محدد</SelectItem>
              {filteredParties.map((party) => (
                <SelectItem key={party.id} value={party.id}>
                  {party.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            {returnType === 'sales_return' 
              ? 'حدد العميل الذي أرجع البضاعة' 
              : 'حدد المورد الذي سيتم إرجاع البضاعة إليه'}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
