
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction, Category } from '@/services/financial/FinancialService';
import FinancialService from '@/services/financial/FinancialService';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from 'lucide-react';

type TransactionFormData = Omit<Transaction, 'id' | 'created_at' | 'category_name'>;

const TransactionForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  
  const financialService = FinancialService.getInstance();
  
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<TransactionFormData>({
    defaultValues: {
      type: 'income',
      payment_method: 'cash'
    }
  });
  
  const transactionType = watch('type');
  
  useEffect(() => {
    loadCategories();
    
    if (isEditMode) {
      loadTransaction();
    }
  }, [isEditMode, id]);
  
  const loadCategories = async () => {
    try {
      const data = await financialService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('حدث خطأ أثناء تحميل فئات المعاملات');
    }
  };
  
  const loadTransaction = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const transactions = await financialService.getTransactions();
      const transaction = transactions.find(t => t.id === id);
      
      if (transaction) {
        reset({
          date: transaction.date,
          type: transaction.type,
          category_id: transaction.category_id,
          amount: transaction.amount,
          payment_method: transaction.payment_method,
          notes: transaction.notes || '',
          reference_id: transaction.reference_id,
          reference_type: transaction.reference_type
        });
        
        setDate(new Date(transaction.date));
      } else {
        toast.error('المعاملة غير موجودة');
        navigate('/financial');
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
      toast.error('حدث خطأ أثناء تحميل المعاملة');
    } finally {
      setLoading(false);
    }
  };
  
  const onSubmit = async (data: TransactionFormData) => {
    setLoading(true);
    
    try {
      if (isEditMode) {
        if (!id) return;
        
        const updated = await financialService.updateTransaction(id, data);
        if (updated) {
          toast.success('تم تحديث المعاملة بنجاح');
          navigate('/financial');
        } else {
          toast.error('حدث خطأ أثناء تحديث المعاملة');
        }
      } else {
        const created = await financialService.createTransaction(data);
        if (created) {
          toast.success('تم إنشاء المعاملة بنجاح');
          navigate('/financial');
        } else {
          toast.error('حدث خطأ أثناء إنشاء المعاملة');
        }
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('حدث خطأ أثناء حفظ المعاملة');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setValue('date', format(newDate, 'yyyy-MM-dd'));
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/financial')}>
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة للوحة التحكم
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'تعديل معاملة مالية' : 'إضافة معاملة مالية جديدة'}</CardTitle>
          <CardDescription>
            {isEditMode 
              ? 'قم بتعديل بيانات المعاملة المالية' 
              : 'قم بإدخال بيانات المعاملة المالية الجديدة'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">نوع المعاملة</Label>
                  <Select 
                    defaultValue={transactionType} 
                    onValueChange={(value) => setValue('type', value as 'income' | 'expense')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المعاملة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">إيراد</SelectItem>
                      <SelectItem value="expense">مصروف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category_id">الفئة</Label>
                  <Select 
                    defaultValue="" 
                    onValueChange={(value) => setValue('category_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(category => category.type === transactionType)
                        .map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && (
                    <p className="text-red-500 text-sm">يجب اختيار الفئة</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="أدخل المبلغ"
                    {...register('amount', { 
                      required: true, 
                      valueAsNumber: true,
                      min: 0.01 
                    })}
                  />
                  {errors.amount && (
                    <p className="text-red-500 text-sm">يجب إدخال مبلغ صحيح</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {date ? format(date, 'PPP', { locale: ar }) : "اختر التاريخ"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <input 
                    type="hidden" 
                    {...register('date', { required: true })}
                    value={format(date, 'yyyy-MM-dd')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_method">طريقة الدفع</Label>
                  <Select 
                    defaultValue="cash" 
                    onValueChange={(value) => setValue('payment_method', value as 'cash' | 'bank' | 'other')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="bank">بنك</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea
                    id="notes"
                    placeholder="أدخل ملاحظات إضافية"
                    {...register('notes')}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/financial')}
                disabled={loading}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'جاري الحفظ...' : isEditMode ? 'تحديث المعاملة' : 'إضافة المعاملة'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionForm;
