
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

// مكونات تم تقسيمها
import ProductInfo from './details/ProductInfo';
import IngredientsCard from './details/IngredientsCard';
import MovementsCard from './details/MovementsCard';

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
            raw_material:raw_material_id(id, code, name, unit, unit_cost)
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
            semi_finished_id
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
        
        // If we have semi-finished ingredients, fetch their details
        let enhancedSemiIngredients = [];
        if (semiIngredients && semiIngredients.length > 0) {
          const semiIds = semiIngredients
            .map(ing => ing.semi_finished_id)
            .filter(id => id != null);
          
          if (semiIds.length > 0) {
            const { data: semiDetails, error: detailsError } = await supabase
              .from('semi_finished_products')
              .select('id, code, name, unit, unit_cost')
              .in('id', semiIds);
              
            if (detailsError) throw detailsError;
            
            // Combine the data
            enhancedSemiIngredients = semiIngredients.map(ing => {
              if (!ing.semi_finished_id) return null;
              const details = semiDetails.find(s => s.id === ing.semi_finished_id);
              if (!details) return null;
              
              return {
                ...ing,
                semi_finished_product: details
              };
            }).filter(Boolean);
          }
        }
        
        // Combine all ingredients
        const allIngredients = [
          ...(rawIngredients || []),
          ...enhancedSemiIngredients,
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
      } else if (ingredient.ingredient_type === 'semi' && ingredient.semi_finished_product) {
        return {
          name: ingredient.semi_finished_product.name,
          code: ingredient.semi_finished_product.code,
          unit: ingredient.semi_finished_product.unit,
          type: 'semi',
          unit_cost: ingredient.semi_finished_product.unit_cost
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
            <MovementsCard productId={String(product.id)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SemiFinishedDetails;
