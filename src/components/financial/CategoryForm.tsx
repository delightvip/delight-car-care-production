
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import FinancialService, { Category } from '@/services/financial/FinancialService';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

// Define schema for form validation
const categorySchema = z.object({
  name: z.string({
    required_error: "اسم الفئة مطلوب",
  }).min(2, {
    message: "يجب أن يكون اسم الفئة على الأقل 2 أحرف",
  }),
  type: z.enum(['income', 'expense'], {
    required_error: "نوع الفئة مطلوب",
  }),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const CategoryForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const financialService = FinancialService.getInstance();
  
  // Initialize form with default values
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'income',
      description: '',
    }
  });
  
  // Load category data if editing
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && id) {
        setLoading(true);
        try {
          const category = await financialService.getCategory(id);
          
          if (category) {
            form.reset({
              name: category.name,
              type: category.type,
              description: category.description || '',
            });
          } else {
            toast.error("لم يتم العثور على الفئة");
            navigate('/financial/categories');
          }
        } catch (error) {
          console.error("Error loading category:", error);
          toast.error("حدث خطأ أثناء تحميل بيانات الفئة");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    loadData();
  }, [isEditing, id, form, navigate, financialService]);
  
  const onSubmit = async (data: CategoryFormValues) => {
    setSubmitting(true);
    
    try {
      // التأكد من أن جميع الحقول المطلوبة متوفرة في البيانات
      const categoryData: Omit<Category, 'id' | 'created_at'> = {
        name: data.name, // الحقل مطلوب دائماً
        type: data.type, // الحقل مطلوب دائماً
        description: data.description // حقل اختياري
      };
      
      let success = false;
      
      if (isEditing && id) {
        const updated = await financialService.updateCategory(id, categoryData);
        success = !!updated;
      } else {
        const created = await financialService.createCategory(categoryData);
        success = !!created;
      }
      
      if (success) {
        toast.success(isEditing ? "تم تعديل الفئة بنجاح" : "تم إضافة الفئة بنجاح");
        navigate('/financial/categories');
      } else {
        toast.error("حدث خطأ أثناء حفظ البيانات");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate('/financial/categories')}>
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة للفئات
        </Button>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isEditing ? 'تعديل فئة' : 'فئة جديدة'}</CardTitle>
          <CardDescription>
            {isEditing 
              ? 'قم بتعديل بيانات الفئة المالية' 
              : 'قم بإدخال بيانات الفئة المالية الجديدة'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الفئة</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل اسم الفئة" {...field} />
                      </FormControl>
                      <FormDescription>
                        اسم الفئة يجب أن يكون واضحاً ومميزاً
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الفئة</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع الفئة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">إيراد</SelectItem>
                          <SelectItem value="expense">مصروف</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        تحديد نوع الفئة يساعد في تنظيم المعاملات المالية
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الوصف</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أدخل وصفاً للفئة (اختياري)"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "جاري الحفظ..." : isEditing ? "تعديل الفئة" : "إضافة الفئة"}
                  <Save className="h-4 w-4 mr-2" />
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryForm;
