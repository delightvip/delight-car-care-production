
import { supabase } from '@/integrations/supabase/client';
import { enhancedToast } from '@/components/ui/enhanced-toast';

/**
 * Analyzes inventory data to identify items that may be candidates for liquidation
 * or repurposing based on usage patterns and stock levels.
 */
export const analyzeInventoryForOptimization = async (
  type: 'raw' | 'packaging' | 'semi' | 'finished',
  dayThreshold: number = 90
) => {
  try {
    const tableName = 
      type === 'raw' ? 'raw_materials' :
      type === 'packaging' ? 'packaging_materials' :
      type === 'semi' ? 'semi_finished_products' :
      'finished_products';
    
    // Get all items of selected type
    const { data: items, error: itemsError } = await supabase
      .from(tableName)
      .select('id, code, name, quantity, unit, unit_cost');
    
    if (itemsError) throw itemsError;
    
    // Get movements for these items
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('item_type', type)
      .order('created_at', { ascending: false });
    
    if (movementsError) throw movementsError;
    
    // Create a date threshold (e.g., 90 days ago)
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - dayThreshold);
    
    // Analyze each item
    const analysisResults = items?.map(item => {
      // Find movements for this item
      const itemMovements = movements?.filter(
        m => m.item_id === item.id.toString()
      ) || [];
      
      // Determine if stagnant (no movements in threshold period)
      const hasRecentMovements = itemMovements.some(
        m => new Date(m.created_at) > thresholdDate
      );
      
      // Calculate days since last movement
      let daysSinceLastMovement = null;
      if (itemMovements.length > 0) {
        const lastMovementDate = new Date(itemMovements[0].created_at);
        const diffTime = Math.abs(new Date().getTime() - lastMovementDate.getTime());
        daysSinceLastMovement = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      // Calculate financial impact (value of stagnant inventory)
      const financialImpact = (item.quantity || 0) * (item.unit_cost || 0);
      
      return {
        id: item.id,
        code: item.code,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        isStagnant: !hasRecentMovements,
        daysSinceLastMovement,
        financialImpact,
        recommendation: !hasRecentMovements 
          ? 'يُنصح بمراجعة استخدام هذا العنصر أو بيعه إذا لم يكن ضروريًا'
          : 'العنصر نشط، لا توجد توصيات حالية'
      };
    });
    
    // Filter for stagnant items only
    return (analysisResults || []).filter(item => item.isStagnant);
  } catch (error) {
    console.error('Error analyzing inventory for optimization:', error);
    enhancedToast.error('حدث خطأ أثناء تحليل بيانات المخزون');
    return [];
  }
};

/**
 * Generates a summary report of inventory value distribution
 */
export const generateInventoryValueReport = async () => {
  try {
    // Fetch data from each inventory category
    const { data: rawMaterials, error: rawError } = await supabase
      .from('raw_materials')
      .select('code, name, quantity, unit_cost');
      
    if (rawError) throw rawError;
    
    const { data: packagingMaterials, error: packagingError } = await supabase
      .from('packaging_materials')
      .select('code, name, quantity, unit_cost');
      
    if (packagingError) throw packagingError;
    
    const { data: semiFinished, error: semiError } = await supabase
      .from('semi_finished_products')
      .select('code, name, quantity, unit_cost');
      
    if (semiError) throw semiError;
    
    const { data: finishedProducts, error: finishedError } = await supabase
      .from('finished_products')
      .select('code, name, quantity, unit_cost');
      
    if (finishedError) throw finishedError;
    
    // Calculate total values for each category
    const calculateTotalValue = (items: any[]) => {
      return items.reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.unit_cost || 0));
      }, 0);
    };
    
    const rawValue = calculateTotalValue(rawMaterials || []);
    const packagingValue = calculateTotalValue(packagingMaterials || []);
    const semiFinishedValue = calculateTotalValue(semiFinished || []);
    const finishedValue = calculateTotalValue(finishedProducts || []);
    const totalValue = rawValue + packagingValue + semiFinishedValue + finishedValue;
    
    // Generate percentage distribution
    return {
      totalValue,
      distribution: [
        { name: 'المواد الخام', value: rawValue, percentage: (rawValue / totalValue) * 100 },
        { name: 'مواد التعبئة', value: packagingValue, percentage: (packagingValue / totalValue) * 100 },
        { name: 'المنتجات النصف مصنعة', value: semiFinishedValue, percentage: (semiFinishedValue / totalValue) * 100 },
        { name: 'المنتجات النهائية', value: finishedValue, percentage: (finishedValue / totalValue) * 100 }
      ]
    };
  } catch (error) {
    console.error('Error generating inventory value report:', error);
    enhancedToast.error('حدث خطأ أثناء إنشاء تقرير قيمة المخزون');
    return { totalValue: 0, distribution: [] };
  }
};
