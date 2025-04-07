
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductMovementHistory } from '@/components/inventory/movement';

interface MovementsCardProps {
  productId: string;
}

const MovementsCard: React.FC<MovementsCardProps> = ({ productId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>حركات المخزون</CardTitle>
        <CardDescription>
          سجل حركات الإضافة والصرف للمنتج
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProductMovementHistory
          itemId={productId}
          itemType="semi"
        />
      </CardContent>
    </Card>
  );
};

export default MovementsCard;
