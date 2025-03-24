
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ToastAction } from '@/components/ui/toast';

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_stock: number;
  type: 'raw_material' | 'semi_finished' | 'packaging' | 'finished';
}

const LowStockNotifier: React.FC = () => {
  const { toast } = useToast();
  const [notifiedItems, setNotifiedItems] = useState<Record<string, boolean>>({});
  
  // Query to get all low stock items across tables
  const { data: lowStockItems } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      try {
        // Get raw materials with low stock
        const { data: rawMaterials, error: rawMaterialsError } = await supabase
          .from('raw_materials')
          .select('id, name, quantity, min_stock')
          .lt('quantity', 'min_stock');
        
        if (rawMaterialsError) throw rawMaterialsError;
        
        // Get semi-finished products with low stock
        const { data: semiFinished, error: semiFinishedError } = await supabase
          .from('semi_finished_products')
          .select('id, name, quantity, min_stock')
          .lt('quantity', 'min_stock');
        
        if (semiFinishedError) throw semiFinishedError;
        
        // Get packaging materials with low stock
        const { data: packaging, error: packagingError } = await supabase
          .from('packaging_materials')
          .select('id, name, quantity, min_stock')
          .lt('quantity', 'min_stock');
        
        if (packagingError) throw packagingError;
        
        // Get finished products with low stock
        const { data: finished, error: finishedError } = await supabase
          .from('finished_products')
          .select('id, name, quantity, min_stock')
          .lt('quantity', 'min_stock');
        
        if (finishedError) throw finishedError;
        
        // Add type field to each item for identification
        const typedRawMaterials = (rawMaterials || []).map(item => ({ ...item, type: 'raw_material' as const }));
        const typedSemiFinished = (semiFinished || []).map(item => ({ ...item, type: 'semi_finished' as const }));
        const typedPackaging = (packaging || []).map(item => ({ ...item, type: 'packaging' as const }));
        const typedFinished = (finished || []).map(item => ({ ...item, type: 'finished' as const }));
        
        // Combine all low stock items
        return [
          ...typedRawMaterials,
          ...typedSemiFinished,
          ...typedPackaging,
          ...typedFinished
        ];
      } catch (error) {
        console.error('Error fetching low stock items:', error);
        return [];
      }
    },
    refetchInterval: 60000 // Check every minute
  });
  
  // Show toast notifications when there are low stock items
  useEffect(() => {
    if (!lowStockItems || lowStockItems.length === 0) return;
    
    // Only show one notification at a time to avoid spamming
    let timeoutDelay = 0;
    
    lowStockItems.forEach((item: LowStockItem) => {
      const itemKey = `${item.type}-${item.id}`;
      
      // Only notify if we haven't already notified about this item
      if (!notifiedItems[itemKey]) {
        setTimeout(() => {
          toast({
            title: "تنبيه: مخزون منخفض",
            description: `${item.name} أقل من الحد الأدنى (${item.quantity}/${item.min_stock})`,
            variant: "warning",
            duration: 5000,
            action: (
              <ToastAction asChild altText="عرض التفاصيل">
                <Link to="/inventory/low-stock">عرض</Link>
              </ToastAction>
            )
          });
          
          // Mark item as notified
          setNotifiedItems(prev => ({
            ...prev,
            [itemKey]: true
          }));
        }, timeoutDelay);
        
        timeoutDelay += 500; // Stagger notifications
      }
    });
    
    // Every hour, reset notification status to re-notify about persistent issues
    const interval = setInterval(() => {
      setNotifiedItems({});
    }, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [lowStockItems, toast, notifiedItems]);
  
  return null; // This component doesn't render anything
};

export default LowStockNotifier;
