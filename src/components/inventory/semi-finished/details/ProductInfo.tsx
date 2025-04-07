
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductInfoProps {
  product: any;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  // Calculate stock status
  const getStockStatus = () => {
    if (!product.min_stock) return { label: 'مستوى المخزون غير محدد', color: 'bg-gray-500' };
    
    if (product.quantity <= 0) {
      return { label: 'غير متوفر', color: 'bg-red-500' };
    } else if (product.quantity < product.min_stock) {
      return { label: 'منخفض', color: 'bg-amber-500' };
    } else {
      return { label: 'متوفر', color: 'bg-green-500' };
    }
  };
  
  const stockStatus = getStockStatus();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>معلومات المنتج</span>
          <Badge className={stockStatus.color + " text-white"}>
            {stockStatus.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">الكود</p>
            <p className="text-lg font-medium">{product.code}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">الاسم</p>
            <p className="text-lg font-medium">{product.name}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">وحدة القياس</p>
            <p className="text-lg font-medium">{product.unit}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">الكمية الحالية</p>
            <p className="text-lg font-medium">{product.quantity}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">الحد الأدنى</p>
            <p className="text-lg font-medium">{product.min_stock}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">التكلفة</p>
            <p className="text-lg font-medium">{product.unit_cost?.toFixed(2) || 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">سعر البيع</p>
            <p className="text-lg font-medium">{product.sales_price?.toFixed(2) || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductInfo;
