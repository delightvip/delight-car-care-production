
import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import FinancialService from '@/services/financial/FinancialService';
import { Category, Transaction } from '@/services/financial/FinancialTypes';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"], {
    required_error: "الرجاء اختيار نوع المعاملة",
  }),
  category_id: z.string({
    required_error: "الرجاء اختيار فئة المعاملة",
  }),
  date: z.date({
    required_error: "الرجاء تحديد تاريخ المعاملة",
  }),
  amount: z.coerce.number({
    required_error: "الرجاء إدخال المبلغ",
    invalid_type_error: "الرجاء إدخال قيمة صحيحة",
  }).positive({ message: "يجب أن يكون المبلغ أكبر من صفر" }),
  payment_method: z.enum(["cash", "bank", "other"], {
    required_error: "الرجاء اختيار طريقة الدفع",
  }),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  initialData?: Partial<Transaction>;
  isEditing?: boolean;
  onSuccessfulSubmit?: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  initialData, 
  isEditing = false,
  onSuccessfulSubmit
}) => {
  const navigate = useNavigate();
  const financialService = FinancialService.getInstance();
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(initialData?.type || 'income');
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', transactionType],
    queryFn: () => financialService.getCategories(transactionType),
  });
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: (initialData?.type as 'income' | 'expense') || 'income',
      category_id: initialData?.category_id || '',
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      amount: initialData?.amount || 0,
      payment_method: (initialData?.payment_method as 'cash' | 'bank' | 'other') || 'cash',
      notes: initialData?.notes || '',
    },
  });
  
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'type' && value.type) {
        setTransactionType(value.type as 'income' | 'expense');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  const onSubmit = async (data: TransactionFormValues) => {
    try {
      let result;
      
      if (isEditing && initialData?.id) {
        // تحديث معاملة موجودة
        const updateData: Partial<Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'>> = {
          type: data.type,
          amount: data.amount,
          category_id: data.category_id,
          date: format(data.date, 'yyyy-MM-dd'), // Convert Date to string format
          payment_method: data.payment_method,
          notes: data.notes
        };
        
        result = await financialService.updateTransaction(initialData.id, updateData);
        if (result) {
          toast.success('تم تحديث المعاملة المالية بنجاح');
          if (onSuccessfulSubmit) {
            onSuccessfulSubmit();
          } else {
            navigate('/financial');
          }
        }
      } else {
        // إنشاء معاملة جديدة
        const newTransaction: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'> = {
          type: data.type,
          amount: data.amount,
          category_id: data.category_id,
          date: format(data.date, 'yyyy-MM-dd'), // Convert Date to string format
          payment_method: data.payment_method,
          notes: data.notes || '',
          reference_id: undefined,
          reference_type: undefined
        };
        
        result = await financialService.createTransaction(newTransaction);
        if (result) {
          toast.success('تم إنشاء المعاملة المالية بنجاح');
          form.reset();
          if (onSuccessfulSubmit) {
            onSuccessfulSubmit();
          }
        }
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
      toast.error('حدث خطأ أثناء حفظ المعاملة المالية');
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? 'تعديل المعاملة المالية' : 'تسجيل معاملة مالية جديدة'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المعاملة</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع المعاملة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">إيراد</SelectItem>
                        <SelectItem value="expense">مصروف</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      حدد ما إذا كانت هذه المعاملة إيرادًا أو مصروفًا
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>التاريخ</FormLabel>
                    <DatePicker
                      selected={field.value}
                      onSelect={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الفئة</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          {isLoadingCategories ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <SelectValue placeholder="اختر فئة المعاملة" />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      اختر الفئة المناسبة للمعاملة المالية
                    </FormDescription>
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
                      <Input type="number" step="0.01" placeholder="أدخل المبلغ" {...field} />
                    </FormControl>
                    <FormDescription>
                      أدخل مبلغ المعاملة بالجنيه المصري
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة الدفع</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر طريقة الدفع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="bank">بنكي</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      حدد طريقة الدفع لهذه المعاملة
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
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="أدخل أي ملاحظات إضافية" {...field} />
                  </FormControl>
                  <FormDescription>
                    يمكنك إضافة أي معلومات إضافية عن المعاملة ��نا
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <CardFooter className="px-0 pt-6 flex justify-between">
              <Button variant="outline" type="button" onClick={() => navigate('/financial')}>
                إلغاء
              </Button>
              <Button type="submit">
                {isEditing ? 'تحديث المعاملة' : 'تسجيل المعاملة'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TransactionForm;
