
import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Beaker, Box, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface LowStockItemProps {
  id: number;
  code: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  category: string;
  categoryName: string;
  route: string;
}

const LowStockCard: React.FC<{ item: LowStockItemProps }> = ({ item }) => {
  const percentage = Math.min(100, Math.round((item.currentStock / item.minStock) * 100));
  const progressColor = 
    percentage <= 30 ? 'bg-red-500' : 
    percentage <= 70 ? 'bg-amber-500' : 
    'bg-green-500';
  
  // Icon based on category
  const ItemIcon = 
    item.category === 'raw_materials' ? Package :
    item.category === 'semi_finished' ? Beaker :
    item.category === 'packaging' ? Box :
    ShoppingBag;
  
  return (
    <Card key={item.code} className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-3">
            <div className={`
              p-2 rounded-md 
              ${item.category === 'raw_materials' ? 'bg-blue-100 text-blue-700' : ''}
              ${item.category === 'semi_finished' ? 'bg-green-100 text-green-700' : ''}
              ${item.category === 'packaging' ? 'bg-amber-100 text-amber-700' : ''}
              ${item.category === 'finished_products' ? 'bg-purple-100 text-purple-700' : ''}
            `}>
              <ItemIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.code}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`
              ${item.category === 'raw_materials' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
              ${item.category === 'semi_finished' ? 'bg-green-50 text-green-700 border-green-200' : ''}
              ${item.category === 'packaging' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
              ${item.category === 'finished_products' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
            `}
          >
            {item.categoryName}
          </Badge>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span>المخزون الحالي: <span className="font-medium">{item.currentStock} {item.unit}</span></span>
            <span>الحد الأدنى: <span className="font-medium">{item.minStock} {item.unit}</span></span>
          </div>
          
          <div className="w-full">
            <Progress 
              value={percentage} 
              className={`h-2 ${progressColor}`} 
            />
          </div>
          
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium ${
              percentage <= 30 ? 'text-red-600' :
              percentage <= 70 ? 'text-amber-600' :
              'text-green-600'
            }`}>
              {percentage}%
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to={item.route}>
                عرض التفاصيل
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LowStockCard;
