
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Package2, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface InventorySummaryStatsProps {
  itemId: string;
  itemType: string;
}

export const InventorySummaryStats: React.FC<InventorySummaryStatsProps> = ({ itemId, itemType }) => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['inventory-summary', itemType, itemId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inventory_summary_stats', {
        p_item_id: itemId,
        p_item_type: itemType
      });
      
      if (error) throw error;
      
      return data || {
        total_movements: 0,
        total_in: 0,
        total_out: 0,
        adjustments: 0,
        current_quantity: 0
      };
    }
  });
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">حدث خطأ أثناء تحميل البيانات</p>
        </CardContent>
      </Card>
    );
  }

  const items = [
    {
      title: 'المخزون الحالي',
      value: stats.current_quantity,
      description: 'الرصيد المتوفر',
      icon: Package2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'إجمالي الوارد',
      value: stats.total_in,
      description: 'إجمالي الكميات الواردة',
      icon: ArrowDown,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'إجمالي الصادر',
      value: stats.total_out,
      description: 'إجمالي الكميات المستهلكة',
      icon: ArrowUp,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    },
    {
      title: 'التعديلات',
      value: stats.adjustments,
      description: 'جرد وتعديلات المخزون',
      icon: RefreshCw,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {item.title}
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {item.value.toLocaleString('ar-EG')}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.description}
                </p>
              </div>
              <div className={`p-3 rounded-full ${item.bgColor}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
