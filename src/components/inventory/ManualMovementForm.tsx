
import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { recordManualInventoryMovement } from '@/services/InventoryMovementService';
import InventoryService from '@/services/InventoryService';

// Schema for the form
const formSchema = z.object({
  itemType: z.enum(['raw', 'semi', 'packaging', 'finished'], {
    required_error: "يرجى اختيار نوع العنصر",
  }),
  itemId: z.string({
    required_error: "يرجى اختيار العنصر",
  }),
  movementType: z.enum(['in', 'out'], {
    required_error: "يرجى تحديد نوع الحركة",
  }),
  quantity: z
    .number({ 
      required_error: "الكمية مطلوبة",
      invalid_type_error: "يجب أن تكون الكمية رقم",
    })
    .positive("يجب أن تكون الكمية موجبة"),
  reason: z.string().max(100, {
    message: "يجب ألا يتجاوز سبب الحركة 100 حرف",
  }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ManualMovementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ManualMovementForm: React.FC<ManualMovementFormProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const inventoryService = InventoryService.getInstance();
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemType: 'raw',
      movementType: 'in',
      quantity: undefined,
      reason: '',
    },
  });
  
  // Watch for changes in the item type to load related items
  const itemType = form.watch('itemType');
  
  // Load items based on selected type
  useEffect(() => {
    const loadItems = async () => {
      try {
        let fetchedItems: any[] = [];
        
        switch (itemType) {
          case 'raw':
            fetchedItems = await inventoryService.getRawMaterials();
            break;
          case 'semi':
            fetchedItems = await inventoryService.getSemiFinishedProducts();
            break;
          case 'packaging':
            fetchedItems = await inventoryService.getPackagingMaterials();
            break;
          case 'finished':
            fetchedItems = await inventoryService.getFinishedProducts();
            break;
        }
        
        setItems(fetchedItems.map(item => ({
          id: item.id,
          name: item.name,
          code: item.code
        })));
        
        // Reset the selected item when type changes
        form.setValue('itemId', '');
      } catch (error) {
        console.error('Error loading items:', error);
        toast.error('حدث خطأ أثناء تحميل العناصر');
      }
    };
    
    loadItems();
  }, [itemType]);
  
  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Calculate the actual quantity (positive for IN, negative for OUT)
      const actualQuantity = 
        values.movementType === 'in' ? values.quantity : -values.quantity;
      
      // Record the movement
      const success = await recordManualInventoryMovement(
        values.itemId,
        values.itemType,
        actualQuantity,
        values.reason || 'حركة يدوية'
      );
      
      if (success) {
        toast.success('تم تسجيل حركة المخزون بنجاح');
        // Reset form
        form.reset({
          itemType: 'raw',
          itemId: '',
          movementType: 'in',
          quantity: undefined,
          reason: '',
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error('حدث خطأ أثناء تسجيل حركة المخزون');
      }
    } catch (error) {
      console.error('Error submitting movement:', error);
      toast.error('حدث خطأ أثناء تسجيل حركة المخزون');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="itemType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع العنصر</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العنصر" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="raw">المواد الخام</SelectItem>
                  <SelectItem value="semi">المنتجات النصف مصنعة</SelectItem>
                  <SelectItem value="packaging">مستلزمات التعبئة</SelectItem>
                  <SelectItem value="finished">المنتجات النهائية</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="itemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>العنصر</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting || items.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العنصر" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.code} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {items.length === 0 ? 'لا توجد عناصر متاحة من هذا النوع' : ''}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="movementType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع الحركة</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الحركة" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="in">وارد (إضافة)</SelectItem>
                  <SelectItem value="out">صادر (خصم)</SelectItem>
                </SelectContent>
              </Select>
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
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  disabled={isSubmitting}
                  placeholder="أدخل الكمية"
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>السبب (اختياري)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="أدخل سبب الحركة"
                  className="resize-none"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                وصف سبب إضافة أو خصم هذه الكمية من المخزون
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'جاري المعالجة...' : 'تسجيل الحركة'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ManualMovementForm;
