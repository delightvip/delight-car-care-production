
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  BarChart3,
  History,
  TrendingUp,
  Truck,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import ProductMovementHistory from './ProductMovementHistory';
import { InventoryMovement } from '@/types/inventoryTypes';

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
  const isLowStock = product.quantity && product.min_stock ? product.quantity <= product.min_stock : false;
  
  // Prepare chart data
  const pieData = [
    { name: 'الكمية الحالية', value: product.quantity || 0, color: '#3b82f6' },
    { name: 'الحد الأدنى', value: product.min_stock || 0, color: '#f59e0b' }
  ];
  
  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1 md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">تفاصيل المنتج</CardTitle>
            <CardDescription>جميع المعلومات الأساسية للمنتج</CardDescription>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">معلومات أساسية</h3>
                      <Separator className="my-2" />
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-muted-foreground">الاسم</dt>
                          <dd className="font-medium">{product.name}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">الكود</dt>
                          <dd className="font-medium">{product.code}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">المخزون الحالي</dt>
                          <dd className="font-medium">{product.quantity} {product.unit}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">الحد الأدنى</dt>
                          <dd className="font-medium">{product.min_stock} {product.unit}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">التكلفة</dt>
                          <dd className="font-medium">{product.cost_price || product.unit_cost} ج.م</dd>
                        </div>
                        {product.sale_price && (
                          <div>
                            <dt className="text-muted-foreground">سعر البيع</dt>
                            <dd className="font-medium">{product.sale_price} ج.م</dd>
                          </div>
                        )}
                        {product.importance !== undefined && (
                          <div>
                            <dt className="text-muted-foreground">الأهمية</dt>
                            <dd className="font-medium">
                              {product.importance === 0 ? 'منخفضة' : 
                               product.importance === 1 ? 'متوسطة' : 'عالية'}
                            </dd>
                          </div>
                        )}
                        <div className="col-span-2">
                          <dt className="text-muted-foreground">الوصف</dt>
                          <dd className="font-medium">{product.description || 'لا يوجد وصف'}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    {product.supplier_id && (
                      <div>
                        <h3 className="text-lg font-medium">معلومات المورد</h3>
                        <Separator className="my-2" />
                        <div className="flex items-center gap-3">
                          <Truck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <a href={`/commercial/parties/${product.supplier_id}`} className="text-primary hover:underline">
                              {product.supplier_name || 'المورد'}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="h-64">
                    <h3 className="text-lg font-medium mb-4">تحليل المخزون</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          innerRadius={40}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} ${product.unit}`, '']} 
                          labelFormatter={(name) => name}
                        />
                        <Legend 
                          layout="horizontal" 
                          verticalAlign="bottom" 
                          align="center"
                          formatter={(value) => <span className="text-sm">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">حالة المخزون</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="mt-2">
                          <h4 className="text-lg font-medium">الكمية الحالية</h4>
                          <p className="text-3xl font-bold text-primary">
                            {product.quantity} {product.unit}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {product.quantity && product.min_stock && product.quantity > product.min_stock * 2 
                              ? 'المخزون في حالة جيدة' 
                              : product.quantity > product.min_stock 
                                ? 'يجب متابعة المخزون' 
                                : 'المخزون منخفض!'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="mt-2">
                          <h4 className="text-lg font-medium">الحد الأدنى</h4>
                          <p className="text-3xl font-bold text-amber-500">
                            {product.min_stock} {product.unit}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {product.quantity && product.min_stock ? 
                              `${Math.round((product.quantity / product.min_stock) * 100)}% من الحد الأدنى` : 
                              'غير محدد'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="mt-2">
                          <h4 className="text-lg font-medium">القيمة الإجمالية</h4>
                          <p className="text-3xl font-bold text-green-600">
                            {product.quantity && (product.cost_price || product.unit_cost) ? 
                              `${(product.quantity * (product.cost_price || product.unit_cost || 0)).toLocaleString('ar-EG')}` : 
                              '0'} ج.م
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            القيمة الإجمالية للمخزون
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="mt-2">
                          <h4 className="text-lg font-medium">تاريخ الإضافة</h4>
                          <p className="text-xl font-bold">
                            {product.created_at ? new Date(product.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            آخر تحديث: {product.updated_at ? new Date(product.updated_at).toLocaleDateString('ar-EG') : 'غير محدد'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                {relatedProducts.length > 0 && (
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
                                  {item.quantity} {product.unit}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="stats" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>إحصائيات المخزون</CardTitle>
                      <CardDescription>تحليل بيانات المخزون والاستهلاك</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={usageStats}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} ${product.unit}`, 'الكمية']} />
                          <Legend />
                          <Bar dataKey="amount" name="الاستهلاك الشهري" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
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
                <Card>
                  <CardHeader>
                    <CardTitle>معدلات الاستخدام</CardTitle>
                    <CardDescription>تحليل معدلات استخدام المنتج</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={usageStats}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} ${product.unit}`, 'الكمية']} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          name="معدل الاستخدام"
                          stroke="#10b981"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
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
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">المخزون الحالي</span>
                <span className="font-medium">{product.quantity} {product.unit}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">الحد الأدنى</span>
                <span className="font-medium">{product.min_stock} {product.unit}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">التكلفة</span>
                <span className="font-medium">{product.cost_price || product.unit_cost} ج.م</span>
              </div>
              {product.importance !== undefined && (
                <>
                  <Separator />
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
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">آخر الحركات</CardTitle>
            </CardHeader>
            <CardContent>
              {movements && movements.length > 0 ? (
                <div className="space-y-3">
                  {movements.slice(0, 5).map((movement) => {
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
                            {movement.quantity} {product.unit} · {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                          </p>
                          {movement.reason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {movement.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  لا توجد حركات مخزون لهذا المنتج
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsView;
