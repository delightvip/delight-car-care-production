
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
  
  // Fetch semi-finished products
  const { data: semiFinishedProducts = [], isLoading: isSemiFinishedLoading } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, name, code')
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
        .select('id, name, code')
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
            packaging_material:packaging_material_id(id, name, code)
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
      };
      
      fetchPackaging();
    }
  }, [isEditing, initialData]);
  
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
    
    setPackaging([
      ...packaging,
      {
        id: packageMaterial.id,
        code: packageMaterial.code,
        name: packageMaterial.name,
        quantity: packagingQuantity
      }
    ]);
    
    setSelectedPackaging('');
    setPackagingQuantity(1);
  };
  
  const handleRemovePackaging = (id: number) => {
    setPackaging(packaging.filter(pkg => pkg.id !== id));
  };
    const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof finishedProductSchema>) => {
      if (isEditing) {
        try {
          // بدء المعاملة - تغييرات متزامنة
          console.log("[DEBUG] بدء تحديث المنتج النهائي");
          
          // Update existing product
          const { data, error } = await supabase
            .from('finished_products')
            .update({
              name: values.name,
              unit: values.unit,
              quantity: values.quantity,
              min_stock: values.min_stock,
              unit_cost: values.unit_cost,
              sales_price: values.sales_price,
              semi_finished_id: values.semi_finished_id,
              semi_finished_quantity: values.semi_finished_quantity
            })
            .eq('id', initialData.id)
            .select();
            
          if (error) throw error;
          
          // Handle packaging materials - first delete existing
          const { error: deleteError } = await supabase
            .from('finished_product_packaging')
            .delete()
            .eq('finished_product_id', initialData.id);
            
          if (deleteError) throw deleteError;
          
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
        } catch (error) {
          console.error("[ERROR] فشل تحديث المنتج النهائي:", error);
          throw error;
        }      } else {
        try {
          console.log("[DEBUG] بدء إنشاء منتج نهائي جديد");
          
          // 1. انشاء رمز فريد للمنتج الجديد
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

          console.log(`[DEBUG] الرمز الجديد للمنتج النهائي: ${newCode}`);

          // 2. تحضير بيانات المنتج النهائي
          const productData = {
            code: newCode,
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            min_stock: values.min_stock,
            unit_cost: values.unit_cost,
            sales_price: values.sales_price,
            semi_finished_id: values.semi_finished_id,
            semi_finished_quantity: values.semi_finished_quantity
          };

          // 3. تحضير بيانات مواد التعبئة
          const packagingItems = packaging.map(pkg => ({
            id: pkg.id,
            code: pkg.code,
            name: pkg.name,
            quantity: pkg.quantity
          }));

          console.log(`[DEBUG] عدد مواد التعبئة: ${packagingItems.length}`);
          
          // 4. استخدام تقنية السؤال عن الاستخدام RPC لإجراء العملية في خطوة واحدة (إن وجدت)
          // في هذه الحالة نستخدم أكثر طريقة متأكدين منها: خطوة بخطوة مع الانتظار الكامل
          
          let productId = null;
          let createdProduct = null;

          // إنشاء المنتج أولاً
          const { data: productResult, error: productError } = await supabase
            .from('finished_products')
            .insert(productData)
            .select();

          if (productError) {
            console.error("[ERROR] فشل في إنشاء المنتج النهائي:", productError);
            throw new Error(`فشل إنشاء المنتج النهائي: ${productError.message}`);
          }

          if (!productResult || productResult.length === 0) {
            console.error("[ERROR] لم يتم إرجاع بيانات المنتج");
            throw new Error("فشل إنشاء المنتج النهائي: لم يتم إرجاع بيانات");
          }

          productId = productResult[0].id;
          createdProduct = productResult[0];
          
          console.log(`[DEBUG] تم إنشاء المنتج النهائي بنجاح، معرف المنتج: ${productId}`);

          // إذا لم تكن هناك مواد تعبئة، نعيد البيانات مباشرة
          if (packagingItems.length === 0) {
            console.log("[DEBUG] لا توجد مواد تعبئة للإضافة");
            return [createdProduct];
          }

          // إضافة مواد التعبئة المرتبطة بالمنتج
          console.log(`[DEBUG] جاري إضافة ${packagingItems.length} من مواد التعبئة للمنتج رقم ${productId}`);
          
          const packagingData = packagingItems.map(pkg => ({
            finished_product_id: productId,
            packaging_material_id: pkg.id,
            quantity: pkg.quantity
          }));

          try {
            const { error: packagingError } = await supabase
              .from('finished_product_packaging')
              .insert(packagingData);

            if (packagingError) {
              console.error("[ERROR] فشل إضافة مواد التعبئة:", packagingError);
              
              // تنفيذ التراجع عن طريق حذف المنتج المُنشأ
              console.log(`[DEBUG] بدء عملية التراجع - حذف المنتج رقم ${productId}`);
              
              // انتظار عملية الحذف لتكتمل
              const { error: deleteError } = await supabase
                .from('finished_products')
                .delete()
                .eq('id', productId);

              if (deleteError) {
                console.error("[ERROR] فشل في عملية التراجع، لم يتم حذف المنتج:", deleteError);
                throw new Error(`فشل في عملية التراجع: ${deleteError.message}`);
              }
              
              console.log("[DEBUG] تم حذف المنتج بنجاح كجزء من عملية التراجع");
              throw new Error(`فشل إضافة مواد التعبئة للمنتج: ${packagingError.message}`);
            }
            
            console.log("[DEBUG] تمت إضافة مواد التعبئة بنجاح");
            return [createdProduct];
          } catch (innerError) {
            console.error("[ERROR] خطأ أثناء إضافة مواد التعبئة:", innerError);
            
            // التحقق إذا كان المنتج لا يزال موجودًا بعد محاولة الحذف السابقة
            const { data: checkProduct } = await supabase
              .from('finished_products')
              .select('id')
              .eq('id', productId)
              .single();

            // إذا كان المنتج ما زال موجودًا، نحاول حذفه مرة أخرى
            if (checkProduct) {
              console.log(`[DEBUG] المنتج ما زال موجودًا، محاولة حذف إضافية للمنتج رقم: ${productId}`);
              
              await supabase
                .from('finished_products')
                .delete()
                .eq('id', productId);
            }
            
            throw innerError;
          }
        } catch (error) {
          console.error("[ERROR] فشل إنشاء المنتج النهائي:", error);
          throw error;
        }
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
                    <FormLabel>تكلفة الوحدة</FormLabel>
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
                              {product.name}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h3 className="text-md font-medium">مواد التعبئة</h3>
              
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
                          {material.name}
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
                  packaging.map(pkg => (
                    <div key={pkg.id} className="flex justify-between items-center p-2 border rounded-md">
                      <div>
                        <div className="font-medium">{pkg.name}</div>
                        <div className="text-sm text-muted-foreground">الكمية: {pkg.quantity}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemovePackaging(pkg.id)}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-center py-2">
                    لم يتم إضافة مواد تعبئة بعد
                  </div>
                )}
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
