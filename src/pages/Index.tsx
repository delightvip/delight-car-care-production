
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoadingIndicator from '@/components/ui/LoadingIndicator';

const Index = () => {
  // Fetch counts from database
  const { data: inventoryCounts, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventoryCounts'],
    queryFn: async () => {
      const rawMaterials = await supabase.from('raw_materials').select('id', { count: 'exact' });
      const semiFinished = await supabase.from('semi_finished_products').select('id', { count: 'exact' });
      const packaging = await supabase.from('packaging_materials').select('id', { count: 'exact' });
      const finished = await supabase.from('finished_products').select('id', { count: 'exact' });
      
      return {
        rawMaterialsCount: rawMaterials.count || 0,
        semiFinishedCount: semiFinished.count || 0,
        packagingCount: packaging.count || 0,
        finishedCount: finished.count || 0
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch low stock items
  const { data: lowStockItems } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      const rawMaterialsResponse = await supabase
        .from('raw_materials')
        .select('id')
        .lt('quantity', supabase.raw('min_stock'));
      
      const semiFinishedResponse = await supabase
        .from('semi_finished_products')
        .select('id')
        .lt('quantity', supabase.raw('min_stock'));
      
      const packagingResponse = await supabase
        .from('packaging_materials')
        .select('id')
        .lt('quantity', supabase.raw('min_stock'));
      
      const finishedResponse = await supabase
        .from('finished_products')
        .select('id')
        .lt('quantity', supabase.raw('min_stock'));
      
      const totalCount = 
        (rawMaterialsResponse.data?.length || 0) + 
        (semiFinishedResponse.data?.length || 0) + 
        (packagingResponse.data?.length || 0) + 
        (finishedResponse.data?.length || 0);
      
      return totalCount;
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch active production orders
  const { data: activeProductionOrders } = useQuery({
    queryKey: ['activeProductionOrders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('production_orders')
        .select('id')
        .eq('status', 'قيد التنفيذ');
      
      return data?.length || 0;
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch pending packaging orders
  const { data: pendingPackagingOrders } = useQuery({
    queryKey: ['pendingPackagingOrders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('packaging_orders')
        .select('id')
        .eq('status', 'قيد الانتظار');
      
      return data?.length || 0;
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch recent orders
  const { data: recentOrders, isLoading: isLoadingRecentOrders } = useQuery({
    queryKey: ['recentOrders'],
    queryFn: async () => {
      const { data: productionData } = await supabase
        .from('production_orders')
        .select('id, code, product_name, quantity, status, date')
        .order('date', { ascending: false })
        .limit(3);
      
      return productionData || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch upcoming orders
  const { data: upcomingOrders, isLoading: isLoadingUpcomingOrders } = useQuery({
    queryKey: ['upcomingOrders'],
    queryFn: async () => {
      const currentDate = new Date().toISOString().split('T')[0];
      
      const { data: productionData } = await supabase
        .from('production_orders')
        .select('id, code, product_name, quantity, date')
        .gte('date', currentDate)
        .order('date', { ascending: true })
        .limit(2);
      
      return productionData || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  if (isLoadingInventory || isLoadingRecentOrders || isLoadingUpcomingOrders) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-[80vh]">
          <LoadingIndicator size={40} text="جاري تحميل لوحة التحكم..." />
        </div>
      </PageTransition>
    );
  }

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
            value={inventoryCounts?.rawMaterialsCount.toString() || "0"}
            icon={<Package size={24} />}
            color="primary"
            link="/inventory/raw-materials"
            trend={{ value: 12, label: "هذا الشهر" }}
          />
          <DashboardCard
            title="المنتجات النصف مصنعة"
            value={inventoryCounts?.semiFinishedCount.toString() || "0"}
            icon={<Beaker size={24} />}
            color="success"
            link="/inventory/semi-finished"
            trend={{ value: 8, label: "هذا الشهر" }}
          />
          <DashboardCard
            title="مستلزمات التعبئة"
            value={inventoryCounts?.packagingCount.toString() || "0"}
            icon={<Box size={24} />}
            color="warning"
            link="/inventory/packaging"
            trend={{ value: -3, label: "هذا الشهر" }}
          />
          <DashboardCard
            title="المنتجات النهائية"
            value={inventoryCounts?.finishedCount.toString() || "0"}
            icon={<ShoppingBag size={24} />}
            color="secondary"
            link="/inventory/finished-products"
            trend={{ value: 15, label: "هذا الشهر" }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            title="العناصر منخفضة المخزون"
            value={lowStockItems?.toString() || "0"}
            icon={<AlertTriangle size={24} />}
            color="danger"
            link="/inventory/low-stock"
          />
          <DashboardCard
            title="أوامر الإنتاج النشطة"
            value={activeProductionOrders?.toString() || "0"}
            icon={<Factory size={24} />}
            color="info"
            link="/production/orders"
          />
          <DashboardCard
            title="أوامر التعبئة المعلقة"
            value={pendingPackagingOrders?.toString() || "0"}
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
              <ProductionChart />
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
              <InventoryDistribution />
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
                {lowStockItems === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                      <ShoppingBag size={24} />
                    </div>
                    <p className="text-muted-foreground">جميع العناصر ضمن الحدود المقبولة للمخزون</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
                      <AlertTriangle size={24} />
                    </div>
                    <p className="text-muted-foreground">يوجد {lowStockItems} عناصر منخفضة المخزون</p>
                    <Button variant="outline" size="sm" className="mt-4" asChild>
                      <Link to="/inventory/low-stock">عرض العناصر</Link>
                    </Button>
                  </div>
                )}
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
                {upcomingOrders?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                      <Calendar size={24} />
                    </div>
                    <p className="text-muted-foreground">لا توجد أوامر إنتاج مجدولة للأيام القادمة</p>
                  </div>
                ) : (
                  upcomingOrders?.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="font-medium">{order.product_name}</div>
                        <div className="text-sm text-muted-foreground">{order.code}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">الكمية: {order.quantity}</div>
                          <div className="text-xs text-muted-foreground">تاريخ التنفيذ: {order.date}</div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/production/orders/${order.id}`}>
                            <span>التفاصيل</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
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
            {recentOrders?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                  <Factory size={24} />
                </div>
                <p className="text-muted-foreground">لا توجد أوامر إنتاج حالية</p>
              </div>
            ) : (
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
                    {recentOrders?.map(order => (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2 text-sm">{order.code}</td>
                        <td className="py-3 px-2 text-sm">{order.product_name}</td>
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
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Index;
