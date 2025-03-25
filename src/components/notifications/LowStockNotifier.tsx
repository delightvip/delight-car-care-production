
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Package, Beaker, Box, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

const LowStockNotifier = () => {
  const { toast } = useToast();
  
  // استعلام الحصول على عناصر المخزون المنخفض
  const { data: lowStockItems, error } = useQuery({
    queryKey: ['notifierLowStockItems'],
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
        console.log("المنتجات النصف مصنعة:", semiFinishedCount);
        console.log("المنتجات النهائية:", finishedCount);
        
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
    },
    refetchInterval: 45000, // التحقق كل 45 ثانية
  });
  
  useEffect(() => {
    if (error) {
      console.error("خطأ في مراقبة المخزون المنخفض:", error);
      return;
    }
    
    if (lowStockItems && lowStockItems.totalCount > 0) {
      // شعار أيقونة المخزون المنخفض حسب النوع
      const getIconForType = (type: string) => {
        switch (type) {
          case 'raw':
            return <Package size={16} className="text-white" />;
          case 'semi':
            return <Beaker size={16} className="text-white" />;
          case 'packaging':
            return <Box size={16} className="text-white" />;
          case 'finished':
            return <ShoppingBag size={16} className="text-white" />;
          default:
            return <AlertTriangle size={16} className="text-white" />;
        }
      };
      
      // إنشاء إشعارات منفصلة لكل نوع من المخزون المنخفض
      if (lowStockItems.counts.rawMaterials > 0) {
        const rawItems = lowStockItems.items.filter(item => item.type === 'raw');
        displayToast('المواد الأولية', rawItems, 'raw');
      }
      
      if (lowStockItems.counts.semiFinished > 0) {
        const semiItems = lowStockItems.items.filter(item => item.type === 'semi');
        displayToast('المنتجات النصف مصنعة', semiItems, 'semi');
      }
      
      if (lowStockItems.counts.packaging > 0) {
        const packagingItems = lowStockItems.items.filter(item => item.type === 'packaging');
        displayToast('مستلزمات التعبئة', packagingItems, 'packaging');
      }
      
      if (lowStockItems.counts.finished > 0) {
        const finishedItems = lowStockItems.items.filter(item => item.type === 'finished');
        displayToast('المنتجات النهائية', finishedItems, 'finished');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowStockItems, toast]);
  
  // دالة عرض الإشعار
  const displayToast = (categoryName: string, items: any[], type: string) => {
    const count = items.length;
    
    // تحضير نص وصف إضافي للإشعار
    let description = `يوجد ${count} عنصر منخفض في ${categoryName} يحتاج إلى تجديد.`;
    
    // عرض أول ثلاثة عناصر كمثال إذا كان هناك أكثر من عنصر
    if (items.length > 0) {
      const exampleItems = items.slice(0, 3);
      const exampleText = exampleItems.map(item => `${item.name}`).join('، ');
      description += `\nمثال: ${exampleText}`;
    }
    
    // تحديد لون الخلفية حسب نوع المخزون
    let bgColor = 'bg-red-600';
    switch (type) {
      case 'raw':
        bgColor = 'bg-blue-600';
        break;
      case 'semi':
        bgColor = 'bg-purple-600';
        break;
      case 'packaging':
        bgColor = 'bg-green-600';
        break;
      case 'finished':
        bgColor = 'bg-amber-600';
        break;
    }
    
    // عرض الإشعار
    toast({
      title: `تنبيه مخزون ${categoryName} المنخفض`,
      description: (
        <div>
          <p>{description}</p>
          <Link 
            to="/inventory/low-stock" 
            className="block mt-2 text-sm font-semibold text-primary hover:underline"
          >
            عرض كل المخزون المنخفض
          </Link>
        </div>
      ),
      variant: "destructive",
      duration: 7000,
      action: (
        <div className={`h-8 w-8 ${bgColor} rounded-full flex items-center justify-center`}>
          {getIconForType(type)}
        </div>
      )
    });
  };
  
  return null; // هذا المكون لا يعرض أي شيء
};

export default LowStockNotifier;
