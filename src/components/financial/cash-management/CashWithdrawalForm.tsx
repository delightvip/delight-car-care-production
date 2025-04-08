
import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CalendarIcon, Banknote, CreditCard } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import CashManagementService from '@/services/financial/CashManagementService';
import { useQuery } from '@tanstack/react-query';
import FinancialBalanceService from '@/services/financial/FinancialBalanceService';

const formSchema = z.object({
  amount: z.string().min(1, 'المبلغ مطلوب').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'يجب أن يكون المبلغ أكبر من صفر'),
  accountType: z.enum(['cash', 'bank']),
  date: z.date(),
  notes: z.string().optional(),
  reference: z.string().optional(),
});

interface CashWithdrawalFormProps {
  onSuccess: () => void;
}

const CashWithdrawalForm: React.FC<CashWithdrawalFormProps> = ({ onSuccess }) => {
  const cashManagementService = CashManagementService.getInstance();
  const financialBalanceService = FinancialBalanceService.getInstance();
  
  const { data: balance } = useQuery({
    queryKey: ['financial-balance'],
    queryFn: () => financialBalanceService.getCurrentBalance(),
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '',
      accountType: 'cash',
      date: new Date(),
      notes: '',
      reference: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const amount = parseFloat(values.amount);
      
      // التحقق من كفاية الرصيد
      if (values.accountType === 'cash' && balance?.cash_balance && amount > balance.cash_balance) {
        toast.error('لا يوجد رصيد كافي في الخزينة النقدية');
        return;
      }
      
      if (values.accountType === 'bank' && balance?.bank_balance && amount > balance.bank_balance) {
        toast.error('لا يوجد رصيد كافي في الحساب البنكي');
        return;
      }
      
      await cashManagementService.withdrawFromAccount(
        amount,
        values.accountType,
        values.date,
        values.notes || '',
        values.reference || ''
      );
      
      toast.success('تم سحب المبلغ بنجاح');
      form.reset({
        amount: '',
        accountType: 'cash',
        date: new Date(),
        notes: '',
        reference: '',
      });
      
      onSuccess();
    } catch (error) {
      console.error('خطأ في عملية السحب:', error);
      toast.error('حدث خطأ أثناء سحب المبلغ');
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg">سحب مبلغ من الخزينة</CardTitle>
        <CardDescription>سحب مبلغ من الخزينة النقدية أو الحساب البنكي</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="أدخل المبلغ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الحساب</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الحساب" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center">
                            <Banknote className="h-4 w-4 ml-2" />
                            <span>الخزينة النقدية (الرصيد: {balance?.cash_balance?.toLocaleString('ar-EG') || '0'} ج.م)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="bank">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 ml-2" />
                            <span>الحساب البنكي (الرصيد: {balance?.bank_balance?.toLocaleString('ar-EG') || '0'} ج.م)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>التاريخ</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "yyyy-MM-dd", { locale: ar })
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم المرجع</FormLabel>
                    <FormControl>
                      <Input placeholder="رقم الإيصال أو المرجع" {...field} />
                    </FormControl>
                    <FormDescription>
                      رقم الإيصال أو المرجع الخاص بعملية السحب (اختياري)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea placeholder="أدخل أي ملاحظات إضافية" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">سحب المبلغ</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CashWithdrawalForm;
