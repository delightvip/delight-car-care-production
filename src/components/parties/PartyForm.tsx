import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Party } from '@/services/PartyService';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

const partyFormSchema = z.object({
  name: z.string().min(2, {
    message: 'يجب أن يحتوي الاسم على حرفين على الأقل',
  }),
  type: z.enum(['customer', 'supplier', 'other'], {
    required_error: 'الرجاء اختيار نوع الطرف',
  }),
  phone: z.string().optional(),
  email: z.string().email({
    message: 'يرجى إدخال بريد إلكتروني صحيح',
  }).optional().or(z.literal('')),
  address: z.string().optional(),
  opening_balance: z.number().default(0),
  balance_type: z.enum(['credit', 'debit']).default('debit'),
});

type PartyFormValues = z.infer<typeof partyFormSchema>;

interface PartyFormProps {
  onSubmit: (data: PartyFormValues) => void;
  initialData?: Partial<Party>;
  isEditing?: boolean;
}

export function PartyForm({ onSubmit, initialData, isEditing = false }: PartyFormProps) {
  const form = useForm<PartyFormValues>({
    resolver: zodResolver(partyFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: (initialData?.type as any) || 'customer',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      address: initialData?.address || '',
      opening_balance: initialData?.opening_balance || 0,
      balance_type: (initialData?.balance_type as any) || 'debit',
    },
  });

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-4">
        <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full p-2">
          <Plus className="h-6 w-6" />
        </span>
        <CardTitle className="text-2xl font-bold text-primary-700 dark:text-primary-300 tracking-tight">
          {isEditing ? 'تعديل بيانات الطرف' : 'إضافة طرف جديد'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="اسم الطرف" {...field} className="rounded-lg border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-primary-200" />
                    </FormControl>
                    <span className="text-xs text-muted-foreground">أدخل الاسم الكامل للطرف.</span>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>النوع <span className="text-red-500">*</span></FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-primary-200">
                          <SelectValue placeholder="اختر نوع الطرف" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">عميل</SelectItem>
                        <SelectItem value="supplier">مورّد</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">حدد نوع الطرف التجاري.</span>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input placeholder="رقم الهاتف" {...field} className="rounded-lg border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-primary-200" />
                    </FormControl>
                    <span className="text-xs text-muted-foreground">اختياري: رقم للتواصل مع الطرف.</span>
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
                      <Input type="email" placeholder="البريد الإلكتروني" {...field} className="rounded-lg border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-primary-200" />
                    </FormControl>
                    <span className="text-xs text-muted-foreground">اختياري: البريد الإلكتروني للطرف.</span>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={isEditing}
                        className="rounded-lg border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-primary-200"
                      />
                    </FormControl>
                    <span className="text-xs text-muted-foreground">اختياري: الرصيد عند إضافة الطرف لأول مرة.</span>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="balance_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الرصيد</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-primary-200">
                          <SelectValue placeholder="نوع الرصيد" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="debit">مدين (له)</SelectItem>
                        <SelectItem value="credit">دائن (عليه)</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">حدد إذا كان الرصيد مدين أم دائن.</span>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان</FormLabel>
                  <FormControl>
                    <Textarea placeholder="العنوان" {...field} className="rounded-lg border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-primary-200" />
                  </FormControl>
                  <span className="text-xs text-muted-foreground">اختياري: العنوان التفصيلي للطرف.</span>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CardFooter className="px-0 pt-8 flex justify-between">
              <Button variant="outline" type="button" onClick={() => form.reset()} className="rounded-lg">
                <span className="mr-1">↺</span> إعادة تعيين
              </Button>
              <Button
                type="submit"
                className="rounded-lg bg-green-200 hover:bg-green-300 text-green-900 font-bold shadow border-2 border-green-300 focus:ring-2 focus:ring-green-100 focus:border-green-400"
                style={{ backgroundColor: '#bbf7d0', color: '#166534', borderColor: '#86efac' }}
              >
                <span className="mr-1">{isEditing ? '💾' : '➕'}</span> {isEditing ? 'تحديث' : 'إضافة'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
