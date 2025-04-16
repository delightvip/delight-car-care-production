
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, LayersIcon, BarChart4Icon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import InventoryMovementReportingService from '@/services/inventory/InventoryMovementReportingService';
import { Skeleton } from '@/components/ui/skeleton';

// واجهة الخصائص
interface InventoryMovementStatsProps {
  selectedCategory?: string;
}

const InventoryMovementStats: React.FC<InventoryMovementStatsProps> = ({ 
  selectedCategory 
}) => {
  const reportingService = InventoryMovementReportingService.getInstance();
  
  // الحصول على ملخص حركات المخزون
  const { data: stats, isLoading } = useQuery({
    queryKey: ['inventory-movement-stats', selectedCategory],
    queryFn: async () => {
      return reportingService.getMovementsSummary();
    },
    refetchInterval: 60000, // تحديث كل دقيقة
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // تحديد بيانات العرض حسب التصنيف المحدد
  const filteredStats = selectedCategory && selectedCategory !== 'all'
    ? {
        ...stats,
        inMovements: stats.byItemType.find((t: any) => t.item_type === selectedCategory)?.count || 0,
        outMovements: stats.byItemType.find((t: any) => t.item_type === selectedCategory)?.count || 0,
      }
    : stats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الحركات</CardTitle>
          <BarChart4Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{filteredStats.totalMovements}</div>
          <p className="text-xs text-muted-foreground">
            جميع حركات المخزون المسجلة في النظام
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">حركات الوارد</CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{filteredStats.inMovements}</div>
          <p className="text-xs text-muted-foreground">
            عدد حركات الإضافة للمخزون / {filteredStats.totalInQuantity.toFixed(2)} وحدة
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">حركات الصادر</CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{filteredStats.outMovements}</div>
          <p className="text-xs text-muted-foreground">
            عدد حركات الصرف من المخزون / {filteredStats.totalOutQuantity.toFixed(2)} وحدة
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">صافي الحركة</CardTitle>
          <LayersIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{filteredStats.netQuantity.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            إجمالي الوارد - إجمالي الصادر
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryMovementStats;
