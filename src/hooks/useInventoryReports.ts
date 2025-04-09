
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { enhancedToast } from '@/components/ui/enhanced-toast';

interface UseInventoryReportsOptions {
  type?: 'raw' | 'packaging' | 'semi' | 'finished' | 'all';
  period?: number; // Days to look back
}

interface InventoryItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  type: string;
  typeName: string;
  lastMovement?: string | null;
  daysSinceLastMovement?: number | null;
}

export const useInventoryReports = (options: UseInventoryReportsOptions = {}) => {
  const { type = 'all', period = 90 } = options;
  const [filter, setFilter] = useState({ type, period });
  
  // Calculate threshold date
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - filter.period);
  
  // Query for unused items
  const unusedItemsQuery = useQuery({
    queryKey: ['unused-items', filter.type],
    queryFn: async () => {
      try {
        // Fetch semi-finished ingredients to identify which raw materials are used
        const { data: semiIngredients } = await supabase
          .from('semi_finished_ingredients')
          .select('raw_material_id');
          
        // Fetch production orders to identify which materials are used in production
        const { data: productionIngredients } = await supabase
          .from('production_order_ingredients')
          .select('raw_material_code');
          
        // Fetch packaging orders to identify which packaging materials are used
        const { data: packagingMaterials } = await supabase
          .from('packaging_order_materials')
          .select('packaging_material_code');
        
        // Get all raw materials or only those of a specific type
        const fetchRawMaterials = filter.type === 'all' || filter.type === 'raw';
        const fetchPackagingMaterials = filter.type === 'all' || filter.type === 'packaging';
        
        let unusedItems: InventoryItem[] = [];
        
        // Process raw materials if needed
        if (fetchRawMaterials) {
          const { data: rawMaterials } = await supabase
            .from('raw_materials')
            .select('id, code, name, quantity, unit');
            
          // Get used raw material IDs
          const usedRawIds = new Set((semiIngredients || []).map(item => item.raw_material_id));
          const usedRawCodes = new Set((productionIngredients || []).map(item => item.raw_material_code));
          
          // Find unused raw materials
          const unusedRaw = (rawMaterials || []).filter(item => 
            !usedRawIds.has(item.id) && !usedRawCodes.has(item.code)
          ).map(item => ({
            ...item,
            type: 'raw' as const,
            typeName: 'مواد خام'
          }));
          
          unusedItems = [...unusedItems, ...unusedRaw];
        }
        
        // Process packaging materials if needed
        if (fetchPackagingMaterials) {
          const { data: packagingItems } = await supabase
            .from('packaging_materials')
            .select('id, code, name, quantity, unit');
            
          // Get used packaging material codes
          const usedPackagingCodes = new Set((packagingMaterials || []).map(item => item.packaging_material_code));
          
          // Find unused packaging materials
          const unusedPackaging = (packagingItems || []).filter(item => 
            !usedPackagingCodes.has(item.code)
          ).map(item => ({
            ...item,
            type: 'packaging' as const,
            typeName: 'مواد تعبئة'
          }));
          
          unusedItems = [...unusedItems, ...unusedPackaging];
        }
        
        return unusedItems;
      } catch (error) {
        console.error('Error fetching unused items:', error);
        enhancedToast.error('حدث خطأ أثناء جلب بيانات العناصر غير المستخدمة');
        return [];
      }
    },
    enabled: true,
  });
  
  // Query for stagnant items
  const stagnantItemsQuery = useQuery({
    queryKey: ['stagnant-items', filter.type, filter.period],
    queryFn: async () => {
      try {
        // Get inventory movements
        const { data: movements } = await supabase
          .from('inventory_movements')
          .select('item_id, item_type, created_at')
          .order('created_at', { ascending: false });
          
        // Create a map of last movement date for each item
        const lastMovementMap = new Map();
        (movements || []).forEach(movement => {
          const key = `${movement.item_type}-${movement.item_id}`;
          if (!lastMovementMap.has(key)) {
            lastMovementMap.set(key, movement.created_at);
          }
        });
        
        // Fetch items based on type filter
        let stagnantItems: InventoryItem[] = [];
        
        // Function to process a category of items
        const processCategory = async (
          table: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products', 
          type: 'raw' | 'packaging' | 'semi' | 'finished', 
          typeName: string
        ) => {
          if (filter.type !== 'all' && filter.type !== type) return [];
          
          const { data: items } = await supabase
            .from(table)
            .select('id, code, name, quantity, unit');
            
          return (items || []).map(item => {
            const lastMovementDate = lastMovementMap.get(`${type}-${item.id}`);
            let daysSince = null;
            
            if (lastMovementDate) {
              const lastDate = new Date(lastMovementDate);
              const diffTime = Math.abs(thresholdDate.getTime() - lastDate.getTime());
              daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              // If movement is more recent than threshold, this isn't stagnant
              if (lastDate > thresholdDate) return null;
            }
            
            return {
              ...item,
              type,
              typeName,
              lastMovement: lastMovementDate,
              daysSinceLastMovement: daysSince || filter.period + 30 // If no movement, assume older than threshold
            };
          }).filter(Boolean) as InventoryItem[];
        };
        
        // Process each inventory category
        const rawItems = await processCategory('raw_materials', 'raw', 'مواد خام');
        const packagingItems = await processCategory('packaging_materials', 'packaging', 'مواد تعبئة');
        const semiItems = await processCategory('semi_finished_products', 'semi', 'منتجات نصف مصنعة');
        const finishedItems = await processCategory('finished_products', 'finished', 'منتجات نهائية');
        
        // Combine all stagnant items
        stagnantItems = [...rawItems, ...packagingItems, ...semiItems, ...finishedItems];
        
        // Sort by days since last movement
        return stagnantItems.sort((a, b) => (b.daysSinceLastMovement || 0) - (a.daysSinceLastMovement || 0));
      } catch (error) {
        console.error('Error fetching stagnant items:', error);
        enhancedToast.error('حدث خطأ أثناء جلب بيانات العناصر الراكدة');
        return [];
      }
    },
    enabled: true,
  });
  
  return {
    unusedItems: {
      data: unusedItemsQuery.data || [],
      isLoading: unusedItemsQuery.isLoading,
      isError: unusedItemsQuery.isError
    },
    stagnantItems: {
      data: stagnantItemsQuery.data || [],
      isLoading: stagnantItemsQuery.isLoading,
      isError: stagnantItemsQuery.isError
    },
    filter,
    setFilter
  };
};
