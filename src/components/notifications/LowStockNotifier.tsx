
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LowStockNotifier: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Fetch low stock items
  const { data: lowStockItems } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      const rawMaterialsResponse = await supabase
        .from('raw_materials')
        .select('id, code, name, quantity, min_stock, unit')
        .lt('quantity', supabase.raw('min_stock'));
      
      const semiFinishedResponse = await supabase
        .from('semi_finished_products')
        .select('id, code, name, quantity, min_stock, unit')
        .lt('quantity', supabase.raw('min_stock'));
      
      const packagingResponse = await supabase
        .from('packaging_materials')
        .select('id, code, name, quantity, min_stock, unit')
        .lt('quantity', supabase.raw('min_stock'));
      
      const finishedResponse = await supabase
        .from('finished_products')
        .select('id, code, name, quantity, min_stock, unit')
        .lt('quantity', supabase.raw('min_stock'));
      
      // Map the data to include category
      const rawData = (rawMaterialsResponse.data || []).map(item => ({
        ...item,
        category: 'raw_materials',
        categoryName: 'المواد الأولية'
      }));
      
      const semiData = (semiFinishedResponse.data || []).map(item => ({
        ...item,
        category: 'semi_finished',
        categoryName: 'المنتجات النصف مصنعة'
      }));
      
      const packagingData = (packagingResponse.data || []).map(item => ({
        ...item,
        category: 'packaging',
        categoryName: 'مستلزمات التعبئة'
      }));
      
      const finishedData = (finishedResponse.data || []).map(item => ({
        ...item,
        category: 'finished_products',
        categoryName: 'المنتجات النهائية'
      }));
      
      // Combine all data
      return [...rawData, ...semiData, ...packagingData, ...finishedData];
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });
  
  // Show notifications for critical items (below 30% of min stock)
  useEffect(() => {
    if (lowStockItems && lowStockItems.length > 0) {
      // Show notification for total count
      toast({
        title: `${lowStockItems.length} عنصر منخفض المخزون`,
        description: "هناك عناصر وصلت إلى الحد الأدنى للمخزون",
        variant: "destructive",
        action: (
          <button 
            className="bg-destructive-foreground text-destructive px-3 py-1 rounded-md text-xs font-medium"
            onClick={() => navigate('/inventory/low-stock')}
          >
            عرض
          </button>
        )
      });
      
      // Find critical items (less than 30% of min stock)
      const criticalItems = lowStockItems.filter(
        item => (item.quantity / item.min_stock) * 100 < 30
      );
      
      // Show separate notifications for critical items (up to 3)
      criticalItems.slice(0, 3).forEach(item => {
        toast({
          title: `${item.name} منخفض بشكل حرج`,
          description: `المخزون الحالي: ${item.quantity} ${item.unit} (${Math.round((item.quantity / item.min_stock) * 100)}%)`,
          variant: "destructive",
          action: (
            <button 
              className="bg-destructive-foreground text-destructive px-3 py-1 rounded-md text-xs font-medium"
              onClick={() => navigate('/inventory/low-stock')}
            >
              عرض
            </button>
          )
        });
      });
    }
  }, [lowStockItems, navigate, toast]);
  
  return null; // This is a headless component, it doesn't render anything
};

export default LowStockNotifier;
