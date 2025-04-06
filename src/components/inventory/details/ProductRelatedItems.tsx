
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RelatedProduct {
  id: string | number;
  name: string;
  type: string;
  quantity?: number;
  percentage?: number;
}

interface ProductRelatedItemsProps {
  productType: string;
  relatedProducts: RelatedProduct[];
  productUnit?: string;
}

const ProductRelatedItems: React.FC<ProductRelatedItemsProps> = ({ 
  productType, 
  relatedProducts,
  productUnit
}) => {
  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4">
        {productType === 'raw-materials' || productType === 'packaging' ? 
          'المنتجات التي تستخدم هذا المكون' : 
          productType === 'semi-finished' ? 
            'مكونات هذا المنتج' : 
            'تفاصيل هذا المنتج'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relatedProducts.map((item) => (
          <Card key={`${item.type}-${item.id}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {item.type === 'raw_materials' ? 'مادة خام' : 
                     item.type === 'packaging_materials' ? 'مادة تعبئة' : 
                     item.type === 'semi_finished_products' ? 'منتج نصف مصنع' : 
                     'منتج نهائي'}
                  </p>
                </div>
                {item.percentage !== undefined && (
                  <Badge variant="outline">
                    {item.percentage}%
                  </Badge>
                )}
                {item.quantity !== undefined && (
                  <Badge variant="outline">
                    {item.quantity} {productUnit}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductRelatedItems;
