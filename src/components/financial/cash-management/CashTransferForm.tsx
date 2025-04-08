
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
import { CalendarIcon, Banknote, CreditCard, ArrowLeftRight } from 'lucide-react';
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
  fromAccount: z.enum(['cash', 'bank']),
  toAccount: z.enum(['cash', 'bank']),
  date: z.date(),
  notes: z.string().optional(),
  reference: z.string().optional(),
}).refine(data => data.fromAccount !== data.toAccount, {
  message: "لا يمكن التحويل من وإلى نفس الحساب",
  path: ["toAccount"],
});

interface CashTransferFormProps {
  onSuccess: () => void;
}

const CashTransferForm: React.FC<CashTransferFormProps> = ({ onSuccess }) => {
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
      fromAccount: 'cash',
      toAccount: 'bank',
      date: new Date(),
      notes: '',
      reference: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const amount = parseFloat(values.amount);
      
      // التحقق من كفاية الرصيد في الحساب المحول منه
      if (values.fromAccount === 'cash' && balance?.cash_balance && amount > balance.cash_balance) {
        toast.error('لا يوجد رصيد كافي في الخزينة النقدية');
        return;
      }
      
      if (values.fromAccount === 'bank' && balance?.bank_balance && amount > balance.bank_balance) {
        toast.error('لا يوجد رصيد كافي في الحساب البنكي');
        return;
      }
      
      await cashManagementService.transferBetweenAccounts(
        amount,
        values.fromAccount,
        values.toAccount,
        values.date,
        values.notes || '',
        values.reference || ''
      );
      
      toast.success('تم تحويل المبلغ بنجاح');
      form.reset({
        amount: '',
        fromAccount: 'cash',
        toAccount: 'bank',
        date: new Date(),
        notes: '',
        reference: '',
      });
      
      onSuccess();
    } catch (error) {
      console.error('خطأ في عملية التحويل:', error);
      toast.error('حدث خطأ أثناء تحويل المبلغ');
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg">تحويل بين الحسابات</CardTitle>
        <CardDescription>تحويل مبلغ بين الخزينة النقدية والحساب البنكي</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>من حساب</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب المصدر" />
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
              
              <FormField
                control={form.control}
                name="toAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>إلى حساب</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب الهدف" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center">
                            <Banknote className="h-4 w-4 ml-2" />
                            <span>الخزينة النقدية</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="bank">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 ml-2" />
                            <span>الحساب البنكي</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-center my-2">
              <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
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
                      رقم الإيصال أو المرجع الخاص بعملية التحويل (اختياري)
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
            
            <Button type="submit" className="w-full">تحويل المبلغ</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CashTransferForm;
