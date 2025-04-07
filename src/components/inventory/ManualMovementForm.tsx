
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowDownCircle, 
  ArrowUpCircle 
} from 'lucide-react';
import { recordManualInventoryMovement } from '@/services/InventoryMovementService';

// Define form schema with Zod
const formSchema = z.object({
  itemType: z.string().min(1, { message: 'نوع العنصر مطلوب' }),
  itemId: z.string().min(1, { message: 'العنصر مطلوب' }),
  movementType: z.enum(['in', 'out']),
  quantity: z.coerce.number().positive({ message: 'الكمية يجب أن تكون أكبر من صفر' }),
  reason: z.string().min(3, { message: 'السبب مطلوب (3 أحرف على الأقل)' }),
});

interface ManualMovementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ManualMovementForm: React.FC<ManualMovementFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<string>('');
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemType: '',
      itemId: '',
      movementType: 'in',
      quantity: 1,
      reason: '',
    }
  });
  
  // Watch the itemType value for fetching related items
  const watchItemType = form.watch('itemType');
  
  // Reset itemId when itemType changes
  React.useEffect(() => {
    if (watchItemType !== selectedType) {
      form.setValue('itemId', '');
      setSelectedType(watchItemType);
    }
  }, [watchItemType, selectedType, form]);
  
  // Fetch items based on the selected type
  const { data: items = [] } = useQuery({
    queryKey: ['inventoryItems', watchItemType],
    queryFn: async () => {
      if (!watchItemType) return [];
      
      let tableName = '';
      
      switch (watchItemType) {
        case 'raw':
          tableName = 'raw_materials';
          break;
        case 'semi':
          tableName = 'semi_finished_products';
          break;
        case 'packaging':
          tableName = 'packaging_materials';
          break;
        case 'finished':
          tableName = 'finished_products';
          break;
        default:
          return [];
      }
      
      if (tableName === 'raw_materials') {
        const { data, error } = await supabase
          .from('raw_materials')
          .select('id, name, code, quantity')
          .order('name');
        
        if (error) throw error;
        return data || [];
      } else if (tableName === 'semi_finished_products') {
        const { data, error } = await supabase
          .from('semi_finished_products')
          .select('id, name, code, quantity')
          .order('name');
        
        if (error) throw error;
        return data || [];
      } else if (tableName === 'packaging_materials') {
        const { data, error } = await supabase
          .from('packaging_materials')
          .select('id, name, code, quantity')
          .order('name');
        
        if (error) throw error;
        return data || [];
      } else if (tableName === 'finished_products') {
        const { data, error } = await supabase
          .from('finished_products')
          .select('id, name, code, quantity')
          .order('name');
        
        if (error) throw error;
        return data || [];
      }
      
      return [];
    },
    enabled: !!watchItemType,
  });
  
  // Submit the form
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    try {
      // Apply quantity sign based on movement type
      const quantityWithSign = values.movementType === 'in' 
        ? Math.abs(values.quantity) 
        : -Math.abs(values.quantity);
      
      // Record the movement
      const success = await recordManualInventoryMovement(
        values.itemId,
        values.itemType,
        quantityWithSign,
        values.reason
      );
      
      if (success) {
        toast.success('تم تسجيل حركة المخزون بنجاح');
        form.reset();
        if (onSuccess) onSuccess();
      } else {
        toast.error('حدث خطأ أثناء تسجيل حركة المخزون');
      }
    } catch (error) {
      console.error('Error recording inventory movement:', error);
      toast.error('حدث خطأ أثناء تسجيل حركة المخزون');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="itemType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع العنصر</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع العنصر" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="raw">المواد الأولية</SelectItem>
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
                  defaultValue={field.value}
                  disabled={!watchItemType || items.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={items.length === 0 ? "لا توجد عناصر" : "اختر العنصر"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({item.code})
                      </SelectItem>
                    ))}
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
            name="movementType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الحركة</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="in" className="flex items-center">
                      <div className="flex items-center">
                        <ArrowUpCircle className="h-4 w-4 mr-2 text-green-500" />
                        <span>إضافة (وارد)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="out" className="flex items-center">
                      <div className="flex items-center">
                        <ArrowDownCircle className="h-4 w-4 mr-2 text-red-500" />
                        <span>سحب (صادر)</span>
                      </div>
                    </SelectItem>
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
                  <Input type="number" min="0.1" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>السبب / الملاحظات</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="اكتب سبب الإضافة أو السحب..." 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "جاري التنفيذ..." : "تأكيد"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ManualMovementForm;
