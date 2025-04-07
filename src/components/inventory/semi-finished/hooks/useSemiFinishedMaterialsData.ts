
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSemiFinishedMaterialsData = (excludeProductId?: number) => {
  // Fetch raw materials
  const { 
    data: rawMaterials = [], 
    isLoading: isRawMaterialsLoading 
  } = useQuery({
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
  const { 
    data: semiFinishedProducts = [], 
    isLoading: isSemiFinishedLoading 
  } = useQuery({
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
  
  return {
    rawMaterials,
    isRawMaterialsLoading,
    semiFinishedProducts,
    isSemiFinishedLoading
  };
};
