
import React from 'react';
import { format } from 'date-fns';
import { InventoryMovement } from '@/types/inventoryTypes';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, RefreshCw, FileText } from 'lucide-react';

interface MovementCardProps {
  movement: InventoryMovement;
}

const MovementCard: React.FC<MovementCardProps> = ({ movement }) => {
  const getTypeIcon = () => {
    const type = movement.type || movement.movement_type;
    switch(type) {
      case 'in':
        return <ArrowDown className="h-5 w-5 text-green-500" />;
      case 'out':
        return <ArrowUp className="h-5 w-5 text-amber-500" />;
      case 'adjustment':
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };
  
  const getTypeLabel = () => {
    const type = movement.type || movement.movement_type;
    switch(type) {
      case 'in':
        return 'وارد';
      case 'out':
        return 'صادر';
      case 'adjustment':
        return 'تسوية';
      default:
        return 'غير محدد';
    }
  };
  
  const getTypeColor = () => {
    const type = movement.type || movement.movement_type;
    switch(type) {
      case 'in':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'out':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'adjustment':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getCategoryLabel = () => {
    switch(movement.category) {
      case 'raw_materials':
        return 'المواد الأولية';
      case 'semi_finished':
        return 'المنتجات النصف مصنعة';
      case 'packaging':
        return 'مستلزمات التعبئة';
      case 'finished_products':
        return 'المنتجات النهائية';
      default:
        return movement.category || 'غير محدد';
    }
  };
  
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy/MM/dd HH:mm');
    } catch (error) {
      return dateStr;
    }
  };
  
  return (
    <Card className="p-4 hover:bg-muted/20 transition-colors border-muted">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`rounded-full p-2 ${getTypeColor()} bg-opacity-20`}>
            {getTypeIcon()}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {movement.item_name || movement.item_id}
              </span>
              <Badge variant="outline" className={getTypeColor()}>
                {getTypeLabel()}
              </Badge>
              {movement.category && (
                <Badge variant="secondary">
                  {getCategoryLabel()}
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {movement.reason || 'لا يوجد وصف'}
            </p>
            
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div>
                التاريخ: {formatDate(movement.created_at)}
              </div>
              {movement.user_name && (
                <div>
                  المستخدم: {movement.user_name}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="font-semibold">
            <span className={movement.type === 'in' ? 'text-green-600' : 'text-amber-600'}>
              {movement.type === 'in' ? '+' : '-'}{Math.abs(movement.quantity)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            الرصيد: {movement.balance_after}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MovementCard;
