
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PackagingMaterial } from '@/services/InventoryService';
import InventoryService from '@/services/InventoryService';

interface PackagingMaterialFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: PackagingMaterial;
  title: string;
  submitText: string;
}

const formSchema = z.object({
  code: z.string().min(1, { message: 'الرمز مطلوب' }),
  name: z.string().min(1, { message: 'اسم المادة مطلوب' }),
  unit: z.string().min(1, { message: 'وحدة القياس مطلوبة' }),
  quantity: z.string().refine((val) => !isNaN(Number(val)), {
    message: 'يجب أن تكون الكمية رقماً',
  }),
  min_stock: z.string().refine((val) => !isNaN(Number(val)), {
    message: 'يجب أن يكون الحد الأدنى رقماً',
  }),
  unit_cost: z.string().refine((val) => !isNaN(Number(val)), {
    message: 'يجب أن تكون التكلفة رقماً',
  }),
});

const PackagingMaterialForm: React.FC<PackagingMaterialFormProps> = ({
  isOpen,
  onClose,
  initialData,
  title,
  submitText,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const inventoryService = InventoryService.getInstance();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: initialData?.code || '',
      name: initialData?.name || '',
      unit: initialData?.unit || '',
      quantity: initialData?.quantity?.toString() || '0',
      min_stock: initialData?.min_stock?.toString() || '0',
      unit_cost: initialData?.unit_cost?.toString() || '0',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const materialData = {
        code: values.code,
        name: values.name,
        unit: values.unit,
        quantity: Number(values.quantity),
        min_stock: Number(values.min_stock),
        unit_cost: Number(values.unit_cost),
      };

      if (initialData) {
        // تحديث مادة موجودة
        await inventoryService.updatePackagingMaterial(initialData.id, materialData);
      } else {
        // إضافة مادة جديدة
        await inventoryService.addPackagingMaterial(materialData);
      }

      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      onClose();
    } catch (error) {
      console.error('Error saving packaging material:', error);
      toast.error('حدث خطأ أثناء حفظ مادة التعبئة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رمز المادة</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>اسم المادة</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>وحدة القياس</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>الكمية</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" step="0.01" />
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
                  <FormLabel>الحد الأدنى للمخزون</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" step="0.01" />
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
                  <FormLabel>تكلفة الوحدة</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" onClick={onClose} type="button">
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'جاري الحفظ...' : submitText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PackagingMaterialForm;
