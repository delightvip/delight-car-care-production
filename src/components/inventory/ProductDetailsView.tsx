
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, BarChart3, History, TrendingUp, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductMovementHistory } from './movement';
import { InventoryMovement } from '@/types/inventoryTypes';

// Import new components
import ProductOverviewTab from './details/ProductOverviewTab';
import ProductRelatedItems from './details/ProductRelatedItems';
import { UsageBarChart, UsageLineChart } from './details/ProductStatistics';
import ProductMovementSummary from './details/ProductMovementSummary';

interface ProductData {
  id: number | string;
  code?: string;
  name?: string;
  unit?: string;
  quantity?: number;
  min_stock?: number;
  unit_cost?: number;
  cost_price?: number;
  sale_price?: number;
  description?: string;
  supplier_id?: string;
  supplier_name?: string;
  created_at?: string;
  updated_at?: string;
  importance?: number;
}

interface ProductDetailsViewProps {
  product: ProductData;
  productType: string;
  tableName: string;
  movements?: InventoryMovement[];
  usageStats?: any[];
  relatedProducts?: {
    id: string | number;
    name: string;
    type: string;
    quantity?: number;
    percentage?: number;
  }[];
}

const ProductDetailsView: React.FC<ProductDetailsViewProps> = ({
  product,
  productType,
  tableName,
  movements = [],
  usageStats = [],
  relatedProducts = []
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1 md:col-span-3">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">تفاصيل المنتج</CardTitle>
              <CardDescription>جميع المعلومات الأساسية للمنتج</CardDescription>
            </div>
            <Link to={`/inventory/${productType}/${product.id}/reports`}>
              <Button className="flex items-center gap-2" variant="outline">
                <PieChart className="h-4 w-4" />
                <span>تقارير مفصلة</span>
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="gap-2">
                  <Package className="h-4 w-4" />
                  <span>نظرة عامة</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>إحصائيات</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  <span>سجل الحركة</span>
                </TabsTrigger>
                <TabsTrigger value="usage" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>الاستخدام</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                <ProductOverviewTab product={product} />
                <ProductRelatedItems 
                  productType={productType} 
                  relatedProducts={relatedProducts} 
                  productUnit={product.unit} 
                />
              </TabsContent>
              
              <TabsContent value="stats" className="mt-6">
                <div className="space-y-6">
                  <UsageBarChart usageStats={usageStats} productUnit={product.unit || ''} />
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>سجل حركة المخزون</CardTitle>
                    <CardDescription>جميع العمليات التي تمت على هذا العنصر</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductMovementHistory itemId={product.id.toString()} itemType={tableName} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="usage" className="mt-6">
                <UsageLineChart usageStats={usageStats} productUnit={product.unit || ''} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">ملخص المنتج</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">الكود</span>
                <span className="font-medium">{product.code}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">المخزون الحالي</span>
                <span className="font-medium">{product.quantity} {product.unit}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">الحد الأدنى</span>
                <span className="font-medium">{product.min_stock} {product.unit}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">التكلفة</span>
                <span className="font-medium">{product.cost_price || product.unit_cost} ج.م</span>
              </div>
              {product.importance !== undefined && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">الأهمية</span>
                    <span className="font-medium">
                      {product.importance === 0 ? 'منخفضة' : 
                       product.importance === 1 ? 'متوسطة' : 'عالية'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <ProductMovementSummary movements={movements} productUnit={product.unit || ''} />
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsView;
