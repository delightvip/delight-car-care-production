
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Party } from '@/services/PartyService';

// Define the form schema for party data
const partyFormSchema = z.object({
  name: z.string().min(1, { message: 'الاسم مطلوب' }),
  type: z.enum(['customer', 'supplier', 'other'], {
    required_error: 'يرجى اختيار نوع الطرف التجاري',
  }),
  phone: z.string().optional(),
  email: z.string().email({ message: 'يرجى إدخال بريد إلكتروني صالح' }).optional().or(z.literal('')),
  address: z.string().optional(),
  balance_type: z.enum(['debit', 'credit'], {
    required_error: 'يرجى اختيار نوع الرصيد',
  }).optional(),
  opening_balance: z.number().optional(),
  notes: z.string().optional(),
  code: z.string().optional(),
});

type PartyFormValues = z.infer<typeof partyFormSchema>;

interface PartyFormProps {
  initialData?: Party;
  onSubmit: (data: Omit<Party, 'id' | 'balance' | 'created_at'>) => void;
  isEditing?: boolean;
}

export function PartyForm({ initialData, onSubmit, isEditing = false }: PartyFormProps) {
  // تكوين نموذج React Hook Form باستخدام Zod للتحقق
  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partyFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'customer',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      address: initialData?.address || '',
      balance_type: initialData?.balance_type as 'debit' | 'credit' || 'debit',
      opening_balance: initialData?.opening_balance || 0,
      notes: initialData?.notes || '',
      code: initialData?.code || '',
    },
  });

  const { isSubmitting } = form.formState;

  // عند تقديم النموذج
  function handleSubmit(values: PartyFormValues) {
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          {/* اسم الطرف التجاري */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل اسم الطرف التجاري" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* نوع الطرف التجاري */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>النوع</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-row space-x-4 rtl:space-x-reverse"
                  >
                    <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                      <FormControl>
                        <RadioGroupItem value="customer" />
                      </FormControl>
                      <FormLabel className="font-normal">عميل</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                      <FormControl>
                        <RadioGroupItem value="supplier" />
                      </FormControl>
                      <FormLabel className="font-normal">مورّد</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                      <FormControl>
                        <RadioGroupItem value="other" />
                      </FormControl>
                      <FormLabel className="font-normal">أخرى</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* معلومات الاتصال */}
          <div className="grid md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل رقم الهاتف" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="أدخل البريد الإلكتروني" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* العنوان والرصيد الافتتاحي */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العنوان</FormLabel>
                <FormControl>
                  <Textarea placeholder="أدخل العنوان" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditing && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="opening_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الرصيد الافتتاحي</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="balance_type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>نوع الرصيد</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row space-x-4 rtl:space-x-reverse"
                        >
                          <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                            <FormControl>
                              <RadioGroupItem value="debit" />
                            </FormControl>
                            <FormLabel className="font-normal">مدين</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                            <FormControl>
                              <RadioGroupItem value="credit" />
                            </FormControl>
                            <FormLabel className="font-normal">دائن</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* ملاحظات إضافية */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ملاحظات</FormLabel>
                <FormControl>
                  <Textarea placeholder="أي ملاحظات إضافية..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* كود الطرف التجاري */}
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الكود (اختياري)</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل كود الطرف التجاري" {...field} />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  يمكنك إضافة كود مخصص للطرف التجاري للرجوع إليه لاحقًا
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'تحديث' : 'إضافة'}
        </Button>
      </form>
    </Form>
  );
}
