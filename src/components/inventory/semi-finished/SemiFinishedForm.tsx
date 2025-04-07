
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

// Define form schema
const semiFinishedSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يحتوي الاسم على حرفين على الأقل" }),
  unit: z.string().min(1, { message: "يرجى اختيار وحدة القياس" }),
  quantity: z.coerce.number().min(0, { message: "الكمية يجب أن تكون 0 أو أكثر" }),
  unit_cost: z.coerce.number().min(0, { message: "التكلفة يجب أن تكون 0 أو أكثر" }),
  sales_price: z.coerce.number().min(0, { message: "سعر البيع يجب أن يكون 0 أو أكثر" }),
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
  
  // Fetch raw materials
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
  
  // Fetch semi-finished products
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
  
  // Load existing ingredients if editing
  useEffect(() => {
    if (isEditing && initialData) {
      // Fetch ingredients for this product
      const fetchIngredients = async () => {
        const { data, error } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            id,
            percentage,
            ingredient_type,
            raw_material_id,
            semi_finished_id,
            raw_material:raw_material_id(id, code, name, unit, unit_cost),
            semi_finished_product:semi_finished_id(id, code, name, unit, unit_cost)
          `)
          .eq('semi_finished_product_id', initialData.id);
          
        if (error) {
          toast.error('خطأ في جلب المكونات');
          return;
        }
        
        // Format ingredients for our state
        const formattedIngredients: Ingredient[] = data?.map((ing) => {
          if (ing.ingredient_type === 'raw' && ing.raw_material) {
            return {
              id: ing.raw_material.id,
              code: ing.raw_material.code,
              name: ing.raw_material.name,
              percentage: ing.percentage,
              ingredient_type: 'raw',
              unit: ing.raw_material.unit,
              unit_cost: ing.raw_material.unit_cost
            };
          } else if (ing.ingredient_type === 'semi' && ing.semi_finished_product) {
            return {
              id: ing.semi_finished_product.id,
              code: ing.semi_finished_product.code,
              name: ing.semi_finished_product.name,
              percentage: ing.percentage,
              ingredient_type: 'semi',
              unit: ing.semi_finished_product.unit,
              unit_cost: ing.semi_finished_product.unit_cost
            };
          } else if (ing.ingredient_type === 'water') {
            setHasWater(true);
            return {
              id: 0,
              code: 'WATER',
              name: 'ماء',
              percentage: ing.percentage,
              ingredient_type: 'water',
              is_auto_calculated: true,
              unit_cost: 0
            };
          }
          
          // Fallback for any unexpected cases
          return {
            id: ing.raw_material?.id || 0,
            code: ing.raw_material?.code || '',
            name: ing.raw_material?.name || '',
            percentage: ing.percentage,
            ingredient_type: 'raw',
            unit: ing.raw_material?.unit || '',
            unit_cost: ing.raw_material?.unit_cost || 0
          };
        }) || [];
        
        setIngredients(formattedIngredients);
      };
      
      fetchIngredients();
    }
  }, [isEditing, initialData]);
  
  // Calculate total cost from ingredients
  useEffect(() => {
    if (ingredients.length === 0) {
      setTotalCost(0);
      return;
    }
    
    const calculatedCost = ingredients.reduce((total, ing) => {
      if (!ing.unit_cost) return total;
      return total + ((ing.percentage / 100) * ing.unit_cost);
    }, 0);
    
    setTotalCost(calculatedCost);
    
    // Update form with calculated cost
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
      if (type === 'water' && (ing as any).ingredient_type === 'water') {
        setHasWater(false);
        return false;
      }
      return !(ing.id === id && (ing as any).ingredient_type === type);
    }));
  };
  
  const validateTotalPercentage = (): boolean => {
    // If we have water, it will always calculate to 100%
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
      // Prepare the ingredients data for saving
      const ingredientsData = ingredients.map(ing => {
        const ingredientType = (ing as any).ingredient_type || 'raw';
        
        // Base data structure
        const baseData = {
          percentage: ing.percentage,
          ingredient_type: ingredientType,
        };
        
        // Add type-specific fields
        if (ingredientType === 'raw') {
          return {
            ...baseData,
            raw_material_id: ing.id,
            semi_finished_id: null
          };
        } else if (ingredientType === 'semi') {
          return {
            ...baseData,
            raw_material_id: null,
            semi_finished_id: ing.id
          };
        } else if (ingredientType === 'water') {
          return {
            ...baseData,
            raw_material_id: null,
            semi_finished_id: null
          };
        }
        
        return baseData;
      });
      
      if (isEditing) {
        // Update existing product
        const { data, error } = await supabase
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
          
        if (error) throw error;
        
        // Handle ingredients - first delete existing
        await supabase
          .from('semi_finished_ingredients')
          .delete()
          .eq('semi_finished_product_id', initialData.id);
        
        // Then insert new ingredients
        if (ingredients.length > 0) {
          const finalIngredientData = ingredientsData.map(ing => ({
            ...ing,
            semi_finished_product_id: initialData.id
          }));
          
          const { error: ingredientError } = await supabase
            .from('semi_finished_ingredients')
            .insert(finalIngredientData);
            
          if (ingredientError) throw ingredientError;
        }
        
        return data;
      } else {
        // Generate a code for new record
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
        
        // Insert new product
        const { data, error } = await supabase
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
          
        if (error) throw error;
        
        // Insert ingredients
        if (ingredients.length > 0 && data && data.length > 0) {
          const finalIngredientData = ingredientsData.map(ing => ({
            ...ing,
            semi_finished_product_id: data[0].id
          }));
          
          const { error: ingredientError } = await supabase
            .from('semi_finished_ingredients')
            .insert(finalIngredientData);
            
          if (ingredientError) throw ingredientError;
        }
        
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success(isEditing ? 'تم تعديل المنتج النصف مصنع بنجاح' : 'تمت إضافة المنتج النصف مصنع بنجاح');
      onClose();
      form.reset();
    },
    onError: (error: any) => {
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
