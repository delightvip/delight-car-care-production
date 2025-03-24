
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

const LowStockNotifier = () => {
  const { toast } = useToast();
  
  // تعديل استعلام الحصول على عناصر المخزون المنخفض
  const { data: lowStockCount, error } = useQuery({
    queryKey: ['notifierLowStockCount'],
    queryFn: async () => {
      try {
        // فحص المواد الأولية ذات المخزون المنخفض
        const rawMaterialsResponse = await supabase
          .from('raw_materials')
          .select('id, name, quantity, min_stock')
          .lt('quantity', 10);
        
        // فحص المنتجات نصف المصنعة ذات المخزون المنخفض
        const semiFinishedResponse = await supabase
          .from('semi_finished_products')
          .select('id, name, quantity, min_stock')
          .lt('quantity', 10);
        
        // فحص مستلزمات التعبئة ذات المخزون المنخفض
        const packagingResponse = await supabase
          .from('packaging_materials')
          .select('id, name, quantity, min_stock')
          .lt('quantity', 10);
        
        // فحص المنتجات النهائية ذات المخزون المنخفض
        const finishedResponse = await supabase
          .from('finished_products')
          .select('id, name, quantity, min_stock')
          .lt('quantity', 10);
        
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
          ...(rawMaterialsResponse.data || []).map(item => ({ ...item, type: 'مواد أولية' })),
          ...(semiFinishedResponse.data || []).map(item => ({ ...item, type: 'منتجات نصف مصنعة' })),
          ...(packagingResponse.data || []).map(item => ({ ...item, type: 'مستلزمات تعبئة' })),
          ...(finishedResponse.data || []).map(item => ({ ...item, type: 'منتجات نهائية' }))
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
    },
    refetchInterval: 60000, // التحقق كل دقيقة
  });
  
  useEffect(() => {
    if (error) {
      console.error("خطأ في مراقبة المخزون المنخفض:", error);
      return;
    }
    
    if (lowStockCount && lowStockCount.totalCount > 0) {
      // تحضير نص وصف إضافي للإشعار
      let description = `يوجد ${lowStockCount.totalCount} عنصر منخفض في المخزون يحتاج إلى تجديد.`;
      
      // إضافة تفاصيل أكثر إذا كان هناك أنواع محددة منخفضة
      if (lowStockCount.counts.rawMaterials > 0) {
        description += ` (${lowStockCount.counts.rawMaterials} مواد أولية)`;
      }
      if (lowStockCount.counts.packaging > 0) {
        description += ` (${lowStockCount.counts.packaging} مستلزمات تعبئة)`;
      }
      
      // عرض الإشعار
      toast({
        title: "تنبيه المخزون المنخفض",
        description: description,
        variant: "destructive",
        duration: 7000,
        action: (
          <div className="h-8 w-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        )
      });
    }
  }, [lowStockCount, toast]);
  
  return null; // هذا المكون لا يعرض أي شيء
};

export default LowStockNotifier;
