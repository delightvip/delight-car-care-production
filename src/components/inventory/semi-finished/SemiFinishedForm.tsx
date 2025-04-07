
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
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import IngredientSelector from './ingredients/IngredientSelector';
import IngredientsList from './ingredients/IngredientsList';
import { Ingredient, SemiFinishedProductFormData } from '@/types/inventoryTypes';

const semiFinishedSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يحتوي الاسم على حرفين على الأقل" }),
  unit: z.string().min(1, { message: "يرجى اختيار وحدة القياس" }),
  quantity: z.coerce.number().min(0, { message: "الكمية يجب أن تكون 0 أو أكثر" }),
  unit_cost: z.coerce.number().min(0, { message: "التكلفة يجب أن تكون 0 أو أكثر" }),
  sales_price: z.coerce.number().min(0, { message: "سعر البيع يجب أن تكون 0 أو أكثر" }),
  min_stock: z.coerce.number().min(0, { message: "الحد الأدنى يجب أن يكون 0 أو أكثر" })
});

const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

interface SemiFinishedFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  title: string;
  submitText: string;
}

const SemiFinishedForm: React.FC<SemiFinishedFormProps> = ({
  isOpen,
  onClose,
  initialData,
  title,
  submitText
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [hasWater, setHasWater] = useState<boolean>(false);
  const [totalCost, setTotalCost] = useState<number>(0);
  
  const { data: rawMaterials = [], isLoading: isRawMaterialsLoading } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, code, unit, unit_cost')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
  
  const { data: semiFinishedProducts = [], isLoading: isSemiFinishedLoading } = useQuery({
    queryKey: ['semiFinishedProductsList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, name, code, unit, unit_cost')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
  
  const form = useForm<z.infer<typeof semiFinishedSchema>>({
    resolver: zodResolver(semiFinishedSchema),
    defaultValues: {
      name: initialData?.name || "",
      unit: initialData?.unit || units[0],
      quantity: initialData?.quantity || 0,
      unit_cost: initialData?.unit_cost || 0,
      sales_price: initialData?.sales_price || 0,
      min_stock: initialData?.min_stock || 0
    }
  });
  
  useEffect(() => {
    if (isEditing && initialData) {
      const fetchIngredients = async () => {
        try {
          // تجلب المكونات من قاعدة البيانات للمنتج المُعدّل
          const { data: rawIngredientsData, error: rawError } = await supabase
            .from('semi_finished_ingredients')
            .select(`
              id,
              percentage,
              ingredient_type,
              raw_material_id,
              raw_material:raw_material_id(id, code, name, unit, unit_cost)
            `)
            .eq('semi_finished_product_id', initialData.id)
            .eq('ingredient_type', 'raw');
            
          if (rawError) {
            toast.error('خطأ في جلب المكونات الخام');
            console.error("Error fetching raw ingredients:", rawError);
            return;
          }
          
          // تجلب المكونات من نوع نصف مصنع
          const { data: semiIngredientsData, error: semiError } = await supabase
            .from('semi_finished_ingredients')
            .select(`
              id,
              percentage,
              ingredient_type,
              semi_finished_id
            `)
            .eq('semi_finished_product_id', initialData.id)
            .eq('ingredient_type', 'semi');
            
          if (semiError) {
            toast.error('خطأ في جلب المكونات النصف مصنعة');
            console.error("Error fetching semi ingredients:", semiError);
            return;
          }
          
          // تجلب مكونات الماء
          const { data: waterIngredientsData, error: waterError } = await supabase
            .from('semi_finished_ingredients')
            .select(`
              id,
              percentage,
              ingredient_type
            `)
            .eq('semi_finished_product_id', initialData.id)
            .eq('ingredient_type', 'water');
            
          if (waterError) {
            toast.error('خطأ في جلب مكونات الماء');
            console.error("Error fetching water ingredients:", waterError);
            return;
          }
          
          const rawIngredientsFormatted: Ingredient[] = rawIngredientsData?.map((ing) => {
            if (!ing || !ing.raw_material) return null;
            
            return {
              id: ing.raw_material.id,
              code: ing.raw_material.code,
              name: ing.raw_material.name,
              percentage: ing.percentage,
              ingredient_type: 'raw',
              unit: ing.raw_material.unit,
              unit_cost: ing.raw_material.unit_cost
            };
          }).filter(Boolean) as Ingredient[] || [];
          
          let semiIngredientsFormatted: Ingredient[] = [];
          
          // إذا كان هناك مكونات من نوع نصف مصنع، نجلب تفاصيلها
          if (semiIngredientsData && semiIngredientsData.length > 0) {
            // نحصل على معرّفات المنتجات النصف مصنعة
            const semiIds = semiIngredientsData
              .map(ing => ing.semi_finished_id)
              .filter(Boolean);
            
            if (semiIds.length > 0) {
              const { data: semiProducts, error: semiProductsError } = await supabase
                .from('semi_finished_products')
                .select('id, code, name, unit, unit_cost')
                .in('id', semiIds);
                
              if (semiProductsError) {
                toast.error('خطأ في جلب بيانات المنتجات النصف مصنعة');
                console.error("Error fetching semi-finished products:", semiProductsError);
              } else {
                semiIngredientsFormatted = semiIngredientsData.map(ing => {
                  const productDetails = semiProducts?.find(p => p.id === ing.semi_finished_id);
                  if (!productDetails) return null;
                  
                  return {
                    id: productDetails.id,
                    code: productDetails.code,
                    name: productDetails.name,
                    percentage: ing.percentage,
                    ingredient_type: 'semi',
                    unit: productDetails.unit,
                    unit_cost: productDetails.unit_cost
                  };
                }).filter(Boolean) as Ingredient[] || [];
              }
            }
          }
          
          const waterIngredientsFormatted: Ingredient[] = waterIngredientsData?.map((ing) => {
            return {
              id: 0,
              code: 'WATER',
              name: 'ماء',
              percentage: ing.percentage,
              ingredient_type: 'water',
              is_auto_calculated: true,
              unit_cost: 0
            };
          }) || [];
          
          if (waterIngredientsFormatted.length > 0) {
            setHasWater(true);
          }
          
          // دمج جميع المكونات في مصفوفة واحدة
          const allIngredients = [
            ...rawIngredientsFormatted,
            ...semiIngredientsFormatted,
            ...waterIngredientsFormatted
          ];
          
          setIngredients(allIngredients);
        } catch (error) {
          console.error("Error fetching ingredients:", error);
          toast.error('حدث خطأ أثناء تحميل المكونات');
        }
      };
      
      fetchIngredients();
    }
  }, [isEditing, initialData]);
  
  useEffect(() => {
    if (ingredients.length === 0) {
      setTotalCost(0);
      return;
    }
    
    const calculatedCost = ingredients.reduce((total, ing) => {
      if (!ing || !ing.unit_cost) return total;
      return total + ((ing.percentage / 100) * ing.unit_cost);
    }, 0);
    
    setTotalCost(calculatedCost);
    
    form.setValue('unit_cost', calculatedCost);
  }, [ingredients, form]);
  
  const handleAddIngredient = (ingredient: Ingredient) => {
    setIngredients([...ingredients, ingredient]);
    
    if (ingredient.ingredient_type === 'water') {
      setHasWater(true);
    }
  };
  
  const handleRemoveIngredient = (id: number, type: string) => {
    setIngredients(ingredients.filter(ing => {
      if (type === 'water' && ing.ingredient_type === 'water') {
        setHasWater(false);
        return false;
      }
      return !(ing.id === id && ing.ingredient_type === type);
    }));
  };
  
  const validateTotalPercentage = (): boolean => {
    if (hasWater) return true;
    
    const total = ingredients.reduce((sum, ing) => sum + ing.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`مجموع النسب يجب أن يكون 100%، الإجمالي الحالي: ${total}%`);
      return false;
    }
    return true;
  };
  
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof semiFinishedSchema>) => {
      console.log("Starting mutation with ingredients:", ingredients);
      
      // تحضير بيانات المكونات للإدخال في قاعدة البيانات
      const ingredientsData = ingredients.map(ing => {
        const ingredientType = ing.ingredient_type || 'raw';
        
        const baseData: any = {
          percentage: ing.percentage,
          ingredient_type: ingredientType
        };
        
        if (ingredientType === 'raw') {
          baseData.raw_material_id = ing.id;
        } else if (ingredientType === 'semi') {
          baseData.semi_finished_id = ing.id;
        }
        
        return baseData;
      });
      
      if (isEditing) {
        console.log("Updating existing product:", initialData.id);
        
        // تحديث المنتج النصف مصنع الموجود
        const { data: updatedProduct, error: updateError } = await supabase
          .from('semi_finished_products')
          .update({
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            min_stock: values.min_stock,
            unit_cost: values.unit_cost,
            sales_price: values.sales_price
          })
          .eq('id', initialData.id)
          .select();
          
        if (updateError) {
          console.error("Error updating product:", updateError);
          throw updateError;
        }
        
        console.log("Product updated successfully, now handling ingredients");
        
        // حذف المكونات القديمة
        const { error: deleteError } = await supabase
          .from('semi_finished_ingredients')
          .delete()
          .eq('semi_finished_product_id', initialData.id);
        
        if (deleteError) {
          console.error("Error deleting old ingredients:", deleteError);
          throw deleteError;
        }
        
        console.log("Old ingredients deleted successfully");
        
        // إذا كان هناك مكونات جديدة، نضيفها
        if (ingredients.length > 0) {
          console.log("Adding new ingredients to product:", initialData.id);
          
          // إضافة معرف المنتج لكل مكون
          const finalIngredientData = ingredientsData.map(ing => ({
            ...ing,
            semi_finished_product_id: initialData.id
          }));
          
          // إضافة المكونات بعملية واحدة
          const { error: insertError } = await supabase
            .from('semi_finished_ingredients')
            .insert(finalIngredientData);
            
          if (insertError) {
            console.error("Error inserting new ingredients:", insertError);
            throw insertError;
          }
          
          console.log("New ingredients added successfully");
        }
        
        return updatedProduct;
      } else {
        console.log("Creating new product");
        
        // الحصول على آخر كود موجود لإنشاء كود جديد
        const { data: maxCode } = await supabase
          .from('semi_finished_products')
          .select('code')
          .order('code', { ascending: false })
          .limit(1);
          
        let newCode = 'SFP-00001';
        if (maxCode && maxCode.length > 0) {
          const lastCode = maxCode[0].code;
          const lastNum = parseInt(lastCode.split('-')[1]);
          newCode = `SFP-${String(lastNum + 1).padStart(5, '0')}`;
        }
        
        console.log("Generated new code:", newCode);
        
        // إنشاء منتج نصف مصنع جديد
        const { data: newProduct, error: insertError } = await supabase
          .from('semi_finished_products')
          .insert({
            code: newCode,
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            min_stock: values.min_stock,
            unit_cost: values.unit_cost,
            sales_price: values.sales_price
          })
          .select();
          
        if (insertError) {
          console.error("Error creating new product:", insertError);
          throw insertError;
        }
        
        console.log("New product created successfully:", newProduct);
        
        // إذا كان هناك مكونات وتم إنشاء المنتج بنجاح، نضيف المكونات
        if (ingredients.length > 0 && newProduct && newProduct.length > 0) {
          console.log("Adding ingredients to new product:", newProduct[0].id);
          
          // إضافة معرف المنتج الجديد لكل مكون
          const finalIngredientData = ingredientsData.map(ing => ({
            ...ing,
            semi_finished_product_id: newProduct[0].id
          }));
          
          // إضافة جميع المكونات بعملية واحدة
          const { error: ingredientsError } = await supabase
            .from('semi_finished_ingredients')
            .insert(finalIngredientData);
            
          if (ingredientsError) {
            console.error("Error adding ingredients:", ingredientsError);
            throw ingredientsError;
          }
          
          console.log("Ingredients added successfully");
        }
        
        return newProduct;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success(isEditing ? 'تم تعديل المنتج النصف مصنع بنجاح' : 'تمت إضافة المنتج النصف مصنع بنجاح');
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  const onSubmit = (values: z.infer<typeof semiFinishedSchema>) => {
    if (ingredients.length === 0) {
      toast.error('يجب إضافة مكون واحد على الأقل');
      return;
    }
    
    if (!validateTotalPercentage()) {
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
            أدخل بيانات المنتج النصف مصنع مع المكونات ونسبها
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
                    <Input {...field} placeholder="أدخل اسم المنتج النصف مصنع" />
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
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        {...field}
                        value={totalCost > 0 ? totalCost.toFixed(2) : field.value}
                        className={totalCost > 0 ? "bg-green-50" : ""}
                        title={totalCost > 0 ? "تم حساب التكلفة تلقائيًا من المكونات" : ""}
                      />
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
            
            <div className="space-y-4">
              <h3 className="text-md font-medium">مكونات المنتج</h3>
              
              <IngredientSelector
                rawMaterials={rawMaterials}
                semiFinishedProducts={isEditing ? 
                  semiFinishedProducts.filter(p => p.id !== initialData.id) : 
                  semiFinishedProducts}
                onAddIngredient={handleAddIngredient}
                ingredients={ingredients}
                hasWater={hasWater}
                onToggleWater={setHasWater}
              />
              
              <IngredientsList
                ingredients={ingredients}
                onRemoveIngredient={handleRemoveIngredient}
                hasWater={hasWater}
                totalCost={totalCost}
              />
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

export default SemiFinishedForm;
