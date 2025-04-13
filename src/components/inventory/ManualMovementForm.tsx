
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { InventoryMovementService } from '@/services/InventoryMovementService';
import { ManualMovementInput } from '@/types/inventoryTypes';

interface ManualMovementFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const formSchema = z.object({
  type: z.enum(['in', 'out']),
  category: z.string().min(1, 'يرجى اختيار الفئة'),
  item_id: z.number().min(1, 'يرجى اختيار الصنف'),
  item_name: z.string().min(1, 'اسم الصنف مطلوب'),
  quantity: z.number().min(0.01, 'الكمية يجب أن تكون أكبر من صفر'),
  unit: z.string().min(1, 'الوحدة مطلوبة'),
  note: z.string().optional(),
  date: z.date()
});

type FormValues = z.infer<typeof formSchema>;

const ManualMovementForm: React.FC<ManualMovementFormProps> = ({ onSuccess, onCancel }) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'in',
      category: '',
      item_id: 0,
      item_name: '',
      quantity: 0,
      unit: '',
      note: '',
      date: new Date()
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Make sure all required fields are present in the values
      const movementData: ManualMovementInput = {
        type: values.type,
        category: values.category,
        item_id: values.item_id,
        item_name: values.item_name,
        quantity: values.quantity,
        unit: values.unit,
        note: values.note,
        date: values.date
      };
      
      const result = await InventoryMovementService.getInstance().createManualInventoryMovement(movementData);
      
      if (result) {
        toast.success('تم تسجيل حركة المخزون بنجاح');
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('حدث خطأ أثناء تسجيل حركة المخزون');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الحركة</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحركة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="in">وارد</SelectItem>
                    <SelectItem value="out">صادر</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الفئة</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر فئة المنتج" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="raw_materials">المواد الأولية</SelectItem>
                    <SelectItem value="semi_finished">المنتجات النصف مصنعة</SelectItem>
                    <SelectItem value="packaging">مستلزمات التعبئة</SelectItem>
                    <SelectItem value="finished_products">المنتجات النهائية</SelectItem>
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
            name="item_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم الصنف</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل اسم الصنف" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="item_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الصنف</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="أدخل رقم الصنف" 
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
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
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="أدخل الكمية" 
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
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
                  <Input placeholder="مثال: كجم، قطعة، صندوق" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ملاحظات</FormLabel>
              <FormControl>
                <Textarea placeholder="أدخل أي ملاحظات إضافية..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="submit">
            حفظ
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ManualMovementForm;
