
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpFromLine, ArrowDownToLine, RefreshCw, Activity } from 'lucide-react';
import { InventoryMovementData } from '@/services/InventoryMovementService';

interface InventoryMovementStatsProps {
  movements: InventoryMovementData[];
  selectedCategory: string;
}

const InventoryMovementStats: React.FC<InventoryMovementStatsProps> = ({ movements, selectedCategory }) => {
  const stats = useMemo(() => {
    const filteredMovements = selectedCategory === 'all' 
      ? movements 
      : movements.filter(m => m.category === selectedCategory);
    
    const totalMovements = filteredMovements.length;
    
    const inMovements = filteredMovements.filter(m => m.type === 'in');
    const outMovements = filteredMovements.filter(m => m.type === 'out');
    const adjustments = filteredMovements.filter(m => m.type === 'adjustment');
    
    const totalIn = inMovements.reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = outMovements.reduce((sum, m) => sum + m.quantity, 0);
    const totalAdjustments = adjustments.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    
    // Last 24 hours movements
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentMovements = filteredMovements.filter(m => m.date >= yesterday);
    const recentCount = recentMovements.length;
    
    return {
      totalMovements,
      totalIn,
      totalOut, 
      totalAdjustments,
      recentCount
    };
  }, [movements, selectedCategory]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">إجمالي الحركات</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalMovements}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.recentCount} حركة في آخر 24 ساعة
              </p>
            </div>
            <div className="rounded-full p-2 bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">إجمالي الوارد</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalIn.toFixed(0)}</h3>
              <p className="text-xs text-green-600 mt-1">
                وحدة مضافة
              </p>
            </div>
            <div className="rounded-full p-2 bg-green-100">
              <ArrowUpFromLine className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">إجمالي الصادر</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalOut.toFixed(0)}</h3>
              <p className="text-xs text-red-600 mt-1">
                وحدة مسحوبة
              </p>
            </div>
            <div className="rounded-full p-2 bg-red-100">
              <ArrowDownToLine className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">التعديلات</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalAdjustments.toFixed(0)}</h3>
              <p className="text-xs text-amber-600 mt-1">
                وحدة تم تعديلها
              </p>
            </div>
            <div className="rounded-full p-2 bg-amber-100">
              <RefreshCw className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryMovementStats;
