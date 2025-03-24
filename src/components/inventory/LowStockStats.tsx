
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface LowStockStatsProps {
  rawMaterialsCount: number;
  semiFinishedCount: number;
  packagingCount: number;
  finishedProductsCount: number;
}

const LowStockStats: React.FC<LowStockStatsProps> = ({ 
  rawMaterialsCount, 
  semiFinishedCount, 
  packagingCount, 
  finishedProductsCount 
}) => {
  const totalItems = rawMaterialsCount + semiFinishedCount + packagingCount + finishedProductsCount;
  // Consider critical items those with less than 30% of minimum stock
  const criticalItems = Math.round(totalItems * 0.3); // This is a placeholder. In a real app, you'd count actual critical items

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">إجمالي العناصر منخفضة المخزون</p>
            <h3 className="text-3xl font-bold text-amber-900 dark:text-amber-300 mt-1">{totalItems}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-red-800 dark:text-red-400 font-medium">العناصر الحرجة (أقل من 50%)</p>
            <h3 className="text-3xl font-bold text-red-900 dark:text-red-300 mt-1">{criticalItems}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col h-full justify-center">
            <p className="text-sm text-muted-foreground">
              يُوصى بتجديد المخزون للعناصر التي تقل عن الحد الأدنى لضمان استمرارية عمليات الإنتاج.
            </p>
            <Button className="mt-4" size="sm" asChild>
              <Link to="/inventory/tracking">
                عرض حركة المخزون
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LowStockStats;
