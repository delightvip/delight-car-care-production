
import { supabase } from '@/integrations/supabase/client';

export interface InventoryDistributionData {
  name: string;
  value: number;
}

export async function fetchInventoryDistributionData(): Promise<InventoryDistributionData[]> {
  try {
    // جلب بيانات المواد الأولية
    const { data: rawMaterialsData, error: rawMaterialsError } = await supabase
      .from('raw_materials')
      .select('quantity, unit_cost');
    
    if (rawMaterialsError) throw new Error(rawMaterialsError.message);
    
    // جلب بيانات المنتجات النصف مصنعة
    const { data: semiFinishedData, error: semiFinishedError } = await supabase
      .from('semi_finished_products')
      .select('quantity, unit_cost');
    
    if (semiFinishedError) throw new Error(semiFinishedError.message);
    
    // جلب بيانات مستلزمات التعبئة
    const { data: packagingData, error: packagingError } = await supabase
      .from('packaging_materials')
      .select('quantity, unit_cost');
    
    if (packagingError) throw new Error(packagingError.message);
    
    // جلب بيانات المنتجات النهائية
    const { data: finishedData, error: finishedError } = await supabase
      .from('finished_products')
      .select('quantity, unit_cost');
    
    if (finishedError) throw new Error(finishedError.message);
    
    // حساب القيم الإجمالية لكل نوع - ensure data arrays are not null
    const rawMaterialsValue = (rawMaterialsData || []).reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);
    
    const semiFinishedValue = (semiFinishedData || []).reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);
    
    const packagingValue = (packagingData || []).reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);
    
    const finishedValue = (finishedData || []).reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0);
    
    console.log("Inventory distribution data:", {
      rawMaterialsValue,
      semiFinishedValue,
      packagingValue,
      finishedValue
    });
    
    // تنسيق البيانات للرسم البياني
    return [
      { name: 'المواد الأولية', value: rawMaterialsValue },
      { name: 'المنتجات النصف مصنعة', value: semiFinishedValue },
      { name: 'مواد التعبئة', value: packagingValue },
      { name: 'المنتجات النهائية', value: finishedValue }
    ];
  } catch (error) {
    console.error("Error fetching inventory distribution data:", error);
    throw error;
  }
}

export const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1'];
