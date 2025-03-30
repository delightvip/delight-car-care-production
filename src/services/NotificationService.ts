
import { supabase, lowStockQueries } from '@/integrations/supabase/client';

// استدعاء بيانات المخزون المنخفض
export async function fetchLowStockItems() {
  try {
    console.log("Fetching low stock items using optimized database function...");
    
    // استخدام الوظيفة الجديدة للحصول على جميع عناصر المخزون المنخفض في استدعاء واحد
    const { data: lowStockItems, error } = await lowStockQueries.getAllLowStockItems();
    
    if (error) {
      console.error("Error fetching low stock items:", error);
      throw error;
    }
    
    // حساب إحصائيات كل نوع من العناصر
    const rawMaterialsCount = lowStockItems?.filter(item => item.type === 'raw')?.length || 0;
    const semiFinishedCount = lowStockItems?.filter(item => item.type === 'semi')?.length || 0;
    const packagingCount = lowStockItems?.filter(item => item.type === 'packaging')?.length || 0;
    const finishedCount = lowStockItems?.filter(item => item.type === 'finished')?.length || 0;
    
    // إجمالي العناصر منخفضة المخزون
    const totalCount = lowStockItems?.length || 0;
    
    console.log(`Total low stock items: ${totalCount} (Raw: ${rawMaterialsCount}, Semi: ${semiFinishedCount}, Packaging: ${packagingCount}, Finished: ${finishedCount})`);
    
    // إعادة تنظيم النتائج
    return {
      totalCount,
      items: lowStockItems || [],
      counts: {
        rawMaterials: rawMaterialsCount,
        semiFinished: semiFinishedCount,
        packaging: packagingCount,
        finished: finishedCount
      }
    };
  } catch (error) {
    console.error("خطأ في جلب عناصر المخزون المنخفض:", error);
    
    // في حال فشل الوظيفة الجديدة، نرجع إلى الطريقة القديمة كخطة بديلة
    console.log("Falling back to original low stock query method...");
    return fetchLowStockItemsOriginal();
  }
}

// طريقة احتياطية تستخدم الاستدعاءات المنفصلة القديمة
async function fetchLowStockItemsOriginal() {
  try {
    console.log("Using original low stock queries as fallback...");
    
    // فحص المواد الأولية ذات المخزون المنخفض 
    const rawMaterialsResponse = await lowStockQueries.rawMaterials();
    
    // فحص المنتجات نصف المصنعة ذات المخزون المنخفض 
    const semiFinishedResponse = await lowStockQueries.semiFinishedProducts();
    
    // فحص مستلزمات التعبئة ذات المخزون المنخفض 
    const packagingResponse = await lowStockQueries.packagingMaterials();
    
    // فحص المنتجات النهائية ذات المخزون المنخفض 
    const finishedResponse = await lowStockQueries.finishedProducts();
    
    // تحقق من الأخطاء
    if (rawMaterialsResponse.error) throw rawMaterialsResponse.error;
    if (semiFinishedResponse.error) throw semiFinishedResponse.error;
    if (packagingResponse.error) throw packagingResponse.error;
    if (finishedResponse.error) throw finishedResponse.error;
    
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
    console.error("خطأ في جلب عناصر المخزون المنخفض (طريقة احتياطية):", error);
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
