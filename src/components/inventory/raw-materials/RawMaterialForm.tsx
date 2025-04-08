
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from '@/integrations/supabase/client';
import { generateCode } from '@/utils/generateCode';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define form schema
const rawMaterialSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يحتوي الاسم على حرفين على الأقل" }),
  unit: z.string().min(1, { message: "يرجى اختيار وحدة القياس" }),
  quantity: z.coerce.number().min(0, { message: "الكمية يجب أن تكون 0 أو أكثر" }),
  unit_cost: z.coerce.number().min(0, { message: "التكلفة يجب أن تكون 0 أو أكثر" }),
  sales_price: z.coerce.number().min(0, { message: "سعر البيع يجب أن يكون 0 أو أكثر" }).optional(),
  min_stock: z.coerce.number().min(0, { message: "الحد الأدنى يجب أن يكون 0 أو أكثر" }),
  importance: z.coerce.number().min(0).max(2)
});

interface RawMaterialFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  title: string;
  submitText: string;
}

const RawMaterialForm: React.FC<RawMaterialFormProps> = ({
  isOpen,
  onClose,
  initialData,
  title,
  submitText
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  
  const form = useForm<z.infer<typeof rawMaterialSchema>>({
    resolver: zodResolver(rawMaterialSchema),
    defaultValues: {
      name: initialData?.name || "",
      unit: initialData?.unit || "",
      quantity: initialData?.quantity || 0,
      unit_cost: initialData?.unit_cost || 0,
      sales_price: initialData?.sales_price || 0,
      min_stock: initialData?.min_stock || 0,
      importance: initialData?.importance || 0
    }
  });
  
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof rawMaterialSchema>) => {
      try {
        if (isEditing) {
          // Update existing record
          const { data, error } = await supabase
            .from('raw_materials')
            .update(values)
            .eq('id', initialData.id)
            .select();
            
          if (error) throw error;
          return data;
        } else {
          // Get current count for code generation
          const { count, error: countError } = await supabase
            .from('raw_materials')
            .select('id', { count: 'exact', head: true });
            
          if (countError) throw countError;
          
          // Check if this material is special (water)
          const isSpecial = values.name.toLowerCase() === 'ماء' || 
                          values.name.toLowerCase() === 'water' ||
                          values.name.toLowerCase() === 'مياه';
          
          // Generate appropriate code
          let newCode;
          if (isSpecial) {
            newCode = 'WATER-00001'; // Special code for water
          } else {
            newCode = generateCode('raw', count || 0);
            
            // Verify the code doesn't exist already
            const { data: existingCode, error: codeError } = await supabase
              .from('raw_materials')
              .select('code')
              .eq('code', newCode)
              .maybeSingle();
              
            if (codeError) throw codeError;
            
            // If code exists, add a random suffix to ensure uniqueness
            if (existingCode) {
              const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
              newCode = `${newCode}-${randomSuffix}`;
            }
          }
          
          // Create new material with the generated code
          const newMaterial = {
            code: newCode,
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            unit_cost: values.unit_cost,
            sales_price: values.sales_price || 0,
            min_stock: values.min_stock,
            importance: values.importance
          };
          
          const { data, error } = await supabase
            .from('raw_materials')
            .insert(newMaterial)
            .select();
            
          if (error) throw error;
          return data;
        }
      } catch (error: any) {
        // Add detailed context to the error
        if (error.message && error.message.includes('violates unique constraint')) {
          error.details = 'قد يكون هناك مادة أخرى تستخدم نفس الكود. يرجى المحاولة مرة أخرى.';
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      enhancedToast.success(isEditing ? 'تم تعديل المادة الخام بنجاح' : 'تمت إضافة المادة الخام بنجاح');
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      enhancedToast.error(error);
    }
  });
  
  const onSubmit = (values: z.infer<typeof rawMaterialSchema>) => {
    mutation.mutate(values);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المادة</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="أدخل اسم المادة الخام" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وحدة القياس</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر وحدة القياس" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="كجم">كجم</SelectItem>
                        <SelectItem value="لتر">لتر</SelectItem>
                        <SelectItem value="متر">متر</SelectItem>
                        <SelectItem value="قطعة">قطعة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="importance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الأهمية</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="حدد مستوى الأهمية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">منخفضة</SelectItem>
                        <SelectItem value="1">متوسطة</SelectItem>
                        <SelectItem value="2">عالية</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكمية</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحد الأدنى</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التكلفة</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sales_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر البيع</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'جاري التنفيذ...' : submitText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RawMaterialForm;
