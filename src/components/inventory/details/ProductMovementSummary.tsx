
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, RefreshCw, Info } from 'lucide-react';
import { InventoryMovement } from '@/types/inventoryTypes';

interface ProductMovementSummaryProps {
  movements: InventoryMovement[];
  productUnit: string;
}

const ProductMovementSummary: React.FC<ProductMovementSummaryProps> = ({ movements, productUnit }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'out':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'adjustment':
        return <RefreshCw className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">آخر الحركات</CardTitle>
      </CardHeader>
      <CardContent>
        {movements && movements.length > 0 ? (
          <div className="space-y-3">
            {movements.slice(0, 5).map((movement) => (
              <div key={movement.id} className="flex items-start space-x-2 space-x-reverse rtl:space-x-reverse">
                <div className="p-2 rounded-full bg-muted">
                  {getTypeIcon(movement.movement_type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {movement.movement_type === 'in' ? 'إضافة للمخزون' : 
                     movement.movement_type === 'out' ? 'خصم من المخزون' : 'تعديل المخزون'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {movement.quantity} {productUnit} · {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                  </p>
                  {movement.reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {movement.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            لا توجد حركات مخزون لهذا المنتج
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductMovementSummary;
