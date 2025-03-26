
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Edit, Trash, Clock, BarChart2, Package, Link } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryMovement } from '@/types/inventoryTypes';
import { Separator } from '@/components/ui/separator';
import PageTransition from '@/components/ui/PageTransition';
import { Badge } from '@/components/ui/badge';

export interface ProductDetailsViewProps {
  product: any;
  productType: string;
  tableName: string;
  movements: InventoryMovement[];
  usageStats: any[];
  relatedProducts: any[];
}

const ProductDetailsView: React.FC<ProductDetailsViewProps> = ({
  product,
  productType,
  tableName,
  movements,
  usageStats,
  relatedProducts
}) => {
  const navigate = useNavigate();
  
  const getProductTypeName = () => {
    switch (productType) {
      case 'raw':
        return 'مادة خام';
      case 'packaging':
        return 'مادة تعبئة';
      case 'semi-finished':
        return 'منتج نصف مصنع';
      case 'finished':
        return 'منتج نهائي';
      default:
        return 'منتج';
    }
  };
  
  const getEditPath = () => {
    switch (productType) {
      case 'raw':
        return `/inventory/raw-materials/edit/${product.id}`;
      case 'packaging':
        return `/inventory/packaging/edit/${product.id}`;
      case 'semi-finished':
        return `/inventory/semi-finished/edit/${product.id}`;
      case 'finished':
        return `/inventory/finished-products/edit/${product.id}`;
      default:
        return '/';
    }
  };
  
  const getInventoryStatusColor = () => {
    if (!product.min_stock) return 'bg-gray-200 text-gray-800';
    
    if (product.quantity <= 0) return 'bg-red-100 text-red-800';
    if (product.quantity < product.min_stock) return 'bg-amber-100 text-amber-800';
    if (product.quantity < product.min_stock * 2) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <Badge variant="outline" className="mr-2">
                {getProductTypeName()}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              كود: {product.code || 'غير محدد'}
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" className="gap-1">
              <Printer className="h-4 w-4" />
              <span>طباعة</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <a href={getEditPath()}>
                <Edit className="h-4 w-4" />
                <span>تعديل</span>
              </a>
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>معلومات المنتج</CardTitle>
                <CardDescription>البيانات الأساسية للمنتج والمخزون</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">اسم المنتج</h3>
                    <p className="text-base">{product.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">الكود</h3>
                    <p className="text-base">{product.code || 'غير محدد'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">الكمية الحالية</h3>
                    <p className="text-base">
                      <span className={`inline-flex items-center py-1 px-2 rounded-full text-sm font-medium ${getInventoryStatusColor()}`}>
                        {product.quantity} {product.unit}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">الحد الأدنى</h3>
                    <p className="text-base">
                      {product.min_stock ? `${product.min_stock} ${product.unit}` : 'غير محدد'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">تكلفة الوحدة</h3>
                    <p className="text-base">
                      {product.unit_cost ? `${product.unit_cost.toFixed(2)} ريال` : 'غير محدد'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">تكلفة المخزون</h3>
                    <p className="text-base">
                      {product.unit_cost 
                        ? `${(product.unit_cost * product.quantity).toFixed(2)} ريال` 
                        : 'غير محدد'}
                    </p>
                  </div>
                </div>
                
                {product.description && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">الوصف</h3>
                      <p className="text-base">{product.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>حركة المخزون</CardTitle>
                <CardDescription>آخر 20 حركة لهذا المنتج</CardDescription>
              </CardHeader>
              <CardContent>
                {movements.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">لا توجد حركات مخزون مسجلة لهذا المنتج</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 px-3 text-right text-sm font-medium text-muted-foreground">التاريخ</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-muted-foreground">نوع الحركة</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-muted-foreground">الكمية</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-muted-foreground">الرصيد بعد</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-muted-foreground">السبب</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-muted-foreground">بواسطة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((movement) => (
                          <tr key={movement.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 px-3 text-sm">
                              {formatDate(movement.created_at)}
                            </td>
                            <td className="py-2 px-3 text-sm">
                              <Badge variant={
                                movement.movement_type === 'in' ? 'default' : 
                                movement.movement_type === 'out' ? 'destructive' : 'outline'
                              }>
                                {movement.movement_type === 'in' ? 'وارد' : 
                                 movement.movement_type === 'out' ? 'منصرف' : 'تعديل'}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-sm">
                              {movement.movement_type === 'in' ? '+' : 
                               movement.movement_type === 'out' ? '-' : '±'}
                              {Math.abs(movement.quantity)} {product.unit}
                            </td>
                            <td className="py-2 px-3 text-sm">{movement.balance_after} {product.unit}</td>
                            <td className="py-2 px-3 text-sm">{movement.reason || 'غير محدد'}</td>
                            <td className="py-2 px-3 text-sm">
                              {movement.users?.name || 'النظام'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>إحصائيات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-medium text-muted-foreground">حالة المخزون</h3>
                    <Badge variant={
                      !product.min_stock ? 'outline' :
                      product.quantity <= 0 ? 'destructive' :
                      product.quantity < product.min_stock ? 'outline' :
                      'default'
                    }>
                      {!product.min_stock ? 'غير محدد' :
                       product.quantity <= 0 ? 'نفذ' :
                       product.quantity < product.min_stock ? 'منخفض' :
                       'متوفر'}
                    </Badge>
                  </div>
                  <div className="bg-muted h-2 rounded overflow-hidden">
                    {product.min_stock ? (
                      <div 
                        className={`h-full ${
                          product.quantity <= 0 ? 'bg-red-500' :
                          product.quantity < product.min_stock ? 'bg-amber-500' :
                          product.quantity < product.min_stock * 2 ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (product.quantity / (product.min_stock * 2)) * 100)}%` 
                        }}
                      ></div>
                    ) : (
                      <div className="h-full bg-gray-400" style={{ width: '50%' }}></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {usageStats && usageStats.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>استخدام المنتج</CardTitle>
                  <CardDescription>المنتجات التي تستخدم هذا المنتج</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {usageStats.map((item) => (
                      <li key={item.id} className="border-b py-2 last:border-0">
                        <a href={`/${item.type.replace('_', '-')}/${item.id}`} className="flex justify-between hover:bg-muted/30 -mx-2 px-2 py-1 rounded">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.code}</p>
                          </div>
                          <div className="text-right">
                            <p>{item.quantity} {product.unit}</p>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            
            {relatedProducts && relatedProducts.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>المكونات</CardTitle>
                  <CardDescription>المواد المستخدمة في هذا المنتج</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {relatedProducts.map((item) => (
                      <li key={item.id} className="border-b py-2 last:border-0">
                        <a href={`/${item.type.replace('_', '-')}/${item.id}`} className="flex justify-between hover:bg-muted/30 -mx-2 px-2 py-1 rounded">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.code}</p>
                          </div>
                          <div className="text-right">
                            <p>{item.quantity} {item.unit}</p>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProductDetailsView;
