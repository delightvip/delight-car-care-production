
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryMovement } from '@/types/inventoryTypes';
import { ArrowDownIcon, ArrowUpIcon, RefreshCwIcon } from 'lucide-react';

interface InventoryMovementStatsProps {
  movements: InventoryMovement[];
  selectedCategory: string;
}

const InventoryMovementStats: React.FC<InventoryMovementStatsProps> = ({ movements, selectedCategory }) => {
  // Filter movements by the selected category if not "all"
  const filteredMovements = React.useMemo(() => {
    if (selectedCategory === 'all') {
      return movements;
    }
    return movements.filter(m => m.category === selectedCategory);
  }, [movements, selectedCategory]);
  
  // Calculate stats
  const stats = React.useMemo(() => {
    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Count by type
    const inCount = filteredMovements.filter(m => m.type === 'in').length;
    const outCount = filteredMovements.filter(m => m.type === 'out').length;
    const adjustmentCount = filteredMovements.filter(m => m.type === 'adjustment').length;
    
    // Sum quantities by type
    const inQuantity = filteredMovements
      .filter(m => m.type === 'in')
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    
    const outQuantity = filteredMovements
      .filter(m => m.type === 'out')
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    
    // Recent movements (last 30 days)
    const recentMovements = filteredMovements.filter(m => {
      if (!m.date && m.created_at) {
        m.date = new Date(m.created_at);
      }
      return m.date && m.date > thirtyDaysAgo;
    });
    
    return {
      totalMovements: filteredMovements.length,
      inCount,
      outCount,
      adjustmentCount,
      inQuantity,
      outQuantity,
      recentMovementsCount: recentMovements.length,
      recentInQuantity: recentMovements
        .filter(m => m.type === 'in')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0),
      recentOutQuantity: recentMovements
        .filter(m => m.type === 'out')
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0)
    };
  }, [filteredMovements]);
  
  // Calculate net flow (in - out)
  const netFlow = stats.inQuantity - stats.outQuantity;
  const netFlowRecent = stats.recentInQuantity - stats.recentOutQuantity;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">إجمالي حركات المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{stats.totalMovements}</div>
            <div className="flex flex-col items-center text-xs">
              <div className="flex items-center">
                <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-500">{stats.inCount}</span>
              </div>
              <div className="flex items-center">
                <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-red-500">{stats.outCount}</span>
              </div>
              <div className="flex items-center">
                <RefreshCwIcon className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-blue-500">{stats.adjustmentCount}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            عدد جميع الحركات المسجلة في النظام
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الكميات الواردة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inQuantity.toFixed(2)}</div>
          <div className="flex items-center mt-1">
            <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-xs text-green-500">
              {stats.inCount} حركة وارد
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            مجموع جميع الكميات المضافة للمخزون
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الكميات الصادرة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.outQuantity.toFixed(2)}</div>
          <div className="flex items-center mt-1">
            <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-xs text-red-500">
              {stats.outCount} حركة صرف
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            مجموع جميع الكميات المصروفة من المخزون
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">صافي حركة المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netFlow >= 0 ? '+' : ''}{netFlow.toFixed(2)}
          </div>
          <div className="flex items-center mt-1">
            {netFlowRecent >= 0 ? (
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-xs ${netFlowRecent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {netFlowRecent >= 0 ? '+' : ''}{netFlowRecent.toFixed(2)} في آخر 30 يوم
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            الفرق بين إجمالي الوارد والصادر
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryMovementStats;
