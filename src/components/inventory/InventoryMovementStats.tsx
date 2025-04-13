
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, ListRestart, BarChart3 } from 'lucide-react';
import { InventoryMovement } from '@/types/inventoryTypes';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface InventoryMovementStatsProps {
  movements: InventoryMovement[];
  selectedCategory?: string;
}

const InventoryMovementStats: React.FC<InventoryMovementStatsProps> = ({ movements, selectedCategory }) => {
  // Filter movements based on selected category
  const getFilteredMovements = () => {
    if (!selectedCategory || selectedCategory === 'all') {
      return movements;
    }
    return movements.filter(m => m.category === selectedCategory);
  };
  
  const filteredMovements = getFilteredMovements();
  
  // Calculate total incoming movements
  const inMovements = filteredMovements.filter(m => m.movement_type === 'in' || m.type === 'in');
  const totalInQuantity = inMovements.reduce((sum, m) => sum + m.quantity, 0);
  
  // Calculate total outgoing movements
  const outMovements = filteredMovements.filter(m => m.movement_type === 'out' || m.type === 'out');
  const totalOutQuantity = outMovements.reduce((sum, m) => sum + m.quantity, 0);
  
  // Total number of movements
  const totalMovements = filteredMovements.length;
  
  // Find most active category
  const categoryCount = filteredMovements.reduce((acc, movement) => {
    const category = movement.category || 'unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostActiveCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
  
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'raw_materials': return 'المواد الأولية';
      case 'semi_finished': return 'المنتجات النصف مصنعة';
      case 'packaging': return 'مستلزمات التعبئة';
      case 'finished_products': return 'المنتجات النهائية';
      default: return category;
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="إجمالي الحركات"
        value={totalMovements}
        icon={<ListRestart className="h-5 w-5" />}
        description={selectedCategory !== 'all' ? `تصفية: ${getCategoryName(selectedCategory || '')}` : undefined}
      />
      
      <StatCard
        title="حركات الوارد"
        value={
          <div className="flex items-center gap-2">
            <span>{totalInQuantity}</span>
            <span className="text-xs font-normal text-green-500">({inMovements.length} حركة)</span>
          </div>
        }
        icon={<ArrowDownIcon className="h-5 w-5 text-green-500" />}
      />
      
      <StatCard
        title="حركات الصادر"
        value={
          <div className="flex items-center gap-2">
            <span>{totalOutQuantity}</span>
            <span className="text-xs font-normal text-amber-500">({outMovements.length} حركة)</span>
          </div>
        }
        icon={<ArrowUpIcon className="h-5 w-5 text-amber-500" />}
      />
      
      <StatCard
        title="الفئة الأكثر نشاطاً"
        value={
          mostActiveCategory ? (
            <div className="flex items-center gap-2">
              <span>{getCategoryName(mostActiveCategory[0])}</span>
              <span className="text-xs font-normal text-muted-foreground">({mostActiveCategory[1]} حركة)</span>
            </div>
          ) : 'لا توجد بيانات'
        }
        icon={<BarChart3 className="h-5 w-5" />}
      />
    </div>
  );
};

export default InventoryMovementStats;
