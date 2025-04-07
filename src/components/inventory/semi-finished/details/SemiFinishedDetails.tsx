
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ProductInfo from './ProductInfo';
import IngredientsCard from './IngredientsCard';
import MovementHistoryCard from './MovementHistoryCard';
import { Loader } from 'lucide-react';

interface SemiFinishedDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

const SemiFinishedDetails: React.FC<SemiFinishedDetailsProps> = ({ isOpen, onClose, product }) => {
  // Fetch product ingredients 
  const { data: ingredients = [], isLoading: isLoadingIngredients, error: ingredientsError } = useQuery({
    queryKey: ['semiFinishedIngredients', product?.id],
    queryFn: async () => {
      // Fetch raw materials first
      const { data: rawIngredients, error: rawError } = await supabase
        .from('semi_finished_ingredients')
        .select(`
          id,
          percentage,
          ingredient_type,
          raw_material:raw_material_id(id, code, name, type: 'raw')
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
          semi_finished:semi_finished_id(id, code, name, type: 'semi')
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
      
      // Combine and format all ingredients
      const formattedIngredients = [
        ...(rawIngredients || []).map(item => ({
          id: item.id,
          percentage: item.percentage,
          ingredient_type: item.ingredient_type,
          ingredient_data: {
            ...item.raw_material,
            type: 'raw'
          }
        })),
        ...(semiIngredients || []).map(item => ({
          id: item.id,
          percentage: item.percentage,
          ingredient_type: item.ingredient_type,
          ingredient_data: {
            ...item.semi_finished,
            type: 'semi'
          }
        })),
        ...(waterIngredients || []).map(item => ({
          id: item.id,
          percentage: item.percentage,
          ingredient_type: item.ingredient_type,
          ingredient_data: {
            id: 0,
            code: 'WATER',
            name: 'ماء',
            type: 'water'
          }
        }))
      ];
      
      return formattedIngredients;
    },
    enabled: !!product?.id
  });
  
  // Helper to get ingredient data when needed
  const getIngredientData = (ingredient: any) => {
    return ingredient.ingredient_data || {};
  };
  
  if (!product) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل المنتج النصف مصنع: {product.name}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details">معلومات المنتج</TabsTrigger>
            <TabsTrigger value="ingredients">المكونات</TabsTrigger>
            <TabsTrigger value="movements">حركة المخزون</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            <ProductInfo product={product} />
          </TabsContent>
          
          <TabsContent value="ingredients" className="mt-4">
            {isLoadingIngredients ? (
              <div className="flex justify-center items-center h-40">
                <Loader className="w-6 h-6 animate-spin" />
                <span className="mr-2">جاري تحميل المكونات...</span>
              </div>
            ) : (
              <IngredientsCard 
                ingredients={ingredients} 
                isLoadingIngredients={isLoadingIngredients}
                ingredientsError={ingredientsError}
                getIngredientData={getIngredientData}
              />
            )}
          </TabsContent>
          
          <TabsContent value="movements" className="mt-4">
            <MovementHistoryCard 
              itemId={product.id.toString()} 
              itemType="semi" 
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>إغلاق</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SemiFinishedDetails;
