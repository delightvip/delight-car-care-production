
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductInfoProps {
  product: {
    name: string;
    code: string;
    quantity: number;
    unit: string;
    min_stock: number;
    unit_cost: number;
    sales_price: number;
  };
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  if (!product) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          {product.name}
          <Badge variant="outline">{product.code}</Badge>
        </CardTitle>
        <CardDescription>
          معلومات أساسية عن المنتج النصف مصنع
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">الكمية الحالية</div>
            <div className="font-semibold">{product.quantity} {product.unit}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">الحد الأدنى للمخزون</div>
            <div className="font-semibold">{product.min_stock} {product.unit}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">تكلفة الوحدة</div>
            <div className="font-semibold">{product.unit_cost}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">سعر البيع</div>
            <div className="font-semibold">{product.sales_price}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductInfo;
