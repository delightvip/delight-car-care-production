
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, TrendingUp, Package, BoxIcon, Boxes } from 'lucide-react';

interface InventoryMovementStatsProps {
  totalMovements: number;
  inMovements: number;
  outMovements: number;
  inQuantity: number;
  outQuantity: number;
  selectedCategory?: string;
}

const InventoryMovementStats: React.FC<InventoryMovementStatsProps> = ({
  totalMovements,
  inMovements,
  outMovements,
  inQuantity,
  outQuantity,
  selectedCategory = 'all'
}) => {
  const getCategoryIcon = () => {
    switch (selectedCategory) {
      case 'raw_materials':
        return <BoxIcon className="h-6 w-6 text-blue-500" />;
      case 'semi_finished':
        return <Package className="h-6 w-6 text-green-500" />;
      case 'packaging':
        return <Package className="h-6 w-6 text-amber-500" />;
      case 'finished_products':
        return <Boxes className="h-6 w-6 text-purple-500" />;
      default:
        return <TrendingUp className="h-6 w-6 text-primary" />;
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="flex justify-between items-center p-6">
          <div>
            <p className="text-muted-foreground text-sm">إجمالي الحركات</p>
            <h3 className="text-2xl font-bold">{totalMovements}</h3>
          </div>
          <div className="p-2 bg-primary/10 rounded-full">
            {getCategoryIcon()}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="flex justify-between items-center p-6">
          <div>
            <p className="text-muted-foreground text-sm">حركات الوارد</p>
            <h3 className="text-2xl font-bold text-green-600">{inMovements}</h3>
            <p className="text-xs text-muted-foreground">إجمالي الوارد: {inQuantity.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-green-100 rounded-full text-green-600">
            <ArrowDownIcon className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="flex justify-between items-center p-6">
          <div>
            <p className="text-muted-foreground text-sm">حركات الصادر</p>
            <h3 className="text-2xl font-bold text-amber-600">{outMovements}</h3>
            <p className="text-xs text-muted-foreground">إجمالي الصادر: {outQuantity.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-amber-100 rounded-full text-amber-600">
            <ArrowUpIcon className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="flex justify-between items-center p-6">
          <div>
            <p className="text-muted-foreground text-sm">صافي الحركة</p>
            <h3 className={`text-2xl font-bold ${(inQuantity - outQuantity) >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {(inQuantity - outQuantity).toFixed(2)}
            </h3>
            <p className="text-xs text-muted-foreground">
              {(inQuantity - outQuantity) >= 0 ? 'زيادة' : 'نقص'} في المخزون
            </p>
          </div>
          <div className={`p-2 rounded-full ${(inQuantity - outQuantity) >= 0 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
            {(inQuantity - outQuantity) >= 0 ? <ArrowDownIcon className="h-6 w-6" /> : <ArrowUpIcon className="h-6 w-6" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryMovementStats;
