
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { enhancedToast } from '@/components/ui/enhanced-toast';

interface RecalculateImportanceButtonProps {
  materialType: 'raw' | 'packaging';
}

const RecalculateImportanceButton: React.FC<RecalculateImportanceButtonProps> = ({ materialType }) => {
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = React.useState(false);
  
  const handleRecalculate = async () => {
    try {
      setIsCalculating(true);
      
      // Get production orders to analyze material usage
      const { data: productionOrders, error: orderError } = await supabase
        .from('production_orders')
        .select('*');
        
      if (orderError) throw orderError;
      
      // Collect all ingredients from orders
      const allIngredients: Record<string, number> = {};
      
      for (const order of productionOrders || []) {
        // Get ingredients for this order
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('production_order_ingredients')
          .select('*')
          .eq('production_order_id', order.id);
          
        if (ingredientsError) throw ingredientsError;
        
        // Count usage of each ingredient
        for (const ingredient of ingredients || []) {
          const code = ingredient.raw_material_code;
          allIngredients[code] = (allIngredients[code] || 0) + 1;
        }
      }
      
      // Calculate importance based on usage frequency
      const materialTable = materialType === 'raw' ? 'raw_materials' : 'packaging_materials';
      const { data: materials, error: materialsError } = await supabase
        .from(materialTable)
        .select('id, code');
        
      if (materialsError) throw materialsError;
      
      // Update importance values
      for (const material of materials || []) {
        const usageCount = allIngredients[material.code] || 0;
        let importance = 0;
        
        // Set importance based on usage
        if (usageCount > 10) importance = 2;      // High importance
        else if (usageCount > 5) importance = 1;  // Medium importance
        else importance = 0;                      // Low importance
        
        // Update the material's importance
        const { error: updateError } = await supabase
          .from(materialTable)
          .update({ importance })
          .eq('id', material.id);
          
        if (updateError) throw updateError;
      }
      
      // Refresh data
      queryClient.invalidateQueries({ 
        queryKey: [materialType === 'raw' ? 'rawMaterials' : 'packagingMaterials'] 
      });
      
      enhancedToast.success('تم إعادة حساب أهمية المواد بنجاح');
    } catch (error) {
      enhancedToast.error(error as Error);
    } finally {
      setIsCalculating(false);
    }
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleRecalculate}
      disabled={isCalculating}
    >
      <RefreshCw size={16} className={`mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
      إعادة حساب الأهمية
    </Button>
  );
};

export default RecalculateImportanceButton;
