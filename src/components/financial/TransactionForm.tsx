
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import FinancialService, { Category, Transaction } from '@/services/financial/FinancialService';
import { ArrowLeft, Plus, Save } from 'lucide-react';

// Define schema for form validation
const transactionSchema = z.object({
  date: z.date({
    required_error: "التاريخ مطلوب",
  }),
  type: z.enum(['income', 'expense'], {
    required_error: "نوع المعاملة مطلوب",
  }),
  category_id: z.string({
    required_error: "الفئة مطلوبة",
  }),
  amount: z.coerce.number({
    required_error: "المبلغ مطلوب",
    invalid_type_error: "المبلغ يجب أن يكون رقماً",
  }).positive({
    message: "المبلغ يجب أن يكون أكبر من صفر",
  }),
  payment_method: z.enum(['cash', 'bank', 'other'], {
    required_error: "طريقة الدفع مطلوبة",
  }),
  notes: z.string().optional(),
  reference_id: z.string().optional(),
  reference_type: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const TransactionForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const financialService = FinancialService.getInstance();
  
  // Initialize form with default values
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      type: 'income',
      amount: 0,
      payment_method: 'cash',
      notes: '',
    }
  });
  
  // Watch the transaction type to filter categories
  const transactionType = form.watch('type');
  
  // Load categories and transaction data (if editing)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Load categories
      const categoriesData = await financialService.getCategories();
      setCategories(categoriesData);
      
      // If editing, load transaction data
      if (isEditing && id) {
        const transactions = await financialService.getTransactions();
        const transaction = transactions.find(t => t.id === id);
        
        if (transaction) {
          form.reset({
            date: new Date(transaction.date),
            type: transaction.type,
            category_id: transaction.category_id,
            amount: transaction.amount,
            payment_method: transaction.payment_method as 'cash' | 'bank' | 'other',
            notes: transaction.notes || '',
            reference_id: transaction.reference_id,
            reference_type: transaction.reference_type,
          });
        }
      }
      
      setLoading(false);
    };
    
    loadData();
  }, [isEditing, id]);
  
  // Filter categories based on selected transaction type
  const filteredCategories = categories.filter(
    category => !transactionType || category.type === transactionType
  );
  
  const onSubmit = async (data: TransactionFormValues) => {
    setSubmitting(true);
    
    const transactionData = {
      date: format(data.date, 'yyyy-MM-dd'),
      type: data.type,
      category_id: data.category_id,
      amount: data.amount,
      payment_method: data.payment_method,
      notes: data.notes,
      reference_id: data.reference_id,
      reference_type: data.reference_type,
    };
    
    let success = false;
    
    if (isEditing && id) {
      success = await financialService.updateTransaction(id, transactionData);
    } else {
      const result = await financialService.recordTransaction(transactionData);
      success = !!result;
    }
    
    setSubmitting(false);
    
    if (success) {
      navigate('/financial');
    }
  };
  
  const handleCategoryCreate = () => {
    navigate('/financial/categories/new');
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate('/financial')}>
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة للوحة التحكم
        </Button>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isEditing ? 'تعديل معاملة' : 'معاملة جديدة'}</CardTitle>
          <CardDescription>
            {isEditing 
              ? 'قم بتعديل بيانات المعاملة المالية' 
              : 'قم بإدخال بيانات المعاملة المالية الجديدة'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التاريخ</FormLabel>
                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع المعاملة</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex justify-between items-center">
                        <span>الفئة</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={handleCategoryCreate}
                        >
                          <Plus className="h-3 w-3 ml-1" />
                          فئة جديدة
                        </Button>
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الفئة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCategories.length === 0 ? (
                            <SelectItem value="none" disabled>
                              لا توجد فئات متاحة
                            </SelectItem>
                          ) : (
                            filteredCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        اختر الفئة المناسبة للمعاملة
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
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="أدخل المبلغ"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة الدفع</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر طريقة الدفع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="bank">تحويل بنكي</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Textarea 
                        placeholder="أدخل أي ملاحظات إضافية هنا"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "جاري الحفظ..." : isEditing ? "تعديل المعاملة" : "إضافة المعاملة"}
                <Save className="h-4 w-4 mr-2" />
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionForm;
