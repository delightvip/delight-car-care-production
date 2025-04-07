
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownCircle, ArrowUpCircle, Scale, BarChart3, PackageCheck } from 'lucide-react';
import { InventoryMovementData } from '@/services/InventoryMovementService';

interface InventoryMovementStatsProps {
  movements: InventoryMovementData[];
  selectedCategory: string;
}

const InventoryMovementStats: React.FC<InventoryMovementStatsProps> = ({ 
  movements,
  selectedCategory
}) => {
  // Calculate various statistics based on the movements data
  const stats = useMemo(() => {
    // Filter by selected category if not 'all'
    const filteredMovements = selectedCategory === 'all' 
      ? movements 
      : movements.filter(m => m.category === selectedCategory);
    
    // Calculate total incoming, outgoing, and balance
    const incoming = filteredMovements
      .filter(m => m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);
      
    const outgoing = filteredMovements
      .filter(m => m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);
      
    const balance = incoming - outgoing;
    
    // Get unique items count
    const uniqueItems = new Set(filteredMovements.map(m => m.item_id)).size;
    
    // Get most active item
    const itemActivityMap = filteredMovements.reduce((acc, m) => {
      acc[m.item_name] = (acc[m.item_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    let mostActiveItem = {
      name: 'لا يوجد',
      count: 0
    };
    
    for (const [name, count] of Object.entries(itemActivityMap)) {
      if (count > mostActiveItem.count) {
        mostActiveItem = { name, count };
      }
    }
    
    return {
      totalMovements: filteredMovements.length,
      incoming,
      outgoing,
      balance,
      uniqueItems,
      mostActiveItem
    };
  }, [movements, selectedCategory]);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي الوارد</p>
              <h3 className="text-2xl font-bold">{stats.incoming.toLocaleString()}</h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
              <ArrowDownCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي الصادر</p>
              <h3 className="text-2xl font-bold">{stats.outgoing.toLocaleString()}</h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center">
              <ArrowUpCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">الأصناف المتحركة</p>
              <h3 className="text-2xl font-bold">{stats.uniqueItems}</h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <PackageCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي الحركات</p>
              <h3 className="text-2xl font-bold">{stats.totalMovements}</h3>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryMovementStats;
