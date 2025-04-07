
import { supabase } from '@/integrations/supabase/client';

// استدعاء بيانات المخزون المنخفض
export async function fetchLowStockItems() {
  try {
    console.log("Fetching low stock items using optimized database function...");
    
    // استخدام وظيفة قاعدة البيانات للحصول على عناصر المخزون المنخفض
    const { data: lowStockItems, error } = await supabase
      .rpc('get_all_low_stock_items');
    
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
    
    // في حال فشل الوظيفة، نرجع إلى طريقة بديلة باستخدام استعلامات منفصلة
    return fetchLowStockItemsFallback();
  }
}

// طريقة احتياطية باستخدام استعلامات منفصلة
async function fetchLowStockItemsFallback() {
  try {
    console.log("Using fallback method for low stock items...");
    
    // المواد الأولية منخفضة المخزون
    const { data: rawMaterials, error: rawError } = await supabase
      .from('raw_materials')
      .select('*')
      .filter('quantity', 'lt', 'min_stock');
    
    // المنتجات النصف مصنعة منخفضة المخزون
    const { data: semiFinished, error: semiError } = await supabase
      .from('semi_finished_products')
      .select('*')
      .filter('quantity', 'lt', 'min_stock');
    
    // مستلزمات التعبئة منخفضة المخزون
    const { data: packaging, error: packagingError } = await supabase
      .from('packaging_materials')
      .select('*')
      .filter('quantity', 'lt', 'min_stock');
    
    // المنتجات النهائية ذات المخزون المنخفض
    const { data: finished, error: finishedError } = await supabase
      .from('finished_products')
      .select('*')
      .filter('quantity', 'lt', 'min_stock');
    
    if (rawError || semiError || packagingError || finishedError) {
      throw new Error("Error fetching low stock items");
    }
    
    // تحويل البيانات إلى التنسيق المطلوب
    const formattedItems = [
      ...(rawMaterials || []).map(item => ({ 
        ...item, 
        type: 'raw', 
        type_name: 'مواد أولية',
        importance: item.importance || 0
      })),
      ...(semiFinished || []).map(item => ({ 
        ...item, 
        type: 'semi', 
        type_name: 'منتجات نصف مصنعة',
        importance: 0
      })),
      ...(packaging || []).map(item => ({ 
        ...item, 
        type: 'packaging', 
        type_name: 'مستلزمات تعبئة',
        importance: item.importance || 0
      })),
      ...(finished || []).map(item => ({ 
        ...item, 
        type: 'finished', 
        type_name: 'منتجات نهائية',
        importance: 0
      }))
    ];
    
    // الإحصائيات
    const rawCount = rawMaterials?.length || 0;
    const semiCount = semiFinished?.length || 0;
    const packagingCount = packaging?.length || 0;
    const finishedCount = finished?.length || 0;
    const totalCount = rawCount + semiCount + packagingCount + finishedCount;
    
    return {
      totalCount,
      items: formattedItems,
      counts: {
        rawMaterials: rawCount,
        semiFinished: semiCount,
        packaging: packagingCount,
        finished: finishedCount
      }
    };
  } catch (error) {
    console.error("خطأ في الطريقة البديلة لجلب عناصر المخزون المنخفض:", error);
    // في حالة الفشل الكامل، نرجع بيانات فارغة
    return {
      totalCount: 0,
      items: [],
      counts: {
        rawMaterials: 0,
        semiFinished: 0,
        packaging: 0,
        finished: 0
      }
    };
  }
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
