
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const LowStockNotifier: React.FC = () => {
  const { toast } = useToast();
  const [notified, setNotified] = useState<boolean>(false);

  // جلب العناصر منخفضة المخزون
  const { data: lowStockItems } = useQuery({
    queryKey: ['lowStockItemsNotifier'],
    queryFn: async () => {
      try {
        // جلب المواد الأولية منخفضة المخزون
        const rawMaterialsResponse = await supabase
          .from('raw_materials')
          .select('id, name, code, quantity')
          .lt('quantity', 10);
          
        // جلب المنتجات النصف مصنعة منخفضة المخزون
        const semiFinishedResponse = await supabase
          .from('semi_finished_products')
          .select('id, name, code, quantity')
          .lt('quantity', 10);
        
        // جلب مواد التعبئة منخفضة المخزون
        const packagingResponse = await supabase
          .from('packaging_materials')
          .select('id, name, code, quantity')
          .lt('quantity', 10);
        
        // جلب المنتجات النهائية منخفضة المخزون
        const finishedResponse = await supabase
          .from('finished_products')
          .select('id, name, code, quantity')
          .lt('quantity', 10);
        
        // تجميع النتائج
        return {
          rawMaterials: rawMaterialsResponse.data || [],
          semiFinishedProducts: semiFinishedResponse.data || [],
          packagingMaterials: packagingResponse.data || [],
          finishedProducts: finishedResponse.data || []
        };
      } catch (error) {
        console.error("Error fetching low stock items:", error);
        return {
          rawMaterials: [],
          semiFinishedProducts: [],
          packagingMaterials: [],
          finishedProducts: []
        };
      }
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    // إذا لم يتم العثور على عناصر أو تم الإشعار بالفعل، لا تظهر إشعارًا
    if (!lowStockItems || notified) return;
    
    const totalItems = 
      lowStockItems.rawMaterials.length + 
      lowStockItems.semiFinishedProducts.length + 
      lowStockItems.packagingMaterials.length + 
      lowStockItems.finishedProducts.length;
    
    if (totalItems === 0) return;
    
    // عرض الإشعار
    toast({
      title: "تنبيه: عناصر منخفضة المخزون",
      description: `يوجد ${totalItems} عنصر أقل من الحد الأدنى للمخزون`,
      variant: "destructive",
    });
    
    // تعيين حالة الإشعار لتجنب تكرار الإشعارات
    setNotified(true);
    
    // إعادة تعيين حالة الإشعار بعد فترة
    const timer = setTimeout(() => {
      setNotified(false);
    }, 3600000); // إعادة السماح بالإشعارات بعد ساعة
    
    return () => clearTimeout(timer);
  }, [lowStockItems, toast, notified]);

  return null; // هذا المكون غير مرئي
};

export default LowStockNotifier;
