
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

const LowStockNotifier = () => {
  const { toast } = useToast();
  
  // Fetch low stock items count
  const { data: lowStockCount } = useQuery({
    queryKey: ['notifierLowStockCount'],
    queryFn: async () => {
      try {
        // Check for low stock items
        const rawMaterialsResponse = await supabase
          .from('raw_materials')
          .select('id')
          .lt('quantity', 10);
        
        const semiFinishedResponse = await supabase
          .from('semi_finished_products')
          .select('id')
          .lt('quantity', 10);
        
        const packagingResponse = await supabase
          .from('packaging_materials')
          .select('id')
          .lt('quantity', 10);
        
        const finishedResponse = await supabase
          .from('finished_products')
          .select('id')
          .lt('quantity', 10);
        
        const totalCount = 
          (rawMaterialsResponse.data?.length || 0) + 
          (semiFinishedResponse.data?.length || 0) + 
          (packagingResponse.data?.length || 0) + 
          (finishedResponse.data?.length || 0);
        
        return totalCount;
      } catch (error) {
        console.error("Error fetching low stock items:", error);
        return 0;
      }
    },
    refetchInterval: 300000, // Check every 5 minutes
  });
  
  useEffect(() => {
    if (lowStockCount && lowStockCount > 0) {
      toast({
        title: "تنبيه المخزون المنخفض",
        description: `يوجد ${lowStockCount} عنصر منخفض في المخزون يحتاج إلى تجديد.`,
        variant: "destructive",
        duration: 5000,
        action: (
          <div className="h-8 w-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        )
      });
    }
  }, [lowStockCount, toast]);
  
  return null; // This component doesn't render anything
};

export default LowStockNotifier;
