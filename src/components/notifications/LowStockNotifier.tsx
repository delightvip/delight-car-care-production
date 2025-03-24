
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

const LowStockNotifier = () => {
  const { toast } = useToast();
  
  // استعلام الحصول على عناصر المخزون المنخفض
  const { data: lowStockCount, error } = useQuery({
    queryKey: ['notifierLowStockCount'],
    queryFn: async () => {
      try {
        // فحص المواد الأولية ذات المخزون المنخفض
        const rawMaterialsResponse = await supabase
          .from('raw_materials')
          .select('id, name, quantity, min_stock, code')
          .lt('quantity', 10);
        
        // فحص المنتجات نصف المصنعة ذات المخزون المنخفض
        const semiFinishedResponse = await supabase
          .from('semi_finished_products')
          .select('id, name, quantity, min_stock, code')
          .lt('quantity', 10);
        
        // فحص مستلزمات التعبئة ذات المخزون المنخفض
        const packagingResponse = await supabase
          .from('packaging_materials')
          .select('id, name, quantity, min_stock, code')
          .lt('quantity', 10);
        
        // فحص المنتجات النهائية ذات المخزون المنخفض
        const finishedResponse = await supabase
          .from('finished_products')
          .select('id, name, quantity, min_stock, code')
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
        
        console.log("إجمالي عناصر المخزون المنخفض:", totalCount);
        console.log("المواد الأولية:", rawMaterialsCount);
        console.log("مستلزمات التعبئة:", packagingCount);
        
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
    refetchInterval: 30000, // التحقق كل 30 ثانية
  });
  
  useEffect(() => {
    if (error) {
      console.error("خطأ في مراقبة المخزون المنخفض:", error);
      return;
    }
    
    if (lowStockCount && lowStockCount.totalCount > 0) {
      // تحضير نص وصف إضافي للإشعار
      let description = `يوجد ${lowStockCount.totalCount} عنصر منخفض في المخزون يحتاج إلى تجديد.`;
      
      // إضافة تفاصيل أكثر حول أنواع العناصر المنخفضة
      const itemDetails = [];
      if (lowStockCount.counts.rawMaterials > 0) {
        itemDetails.push(`${lowStockCount.counts.rawMaterials} مواد أولية`);
      }
      if (lowStockCount.counts.semiFinished > 0) {
        itemDetails.push(`${lowStockCount.counts.semiFinished} منتجات نصف مصنعة`);
      }
      if (lowStockCount.counts.packaging > 0) {
        itemDetails.push(`${lowStockCount.counts.packaging} مستلزمات تعبئة`);
      }
      if (lowStockCount.counts.finished > 0) {
        itemDetails.push(`${lowStockCount.counts.finished} منتجات نهائية`);
      }
      
      if (itemDetails.length > 0) {
        description += ` (${itemDetails.join('، ')})`;
      }
      
      // معلومات إضافية عن بعض العناصر المهمة
      if (lowStockCount.items.length > 0) {
        // عرض أول ثلاثة عناصر كمثال
        const exampleItems = lowStockCount.items.slice(0, 3);
        description += `\nمثال: ${exampleItems.map(item => `${item.name} (${item.type})`).join('، ')}`;
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
