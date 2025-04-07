
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import refactored components
import ProductInfo from './ProductInfo';
import IngredientsCard from './IngredientsCard';
import MovementHistoryCard from './MovementHistoryCard';

interface SemiFinishedDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

const SemiFinishedDetails: React.FC<SemiFinishedDetailsProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const [activeTab, setActiveTab] = useState('details');
  
  // Fetch ingredients for this product
  const {
    data: ingredients,
    isLoading: isLoadingIngredients,
    error: ingredientsError
  } = useQuery({
    queryKey: ['semiFinishedIngredients', product?.id],
    queryFn: async () => {
      try {
        if (!product?.id) return [];
        
        // Fetch raw material ingredients
        const { data: rawIngredients, error: rawError } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            id,
            percentage,
            ingredient_type,
            raw_material_id,
            raw_material:raw_materials(id, code, name, unit, unit_cost)
          `)
          .eq('semi_finished_product_id', product.id)
          .eq('ingredient_type', 'raw');
          
        if (rawError) throw rawError;
        
        // Fetch semi-finished ingredients
        const { data: semiIngredients, error: semiError } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            id,
            percentage,
            ingredient_type,
            semi_finished_id,
            semi_finished:semi_finished_products(id, code, name, unit, unit_cost)
          `)
          .eq('semi_finished_product_id', product.id)
          .eq('ingredient_type', 'semi');
          
        if (semiError) throw semiError;
        
        // Fetch water ingredients
        const { data: waterIngredients, error: waterError } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            id,
            percentage,
            ingredient_type
          `)
          .eq('semi_finished_product_id', product.id)
          .eq('ingredient_type', 'water');
          
        if (waterError) throw waterError;
        
        // Combine all ingredients
        const allIngredients = [
          ...(rawIngredients || []),
          ...(semiIngredients || []),
          ...(waterIngredients || []).map(ing => ({
            ...ing,
            is_water: true
          }))
        ];
        
        return allIngredients || [];
      } catch (error) {
        console.error("Error fetching ingredients:", error);
        return [];
      }
    },
    enabled: !!product?.id
  });
  
  // Format ingredient data for display
  const getIngredientData = (ingredient: any) => {
    // Check if ingredient exists and is properly formatted
    if (!ingredient) return {
      name: 'غير معروف',
      code: '',
      unit: '',
      type: 'unknown',
      unit_cost: 0
    };

    try {
      if (ingredient.ingredient_type === 'raw' && ingredient.raw_material) {
        return {
          name: ingredient.raw_material.name,
          code: ingredient.raw_material.code,
          unit: ingredient.raw_material.unit,
          type: 'raw',
          unit_cost: ingredient.raw_material.unit_cost
        };
      } else if (ingredient.ingredient_type === 'semi' && ingredient.semi_finished) {
        return {
          name: ingredient.semi_finished.name,
          code: ingredient.semi_finished.code,
          unit: ingredient.semi_finished.unit,
          type: 'semi',
          unit_cost: ingredient.semi_finished.unit_cost
        };
      } else if (ingredient.ingredient_type === 'water' || ingredient.is_water) {
        return {
          name: 'ماء',
          code: 'WATER',
          unit: 'لتر',
          type: 'water',
          unit_cost: 0
        };
      }
    } catch (e) {
      console.error("Error formatting ingredient data:", e, ingredient);
    }
    
    // Fallback
    return {
      name: 'غير معروف',
      code: '',
      unit: '',
      type: 'unknown',
      unit_cost: 0
    };
  };
  
  if (!product) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل المنتج النصف مصنع</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="details">معلومات المنتج</TabsTrigger>
            <TabsTrigger value="movements">حركات المخزون</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <ProductInfo product={product} />
            <IngredientsCard 
              ingredients={ingredients || []}
              isLoadingIngredients={isLoadingIngredients}
              ingredientsError={ingredientsError}
              getIngredientData={getIngredientData}
            />
          </TabsContent>
          
          <TabsContent value="movements">
            <MovementHistoryCard itemId={String(product.id)} itemType="semi" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SemiFinishedDetails;
