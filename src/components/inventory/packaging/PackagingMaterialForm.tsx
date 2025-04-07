
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';

// Define the form schema
const formSchema = z.object({
  code: z.string().min(1, { message: 'الكود مطلوب' }),
  name: z.string().min(1, { message: 'اسم المستلزم مطلوب' }),
  unit: z.string().min(1, { message: 'وحدة القياس مطلوبة' }),
  quantity: z.coerce.number().min(0, { message: 'الكمية يجب أن تكون أكبر من أو تساوي صفر' }),
  min_stock: z.coerce.number().min(0, { message: 'الحد الأدنى للمخزون يجب أن يكون أكبر من أو يساوي صفر' }),
  unit_cost: z.coerce.number().min(0, { message: 'التكلفة يجب أن تكون أكبر من أو تساوي صفر' }),
});

// Define a type for the form values to match the Supabase schema requirements
type PackagingMaterialFormValues = {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
};

interface PackagingMaterialFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  title: string;
  submitText: string;
}

const PackagingMaterialForm: React.FC<PackagingMaterialFormProps> = ({
  isOpen,
  onClose,
  initialData,
  title,
  submitText
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  
  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      code: '',
      name: '',
      unit: '',
      quantity: 0,
      min_stock: 0,
      unit_cost: 0
    }
  });
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Ensure all required fields are present
      const formData: PackagingMaterialFormValues = {
        code: values.code,
        name: values.name,
        unit: values.unit,
        quantity: values.quantity,
        min_stock: values.min_stock,
        unit_cost: values.unit_cost
      };
      
      if (isEditing) {
        // Update existing packaging material
        const { error } = await supabase
          .from('packaging_materials')
          .update(formData)
          .eq('id', initialData.id);
        
        if (error) throw error;
        
        toast.success('تم تحديث مستلزم التعبئة بنجاح');
      } else {
        // Insert new packaging material
        const { error } = await supabase
          .from('packaging_materials')
          .insert(formData);
        
        if (error) throw error;
        
        toast.success('تم إضافة مستلزم التعبئة بنجاح');
      }
      
      // Invalidate the query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      
      // Close the dialog
      onClose();
    } catch (error) {
      console.error('Error saving packaging material:', error);
      toast.error(`حدث خطأ أثناء ${isEditing ? 'تحديث' : 'إضافة'} مستلزم التعبئة`);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            أدخل بيانات مستلزم التعبئة أدناه
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكود</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: PK001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: عبوة زجاج 250مل" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وحدة القياس</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: قطعة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكمية المتاحة</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحد الأدنى للمخزون</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تكلفة الوحدة (ج.م)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
              <Button type="submit">{submitText}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PackagingMaterialForm;
