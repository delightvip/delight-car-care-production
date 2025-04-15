
import { useEffect } from 'react';
import InventoryTrackingIntegrationService from '@/services/InventoryTrackingIntegrationService';
import { useQuery } from '@tanstack/react-query';

/**
 * مكون تهيئة تتبع المخزون
 * يستخدم لتهيئة خدمة تتبع المخزون وإعداد المستمعين المختلفة عند بدء التطبيق
 */
const InventoryTrackingInitializer = () => {
  // تهيئة خدمة التكامل
  useEffect(() => {
    const integrationService = InventoryTrackingIntegrationService.getInstance();
    
    // تهيئة مستمعي قاعدة البيانات (إذا كان ذلك مدعومًا)
    integrationService.initializeDatabaseListeners();
    
    return () => {
      // لا حاجة لتنظيف المستمعين لأنها مرتبطة بنافذة المتصفح
    };
  }, []);
  
  // تهيئة سجل حركات المخزون
  useQuery({
    queryKey: ['initializeInventoryMovements'],
    queryFn: async () => {
      const integrationService = InventoryTrackingIntegrationService.getInstance();
      await integrationService.initializeInventoryMovements();
      return true;
    },
    staleTime: Infinity, // تنفيذ مرة واحدة فقط
    retry: false
  });
  
  // لا عرض لهذا المكون
  return null;
};

export default InventoryTrackingInitializer;
