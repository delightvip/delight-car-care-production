
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import CashManagementService from '@/services/financial/CashManagementService';
import FinancialBalanceService from '@/services/financial/FinancialBalanceService';

const formSchema = z.object({
  account: z.enum(['cash', 'bank']),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CashWithdrawalForm: React.FC = () => {
  const cashManagementService = CashManagementService.getInstance();
  const financialBalanceService = FinancialBalanceService.getInstance();
  const queryClient = useQueryClient();
  
  const { data: balance } = useQuery({
    queryKey: ['financial-balance'],
    queryFn: () => financialBalanceService.getCurrentBalance(),
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account: 'cash',
      amount: 0,
      notes: '',
    },
  });
  
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      return cashManagementService.withdraw(
        values.account, 
        values.amount, 
        values.notes || 'سحب'
      );
    },
    onSuccess: () => {
      toast.success('تم سحب المبلغ بنجاح');
      form.reset({
        account: 'cash',
        amount: 0,
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['financial-balance'] });
    },
    onError: (error) => {
      console.error('Error withdrawing amount:', error);
      toast.error('حدث خطأ أثناء سحب المبلغ');
    },
  });
  
  const onSubmit = async (values: FormValues) => {
    // التحقق من وجود رصيد كافٍ
    const availableBalance = values.account === 'cash' 
      ? balance?.cash_balance || 0 
      : balance?.bank_balance || 0;
      
    if (values.amount > availableBalance) {
      toast.error(`الرصيد غير كافٍ. الرصيد المتاح: ${availableBalance.toLocaleString('ar-EG')} جنيه`);
      return;
    }
    
    mutation.mutate(values);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="account"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الحساب</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cash">الخزينة النقدية</SelectItem>
                  <SelectItem value="bank">الحساب البنكي</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>المبلغ</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ملاحظات</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="أدخل ملاحظات (اختياري)" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'جاري السحب...' : 'سحب'}
        </Button>
      </form>
    </Form>
  );
};

export default CashWithdrawalForm;
