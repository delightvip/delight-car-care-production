
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Ingredient } from '@/types/inventoryTypes';

const semiFinishedSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يحتوي الاسم على حرفين على الأقل" }),
  unit: z.string().min(1, { message: "يرجى اختيار وحدة القياس" }),
  quantity: z.coerce.number().min(0, { message: "الكمية يجب أن تكون 0 أو أكثر" }),
  unit_cost: z.coerce.number().min(0, { message: "التكلفة يجب أن تكون 0 أو أكثر" }),
  sales_price: z.coerce.number().min(0, { message: "سعر البيع يجب أن تكون 0 أو أكثر" }),
  min_stock: z.coerce.number().min(0, { message: "الحد الأدنى يجب أن يكون 0 أو أكثر" })
});

const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

export const useSemiFinishedForm = (initialData: any, semiFinishedProducts: any[]) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [hasWater, setHasWater] = useState<boolean>(false);
  const [totalCost, setTotalCost] = useState<number>(0);
  const isEditing = !!initialData;
  
  // Initialize the form
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
  
  // Fetch ingredients when editing
  useEffect(() => {
    if (isEditing && initialData) {
      const fetchIngredients = async () => {
        try {
          // Get raw material ingredients
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
          
          // Get semi-finished ingredients
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
          
          // Get water ingredients
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
          
          // Format raw ingredients
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
          
          // Format semi-finished ingredients
          if (semiIngredientsData && semiIngredientsData.length > 0) {
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
          
          // Format water ingredients
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
          
          // Combine all ingredients
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
  
  // Calculate total cost
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
  
  // Handle adding an ingredient
  const handleAddIngredient = (ingredient: Ingredient) => {
    setIngredients([...ingredients, ingredient]);
    
    if (ingredient.ingredient_type === 'water') {
      setHasWater(true);
    }
  };
  
  // Handle removing an ingredient
  const handleRemoveIngredient = (id: number, type: string) => {
    setIngredients(ingredients.filter(ing => {
      if (type === 'water' && ing.ingredient_type === 'water') {
        setHasWater(false);
        return false;
      }
      return !(ing.id === id && ing.ingredient_type === type);
    }));
  };
  
  // Validate total percentage
  const validateTotalPercentage = (): boolean => {
    if (hasWater) return true;
    
    const total = ingredients.reduce((sum, ing) => sum + ing.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`مجموع النسب يجب أن يكون 100%، الإجمالي الحالي: ${total}%`);
      return false;
    }
    return true;
  };
  
  return {
    form,
    ingredients,
    hasWater,
    totalCost,
    handleAddIngredient,
    handleRemoveIngredient,
    setHasWater,
    validateTotalPercentage
  };
};
