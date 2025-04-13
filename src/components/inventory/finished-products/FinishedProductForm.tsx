
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { PlusCircle, X, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Define form schema
const finishedProductSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يحتوي الاسم على حرفين على الأقل" }),
  unit: z.string().min(1, { message: "يرجى اختيار وحدة القياس" }),
  quantity: z.coerce.number().min(0, { message: "الكمية يجب أن تكون 0 أو أكثر" }),
  min_stock: z.coerce.number().min(0, { message: "الحد الأدنى يجب أن يكون 0 أو أكثر" }),
  unit_cost: z.coerce.number().min(0, { message: "التكلفة يجب أن تكون 0 أو أكثر" }),
  sales_price: z.coerce.number().min(0, { message: "سعر البيع يجب أن يكون 0 أو أكثر" }),
  semi_finished_id: z.coerce.number().min(1, { message: "يجب اختيار منتج نصف مصنع" }),
  semi_finished_quantity: z.coerce.number().min(0.1, { message: "كمية المنتج النصف مصنع يجب أن تكون أكبر من 0" })
});

const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

interface PackagingItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
}

interface FinishedProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  title: string;
  submitText: string;
}

const FinishedProductForm: React.FC<FinishedProductFormProps> = ({
  isOpen,
  onClose,
  initialData,
  title,
  submitText
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  const [selectedPackaging, setSelectedPackaging] = useState<string>('');
  const [packagingQuantity, setPackagingQuantity] = useState<number>(1);
  const [packaging, setPackaging] = useState<PackagingItem[]>([]);
  const [semiFinishedUnitCost, setSemiFinishedUnitCost] = useState<number>(0);
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  
  // Fetch semi-finished products
  const { data: semiFinishedProducts = [], isLoading: isSemiFinishedLoading } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, name, code, unit_cost')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
  
  // Fetch packaging materials
  const { data: packagingMaterials = [], isLoading: isPackagingLoading } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('id, name, code, unit_cost')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
  
  const form = useForm<z.infer<typeof finishedProductSchema>>({
    resolver: zodResolver(finishedProductSchema),
    defaultValues: {
      name: initialData?.name || "",
      unit: initialData?.unit || units[0],
      quantity: initialData?.quantity || 0,
      min_stock: initialData?.min_stock || 0,
      unit_cost: initialData?.unit_cost || 0,
      sales_price: initialData?.sales_price || 0,
      semi_finished_id: initialData?.semi_finished_id || 0,
      semi_finished_quantity: initialData?.semi_finished_quantity || 1
    }
  });
  
  // Load existing packaging materials if editing
  useEffect(() => {
    if (isEditing && initialData) {
      // Fetch packaging for this product
      const fetchPackaging = async () => {
        const { data, error } = await supabase
          .from('finished_product_packaging')
          .select(`
            id,
            quantity,
            packaging_material:packaging_material_id(id, name, code, unit_cost)
          `)
          .eq('finished_product_id', initialData.id);
          
        if (error) {
          toast.error('خطأ في جلب مواد التعبئة');
          return;
        }
        
        // Format packaging materials for our state
        const formattedPackaging = data?.map((pkg) => ({
          id: pkg.packaging_material?.id,
          code: pkg.packaging_material?.code,
          name: pkg.packaging_material?.name,
          quantity: pkg.quantity
        })) || [];
        
        setPackaging(formattedPackaging);
        
        // احتساب تكلفة مواد التعبئة
        calculatePackagingCost(formattedPackaging);
      };
      
      fetchPackaging();
      
      // جلب تكلفة المنتج النصف مصنع
      const semiFinished = semiFinishedProducts.find(p => p.id === initialData.semi_finished_id);
      if (semiFinished) {
        setSemiFinishedUnitCost(semiFinished.unit_cost);
        calculateTotalCost(semiFinished.unit_cost, initialData.semi_finished_quantity, packagingCost);
      }
    }
  }, [isEditing, initialData, semiFinishedProducts]);
  
  // تحديث التكلفة عند تغيير المنتج النصف مصنع
  useEffect(() => {
    const semiFinishedId = form.watch('semi_finished_id');
    const semiFinishedQty = form.watch('semi_finished_quantity');
    
    if (semiFinishedId) {
      const semiFinished = semiFinishedProducts.find(p => p.id === semiFinishedId);
      if (semiFinished) {
        setSemiFinishedUnitCost(semiFinished.unit_cost);
        calculateTotalCost(semiFinished.unit_cost, semiFinishedQty, packagingCost);
      }
    }
  }, [form.watch('semi_finished_id'), form.watch('semi_finished_quantity'), semiFinishedProducts, packagingCost]);
  
  // تحديث التكلفة الإجمالية
  const calculateTotalCost = (unitCost: number, quantity: number, packagingTotal: number) => {
    const semiFinishedTotal = unitCost * quantity;
    const newTotalCost = semiFinishedTotal + packagingTotal;
    setTotalCost(newTotalCost);
    form.setValue('unit_cost', newTotalCost);
  };
  
  // حساب تكلفة مواد التعبئة
  const calculatePackagingCost = (packagingItems: PackagingItem[]) => {
    let total = 0;
    
    packagingItems.forEach((item) => {
      const material = packagingMaterials.find(m => m.id === item.id);
      if (material) {
        total += material.unit_cost * item.quantity;
      }
    });
    
    setPackagingCost(total);
    
    // تحديث التكلفة الإجمالية بعد تحديث تكلفة مواد التعبئة
    const semiFinishedQty = form.watch('semi_finished_quantity');
    calculateTotalCost(semiFinishedUnitCost, semiFinishedQty, total);
  };
  
  const handleAddPackaging = () => {
    if (!selectedPackaging) {
      toast.error('يرجى اختيار مادة تعبئة');
      return;
    }
    
    if (packagingQuantity <= 0) {
      toast.error('يجب أن تكون الكمية أكبر من 0');
      return;
    }
    
    // Check if already exists
    if (packaging.some(pkg => pkg.id === parseInt(selectedPackaging))) {
      toast.error('تم إضافة هذه المادة بالفعل');
      return;
    }
    
    const packageMaterial = packagingMaterials.find(m => m.id === parseInt(selectedPackaging));
    if (!packageMaterial) return;
    
    const newPackaging = [
      ...packaging,
      {
        id: packageMaterial.id,
        code: packageMaterial.code,
        name: packageMaterial.name,
        quantity: packagingQuantity
      }
    ];
    
    setPackaging(newPackaging);
    calculatePackagingCost(newPackaging);
    
    setSelectedPackaging('');
    setPackagingQuantity(1);
  };
  
  const handleRemovePackaging = (id: number) => {
    const updatedPackaging = packaging.filter(pkg => pkg.id !== id);
    setPackaging(updatedPackaging);
    calculatePackagingCost(updatedPackaging);
  };
  
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof finishedProductSchema>) => {
      if (isEditing) {
        // Update existing product
        const { data, error } = await supabase
          .from('finished_products')
          .update({
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            min_stock: values.min_stock,
            unit_cost: totalCost, // استخدام التكلفة المحسوبة
            sales_price: values.sales_price,
            semi_finished_id: values.semi_finished_id,
            semi_finished_quantity: values.semi_finished_quantity
          })
          .eq('id', initialData.id)
          .select();
          
        if (error) throw error;
        
        // Handle packaging materials - first delete existing
        await supabase
          .from('finished_product_packaging')
          .delete()
          .eq('finished_product_id', initialData.id);
        
        // Then insert new packaging materials
        if (packaging.length > 0) {
          const packagingData = packaging.map(pkg => ({
            finished_product_id: initialData.id,
            packaging_material_id: pkg.id,
            quantity: pkg.quantity
          }));
          
          const { error: packagingError } = await supabase
            .from('finished_product_packaging')
            .insert(packagingData);
            
          if (packagingError) throw packagingError;
        }
        
        return data;
      } else {
        // Generate a code for new record
        const { data: maxCode } = await supabase
          .from('finished_products')
          .select('code')
          .order('code', { ascending: false })
          .limit(1);
          
        let newCode = 'FIN-00001';
        if (maxCode && maxCode.length > 0) {
          const lastCode = maxCode[0].code;
          const lastNum = parseInt(lastCode.split('-')[1]);
          newCode = `FIN-${String(lastNum + 1).padStart(5, '0')}`;
        }
        
        // Insert new product
        const { data, error } = await supabase
          .from('finished_products')
          .insert({
            code: newCode,
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            min_stock: values.min_stock,
            unit_cost: totalCost, // استخدام التكلفة المحسوبة
            sales_price: values.sales_price,
            semi_finished_id: values.semi_finished_id,
            semi_finished_quantity: values.semi_finished_quantity
          })
          .select();
          
        if (error) throw error;
        
        // Insert packaging materials
        if (packaging.length > 0 && data && data.length > 0) {
          const packagingData = packaging.map(pkg => ({
            finished_product_id: data[0].id,
            packaging_material_id: pkg.id,
            quantity: pkg.quantity
          }));
          
          const { error: packagingError } = await supabase
            .from('finished_product_packaging')
            .insert(packagingData);
            
          if (packagingError) throw packagingError;
        }
        
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      toast.success(isEditing ? 'تم تعديل المنتج النهائي بنجاح' : 'تمت إضافة المنتج النهائي بنجاح');
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  const onSubmit = (values: z.infer<typeof finishedProductSchema>) => {
    if (packaging.length === 0) {
      toast.error('يجب إضافة مادة تعبئة واحدة على الأقل');
      return;
    }
    mutation.mutate(values);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            أدخل بيانات المنتج النهائي مع مكوناته ومواد التعبئة
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المنتج</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="أدخل اسم المنتج النهائي" />
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
                        {units.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
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
                    <FormLabel>تكلفة الوحدة (محسوبة)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        {...field} 
                        value={totalCost}
                        disabled
                        className="bg-muted"
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
                      * يتم حساب هذه القيمة تلقائياً بناءً على المكونات
                    </div>
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
            
            <FormField
              control={form.control}
              name="min_stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحد الأدنى للمخزون</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h3 className="text-md font-medium">المنتج النصف مصنع</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="semi_finished_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المنتج النصف مصنع</FormLabel>
                      <Select 
                        onValueChange={value => field.onChange(parseInt(value))} 
                        defaultValue={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر منتج نصف مصنع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {semiFinishedProducts.map(product => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name} - تكلفة: {product.unit_cost}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="semi_finished_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كمية المنتج النصف مصنع</FormLabel>
                      <FormControl>
                        <Input type="number" min="0.1" step="0.01" {...field} />
                      </FormControl>
                      <div className="text-xs text-muted-foreground mt-1">
                        التكلفة: {(semiFinishedUnitCost * field.value).toFixed(2)}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">مواد التعبئة</h3>
                <div className="text-sm text-muted-foreground">إجمالي تكلفة التعبئة: {packagingCost.toFixed(2)}</div>
              </div>
              
              <div className="flex space-x-4 rtl:space-x-reverse">
                <div className="flex-1">
                  <FormLabel>مادة التعبئة</FormLabel>
                  <Select 
                    value={selectedPackaging} 
                    onValueChange={setSelectedPackaging}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مادة تعبئة" />
                    </SelectTrigger>
                    <SelectContent>
                      {packagingMaterials.map(material => (
                        <SelectItem key={material.id} value={String(material.id)}>
                          {material.name} - تكلفة: {material.unit_cost}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-32">
                  <FormLabel>الكمية</FormLabel>
                  <Input 
                    type="number" 
                    min="1"
                    value={packagingQuantity}
                    onChange={e => setPackagingQuantity(Number(e.target.value))}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddPackaging}>
                    <PlusCircle size={16} className="mr-2" />
                    إضافة
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {packaging.length > 0 ? (
                  packaging.map(pkg => {
                    const material = packagingMaterials.find(m => m.id === pkg.id);
                    const cost = material ? material.unit_cost * pkg.quantity : 0;
                    
                    return (
                      <div key={pkg.id} className="flex justify-between items-center p-2 border rounded-md">
                        <div>
                          <div className="font-medium">{pkg.name}</div>
                          <div className="text-sm text-muted-foreground">
                            الكمية: {pkg.quantity} | 
                            التكلفة: {cost.toFixed(2)}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemovePackaging(pkg.id)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-muted-foreground text-center py-2">
                    لم يتم إضافة مواد تعبئة بعد
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-md mt-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">التكلفة الإجمالية:</div>
                <div className="font-bold text-lg">{totalCost.toFixed(2)}</div>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                تكلفة المنتج النصف مصنع: {(semiFinishedUnitCost * form.watch('semi_finished_quantity')).toFixed(2)} + تكلفة مواد التعبئة: {packagingCost.toFixed(2)}
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : submitText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FinishedProductForm;
