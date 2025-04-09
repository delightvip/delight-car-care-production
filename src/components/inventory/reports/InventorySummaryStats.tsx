
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, BarChart3, Scale } from 'lucide-react';

interface InventorySummaryStatsProps {
  itemId: string;
  itemType: string;
}

interface SummaryStatsData {
  total_movements: number;
  total_in: number;
  total_out: number;
  adjustments: number;
  current_quantity: number;
}

const InventorySummaryStats: React.FC<InventorySummaryStatsProps> = ({ itemId, itemType }) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['inventory-summary-stats', itemType, itemId],
    queryFn: async () => {
      try {
        // Get current quantity from the respective inventory table
        let currentQuantity = 0;
        
        // Use the RPC function instead of direct table access to fix the type error
        const { data: statsData, error: statsError } = await supabase.rpc('get_inventory_summary_stats', {
          p_item_id: itemId,
          p_item_type: itemType
        });
        
        if (statsError) {
          console.error('Error fetching inventory summary stats:', statsError);
          throw statsError;
        }
        
        if (statsData && Array.isArray(statsData) && statsData.length > 0) {
          // The RPC returns an array with a single object, so we need to extract it
          return statsData[0] as SummaryStatsData;
        }
        
        // Fallback: if RPC fails, attempt direct table query with proper type checking
        let tableToQuery = '';
        
        switch (itemType) {
          case 'raw':
            tableToQuery = 'raw_materials';
            break;
          case 'semi':
            tableToQuery = 'semi_finished_products';
            break;
          case 'packaging':
            tableToQuery = 'packaging_materials';
            break;
          case 'finished':
            tableToQuery = 'finished_products';
            break;
        }
        
        if (tableToQuery) {
          try {
            // Create a type safe approach to querying different tables
            type InventoryTable = { id: number; quantity: number };
            
            // Use explicit typing and cast the result to our expected interface
            const { data, error } = await supabase
              .from(tableToQuery)
              .select('quantity')
              .eq('id', parseInt(itemId))
              .single<InventoryTable>();
              
            if (!error && data) {
              currentQuantity = data.quantity || 0;
            }
          } catch (err) {
            console.error(`Error fetching quantity from ${tableToQuery}:`, err);
          }
        }
        
        // Get movements from inventory_movements table
        const { data: movements, error: movementsError } = await supabase
          .from('inventory_movements')
          .select('quantity, reason')
          .eq('item_id', itemId)
          .eq('item_type', itemType);
          
        if (movementsError) throw movementsError;
        
        // Calculate stats from movements
        const totalMovements = movements?.length || 0;
        let totalIn = 0;
        let totalOut = 0;
        let adjustments = 0;
        
        movements?.forEach(movement => {
          if (movement.quantity > 0) {
            totalIn += Number(movement.quantity);
          } else if (movement.quantity < 0) {
            totalOut += Math.abs(Number(movement.quantity));
          }
          
          if (movement.reason === 'adjustment') {
            adjustments += Math.abs(Number(movement.quantity));
          }
        });
        
        // Return formatted stats
        return {
          total_movements: totalMovements,
          total_in: totalIn,
          total_out: totalOut,
          adjustments: adjustments,
          current_quantity: currentQuantity
        } as SummaryStatsData;
      } catch (error) {
        console.error('Error fetching inventory summary stats:', error);
        return { 
          total_movements: 0, 
          total_in: 0, 
          total_out: 0, 
          adjustments: 0, 
          current_quantity: 0 
        } as SummaryStatsData;
      }
    }
  });
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  
  if (!stats) {
    return <div className="text-center text-muted-foreground">تعذر تحميل الإحصائيات</div>;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard 
        title="إجمالي الحركات"
        value={stats.total_movements}
        icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
        suffix=""
      />
      <StatCard 
        title="إجمالي الوارد"
        value={stats.total_in}
        icon={<ArrowDown className="h-5 w-5 text-green-500" />}
        suffix=""
      />
      <StatCard 
        title="إجمالي المنصرف"
        value={stats.total_out}
        icon={<ArrowUp className="h-5 w-5 text-red-500" />}
        suffix=""
      />
      <StatCard 
        title="التسويات"
        value={stats.adjustments}
        icon={<Scale className="h-5 w-5 text-amber-500" />}
        suffix=""
      />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, suffix }) => {
  return (
    <div className="bg-white dark:bg-card rounded-lg p-4 shadow-sm border border-border/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="p-2 bg-secondary/20 rounded-full">{icon}</div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">
          {value?.toLocaleString('ar-EG')}
          {suffix && <span className="text-sm font-normal text-muted-foreground mr-1">{suffix}</span>}
        </p>
      </div>
    </div>
  );
};

export default InventorySummaryStats;
