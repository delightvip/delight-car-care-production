
import React from 'react';
import { Link } from 'react-router-dom';
import PageTransition from '@/components/ui/PageTransition';
import DashboardCard from '@/components/dashboard/DashboardCard';
import InventoryStats from '@/components/dashboard/InventoryStats';
import ProductionChart from '@/components/dashboard/ProductionChart';
import InventoryDistribution from '@/components/dashboard/InventoryDistribution';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertTriangle, Box, Factory, Beaker, Layers, Package, ShoppingBag, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

const inventoryStatsData = [
  { name: 'المواد الأولية', value: 86, color: '#3B82F6' },
  { name: 'النصف مصنعة', value: 42, color: '#10B981' },
  { name: 'مستلزمات التعبئة', value: 56, color: '#F59E0B' },
  { name: 'المنتجات النهائية', value: 35, color: '#6366F1' },
];

const productionData = [
  { month: 'يناير', production: 65, packaging: 45 },
  { month: 'فبراير', production: 72, packaging: 58 },
  { month: 'مارس', production: 83, packaging: 70 },
  { month: 'أبريل', production: 75, packaging: 68 },
  { month: 'مايو', production: 92, packaging: 80 },
  { month: 'يونيو', production: 85, packaging: 76 },
];

const distributionData = [
  { name: 'المواد الأولية', value: 30 },
  { name: 'النصف مصنعة', value: 15 },
  { name: 'مستلزمات التعبئة', value: 20 },
  { name: 'المنتجات النهائية', value: 35 },
];

const lowStockItems = [
  { id: 1, code: 'RAW-00123', name: 'كحول إيثيلي', currentStock: 25, minStock: 50, unit: 'لتر' },
  { id: 2, code: 'PKG-00087', name: 'عبوة بلاستيكية 250مل', currentStock: 120, minStock: 200, unit: 'قطعة' },
  { id: 3, code: 'RAW-00045', name: 'عطر ليمون', currentStock: 8, minStock: 15, unit: 'لتر' },
];

const recentOrders = [
  { id: 1, code: 'PROD-230801-00001', product: 'ملمع تابلوه', quantity: 200, status: 'مكتمل', date: '2023-08-15' },
  { id: 2, code: 'PACK-230801-00002', product: 'منظف زجاج 500مل', quantity: 150, status: 'قيد التنفيذ', date: '2023-08-16' },
  { id: 3, code: 'PROD-230801-00003', product: 'معطر سيارات', quantity: 100, status: 'قيد الانتظار', date: '2023-08-17' },
];

const upcomingOrders = [
  { id: 1, code: 'PROD-230820-00015', product: 'ملمع إطارات', quantity: 150, dueDate: '2023-08-25' },
  { id: 2, code: 'PACK-230821-00008', product: 'معطر سيارات فاخر', quantity: 250, dueDate: '2023-08-27' },
];

const Index = () => {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
            <p className="text-muted-foreground mt-1">مرحبًا بك في نظام إدارة مصنع منتجات DELIGHT للعناية بالسيارات</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button asChild>
              <Link to="/production/orders">
                <Factory className="mr-2 h-4 w-4" />
                أمر إنتاج جديد
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/production/packaging">
                <Layers className="mr-2 h-4 w-4" />
                أمر تعبئة جديد
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="المواد الأولية"
            value="86"
            icon={<Package size={24} />}
            color="primary"
            link="/inventory/raw-materials"
            trend={{ value: 12, label: "هذا الشهر" }}
          />
          <DashboardCard
            title="المنتجات النصف مصنعة"
            value="42"
            icon={<Beaker size={24} />}
            color="success"
            link="/inventory/semi-finished"
            trend={{ value: 8, label: "هذا الشهر" }}
          />
          <DashboardCard
            title="مستلزمات التعبئة"
            value="56"
            icon={<Box size={24} />}
            color="warning"
            link="/inventory/packaging"
            trend={{ value: -3, label: "هذا الشهر" }}
          />
          <DashboardCard
            title="المنتجات النهائية"
            value="35"
            icon={<ShoppingBag size={24} />}
            color="secondary"
            link="/inventory/finished-products"
            trend={{ value: 15, label: "هذا الشهر" }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            title="العناصر منخفضة المخزون"
            value="8"
            icon={<AlertTriangle size={24} />}
            color="danger"
            link="/inventory/low-stock"
          />
          <DashboardCard
            title="أوامر الإنتاج النشطة"
            value="5"
            icon={<Factory size={24} />}
            color="info"
            link="/production/orders"
          />
          <DashboardCard
            title="أوامر التعبئة المعلقة"
            value="4"
            icon={<Layers size={24} />}
            color="warning"
            link="/production/packaging"
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>إحصائيات الإنتاج</span>
              </CardTitle>
              <CardDescription>
                مقارنة بين أوامر الإنتاج وأوامر التعبئة خلال الأشهر الستة الماضية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductionChart data={productionData} />
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                <span>توزيع المخزون</span>
              </CardTitle>
              <CardDescription>
                النسب المئوية لتوزيع المخزون حسب نوع المنتج
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryDistribution data={distributionData} />
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span>العناصر منخفضة المخزون</span>
                </CardTitle>
                <CardDescription>
                  العناصر التي وصلت إلى الحد الأدنى المسموح به أو أقل
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/inventory/low-stock">عرض الكل</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">{item.code}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{item.currentStock} {item.unit}</div>
                        <div className="text-xs text-muted-foreground">الحد الأدنى: {item.minStock} {item.unit}</div>
                      </div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center
                        ${item.currentStock / item.minStock <= 0.3 ? 'bg-red-100 text-red-700' : 
                          item.currentStock / item.minStock <= 0.6 ? 'bg-amber-100 text-amber-700' : 
                          'bg-yellow-100 text-yellow-700'}`}>
                        <span className="font-medium text-sm">
                          {Math.round((item.currentStock / item.minStock) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-violet-600" />
                  <span>أوامر الإنتاج القادمة</span>
                </CardTitle>
                <CardDescription>
                  أوامر الإنتاج والتعبئة المجدولة للأيام القادمة
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/production/orders">جدولة الإنتاج</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="font-medium">{order.product}</div>
                      <div className="text-sm text-muted-foreground">{order.code}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">الكمية: {order.quantity}</div>
                        <div className="text-xs text-muted-foreground">تاريخ التنفيذ: {order.dueDate}</div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/production/orders/${order.id}`}>
                          <span>التفاصيل</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/production/orders/new">
                  <Factory className="mr-2 h-4 w-4" />
                  إنشاء أمر إنتاج جديد
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-600" />
                <span>أحدث أوامر الإنتاج</span>
              </CardTitle>
              <CardDescription>
                آخر أوامر الإنتاج والتعبئة في النظام
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/production/orders">عرض الكل</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-2 text-right font-medium">الكود</th>
                    <th className="py-3 px-2 text-right font-medium">المنتج</th>
                    <th className="py-3 px-2 text-right font-medium">الكمية</th>
                    <th className="py-3 px-2 text-right font-medium">الحالة</th>
                    <th className="py-3 px-2 text-right font-medium">التاريخ</th>
                    <th className="py-3 px-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2 text-sm">{order.code}</td>
                      <td className="py-3 px-2 text-sm">{order.product}</td>
                      <td className="py-3 px-2 text-sm">{order.quantity}</td>
                      <td className="py-3 px-2 text-sm">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium
                          ${order.status === 'مكتمل' ? 'bg-green-100 text-green-800' : 
                            order.status === 'قيد التنفيذ' ? 'bg-blue-100 text-blue-800' : 
                            'bg-amber-100 text-amber-800'}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm">{order.date}</td>
                      <td className="py-3 px-2 text-sm">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/production/orders/${order.id}`}>
                            عرض
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Index;
