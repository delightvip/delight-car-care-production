
import { supabase } from '@/integrations/supabase/client';

// استدعاء بيانات المخزون المنخفض
export async function fetchLowStockItems() {
  try {
    console.log("Fetching low stock items...");
    
    // فحص المواد الأولية ذات المخزون المنخفض
    const rawMaterialsResponse = await supabase
      .from('raw_materials')
      .select('id, name, quantity, min_stock, code, unit, unit_cost')
      .lt('quantity', 'min_stock')
      .gt('min_stock', 0);
    
    // فحص المنتجات نصف المصنعة ذات المخزون المنخفض
    const semiFinishedResponse = await supabase
      .from('semi_finished_products')
      .select('id, name, quantity, min_stock, code, unit, unit_cost')
      .lt('quantity', 'min_stock')
      .gt('min_stock', 0);
    
    // فحص مستلزمات التعبئة ذات المخزون المنخفض
    const packagingResponse = await supabase
      .from('packaging_materials')
      .select('id, name, quantity, min_stock, code, unit, unit_cost')
      .lt('quantity', 'min_stock')
      .gt('min_stock', 0);
    
    // فحص المنتجات النهائية ذات المخزون المنخفض
    const finishedResponse = await supabase
      .from('finished_products')
      .select('id, name, quantity, min_stock, code, unit, unit_cost')
      .lt('quantity', 'min_stock')
      .gt('min_stock', 0);
    
    // تحقق من الأخطاء
    if (rawMaterialsResponse.error) {
      console.error("Error fetching raw materials:", rawMaterialsResponse.error);
      throw rawMaterialsResponse.error;
    }
    if (semiFinishedResponse.error) {
      console.error("Error fetching semi-finished products:", semiFinishedResponse.error);
      throw semiFinishedResponse.error;
    }
    if (packagingResponse.error) {
      console.error("Error fetching packaging materials:", packagingResponse.error);
      throw packagingResponse.error;
    }
    if (finishedResponse.error) {
      console.error("Error fetching finished products:", finishedResponse.error);
      throw finishedResponse.error;
    }
    
    console.log("Raw materials low stock count:", rawMaterialsResponse.data?.length || 0);
    console.log("Semi-finished low stock count:", semiFinishedResponse.data?.length || 0);
    console.log("Packaging low stock count:", packagingResponse.data?.length || 0);
    console.log("Finished products low stock count:", finishedResponse.data?.length || 0);
    
    // حساب إجمالي العناصر ذات المخزون المنخفض
    const rawMaterialsCount = rawMaterialsResponse.data?.length || 0;
    const semiFinishedCount = semiFinishedResponse.data?.length || 0;
    const packagingCount = packagingResponse.data?.length || 0;
    const finishedCount = finishedResponse.data?.length || 0;
    
    const totalCount = 
      rawMaterialsCount + 
      semiFinishedCount + 
      packagingCount + 
      finishedCount;
    
    // تجميع قائمة بالعناصر المنخفضة
    const lowStockItems = [
      ...(rawMaterialsResponse.data || []).map(item => ({ ...item, type: 'raw', typeName: 'مواد أولية' })),
      ...(semiFinishedResponse.data || []).map(item => ({ ...item, type: 'semi', typeName: 'منتجات نصف مصنعة' })),
      ...(packagingResponse.data || []).map(item => ({ ...item, type: 'packaging', typeName: 'مستلزمات تعبئة' })),
      ...(finishedResponse.data || []).map(item => ({ ...item, type: 'finished', typeName: 'منتجات نهائية' }))
    ];
    
    return {
      totalCount,
      items: lowStockItems,
      counts: {
        rawMaterials: rawMaterialsCount,
        semiFinished: semiFinishedCount,
        packaging: packagingCount,
        finished: finishedCount
      }
    };
  } catch (error) {
    console.error("خطأ في جلب عناصر المخزون المنخفض:", error);
    throw error;
  }
}

// الحصول على أيقونة لنوع المخزون
export function getItemTypeIcon(type: string, size: number = 16) {
  const icons = {
    raw: { component: 'Package', color: 'text-blue-600' },
    semi: { component: 'Beaker', color: 'text-purple-600' },
    packaging: { component: 'Box', color: 'text-green-600' },
    finished: { component: 'ShoppingBag', color: 'text-amber-600' },
    default: { component: 'AlertTriangle', color: 'text-red-600' }
  };
  
  return icons[type as keyof typeof icons] || icons.default;
}

// الحصول على لون خلفية لنوع المخزون 
export function getItemTypeBgColor(type: string) {
  const colors = {
    raw: 'bg-blue-600',
    semi: 'bg-purple-600',
    packaging: 'bg-green-600',
    finished: 'bg-amber-600',
    default: 'bg-red-600'
  };
  
  return colors[type as keyof typeof colors] || colors.default;
}
