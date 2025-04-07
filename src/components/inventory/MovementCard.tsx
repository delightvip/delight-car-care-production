
import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InventoryMovementData } from '@/services/InventoryMovementService';
import { MovementTypeBadge } from './movement/MovementTypeBadge';

interface MovementCardProps {
  movement: InventoryMovementData;
}

const MovementCard: React.FC<MovementCardProps> = ({ movement }) => {
  const getCategoryBadge = (category: string) => {
    let label = '';
    let color = '';
    
    switch (category) {
      case 'raw':
        label = 'مواد خام';
        color = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'semi':
        label = 'نصف مصنعة';
        color = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
      case 'packaging':
        label = 'تعبئة';
        color = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'finished':
        label = 'منتجات نهائية';
        color = 'bg-green-50 text-green-700 border-green-200';
        break;
      default:
        label = category;
        color = 'bg-gray-100 text-gray-700 border-gray-300';
    }
    
    return (
      <Badge variant="outline" className={color}>
        {label}
      </Badge>
    );
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-shrink-0 flex flex-col md:items-center md:justify-center gap-2 mb-3 md:mb-0 md:ml-4">
            <div className="text-xl font-bold">
              {movement.quantity} <span className="text-sm font-normal">وحدة</span>
            </div>
            <MovementTypeBadge type={movement.type} />
          </div>
          
          <div className="flex-grow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
              <h3 className="text-lg font-medium">{movement.item_name}</h3>
              <div className="text-sm text-muted-foreground">
                {format(movement.date, 'PPP', { locale: ar })} - {format(movement.date, 'p', { locale: ar })}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {getCategoryBadge(movement.category)}
              
              <Badge variant="outline" className="bg-muted">
                الرصيد بعد: {movement.balance}
              </Badge>
              
              {movement.user && (
                <Badge variant="outline" className="bg-muted">
                  بواسطة: {movement.user}
                </Badge>
              )}
            </div>
            
            {movement.note && (
              <p className="text-sm text-muted-foreground mt-2">
                {movement.note}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MovementCard;
