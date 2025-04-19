import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { ReturnFormValues } from '@/types/returns';

interface ReturnFormPartyFieldProps {
  form: UseFormReturn<ReturnFormValues>;
  returnType: string;
  filteredParties: any[];
  onPartyChange: (partyId: string) => void;
}

export default function ReturnFormPartyField({ 
  form, 
  returnType, 
  filteredParties, 
  onPartyChange 
}: ReturnFormPartyFieldProps) {
  const [search, setSearch] = React.useState('');
  const filtered = React.useMemo(() => {
    if (!search) return filteredParties;
    return filteredParties.filter(party =>
      party.name && party.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [filteredParties, search]);

  return (
    <FormField
      control={form.control}
      name="party_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="after:content-['*'] after:ml-0.5 after:text-red-500">
            {returnType === 'sales_return' ? 'العميل' : 'المورد'}
          </FormLabel>
          <Input
            placeholder={`بحث باسم ${returnType === 'sales_return' ? 'العميل' : 'المورد'}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-2"
          />
          <Select 
            onValueChange={onPartyChange}
            value={field.value || "no_party"}
          >
            <FormControl>
              <SelectTrigger className={form.formState.errors.party_id ? 'border-red-500' : ''}>
                <SelectValue placeholder={`اختر ${returnType === 'sales_return' ? 'العميل' : 'المورد'}`} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="no_party">غير محدد</SelectItem>
              {filtered.map((party) => (
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
