
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

interface MovementCardProps {
  movement: {
    id: string;
    type: 'in' | 'out';
    category: string;
    item_name: string;
    quantity: number;
    date: Date | string;
    note: string;
  };
}

const MovementCard: React.FC<MovementCardProps> = ({ movement }) => {
  // Format date
  const formattedDate = movement.date instanceof Date
    ? format(movement.date, 'yyyy/MM/dd HH:mm')
    : format(new Date(movement.date), 'yyyy/MM/dd HH:mm');

  // Get category name in Arabic
  const getCategoryName = (category: string) => {
    switch(category) {
      case 'raw_materials': 
      case 'raw_material': return 'المواد الأولية';
      case 'semi_finished': return 'المنتجات النصف مصنعة';
      case 'packaging': return 'مستلزمات التعبئة';
      case 'finished_products': 
      case 'finished': return 'المنتجات النهائية';
      default: return category;
    }
  };

  return (
    <Card className="overflow-hidden border-r-4 shadow-sm hover:shadow-md transition-shadow"
      style={{ 
        borderRightColor: movement.type === 'in' ? '#22c55e' : '#f97316' 
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center h-8 w-8 rounded-full 
              ${movement.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}
            >
              {movement.type === 'in' ? 
                <ArrowDownIcon className="h-4 w-4" /> : 
                <ArrowUpIcon className="h-4 w-4" />
              }
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  {movement.item_name}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {getCategoryName(movement.category)}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground mt-1">
                {formattedDate}
              </div>
              
              {movement.note && (
                <div className="mt-2 text-sm border-r-2 border-muted pr-2 italic">
                  {movement.note}
                </div>
              )}
            </div>
          </div>
          
          <div className={`text-lg font-bold ${movement.type === 'in' ? 'text-green-600' : 'text-amber-600'}`}>
            {movement.type === 'in' ? '+' : '-'}{Math.abs(movement.quantity)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MovementCard;
