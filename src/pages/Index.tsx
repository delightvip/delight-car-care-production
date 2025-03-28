import React from 'react';
import PageTransition from '@/components/ui/PageTransition';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DashboardCardIcon from '@/components/dashboard/DashboardCardIcon';
import { Clock, Package, AlertTriangle, Layers, Settings, Receipt, Users, Activity } from 'lucide-react';
import InventoryStats from '@/components/dashboard/InventoryStats';
import InventoryDistribution from '@/components/dashboard/InventoryDistribution';
import InventoryValueCard from '@/components/dashboard/InventoryValueCard';
import ProductionChart from '@/components/dashboard/ProductionChart';
import { CommercialStats } from '@/components/dashboard/CommercialStats';
import { FinancialTrendsChart } from '@/components/dashboard/FinancialTrendsChart';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

const Index = () => {
  // جلب عدد المواد الأولية
  const { data: rawMaterialsCount } = useQuery({
    queryKey: ['rawMaterialsCount'],
    queryFn: async () => {
      const { count } = await supabase
        .from('raw_materials')
        .select('*', { count: 'exact', head: true });
      
      return count || 0;
    },
    refetchInterval: 60000, 
  });
  
  // جلب أوامر الإنتاج النشطة
  const { data: activeProductionOrders } = useQuery({
    queryKey: ['activeProductionOrders'],
    queryFn: async () => {
      const { count } = await supabase
        .from('production_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      return count || 0;
    },
    refetchInterval: 60000, 
  });
  
  // جلب عدد التحديثات اليومية
  const { data: todayUpdates } = useQuery({
    queryKey: ['todayUpdates'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // جمع عدد تحديثات اليوم لكل نوع من المخزون
      const { count: rawMaterialsUpdates } = await supabase
        .from('raw_materials')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', today.toISOString());
        
      const { count: semiFinishedUpdates } = await supabase
        .from('semi_finished_products')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', today.toISOString());
        
      const { count: packagingUpdates } = await supabase
        .from('packaging_materials')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', today.toISOString());
        
      const { count: finishedUpdates } = await supabase
        .from('finished_products')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', today.toISOString());
      
      // جمع الإجمالي
      return (rawMaterialsUpdates || 0) + 
             (semiFinishedUpdates || 0) + 
             (packagingUpdates || 0) + 
             (finishedUpdates || 0);
    },
    refetchInterval: 60000, 
  });
  
  // Fetch low stock count with correct logic
  const { data: lowStockCount } = useQuery({
    queryKey: ['lowStockCount'],
    queryFn: async () => {
      try {
        // التحقق من مواد المخزون منخفضة الكمية
        const rawMaterialsResponse = await supabase
          .from('raw_materials')
          .select('id')
          .lte('quantity', 'min_stock')
          .gt('min_stock', 0);
        
        const semiFinishedResponse = await supabase
          .from('semi_finished_products')
          .select('id')
          .lte('quantity', 'min_stock')
          .gt('min_stock', 0);
        
        const packagingResponse = await supabase
          .from('packaging_materials')
          .select('id')
          .lte('quantity', 'min_stock')
          .gt('min_stock', 0);
        
        const finishedResponse = await supabase
          .from('finished_products')
          .select('id')
          .lte('quantity', 'min_stock')
          .gt('min_stock', 0);
        
        const totalCount = 
          (rawMaterialsResponse.data?.length || 0) + 
          (semiFinishedResponse.data?.length || 0) + 
          (packagingResponse.data?.length || 0) + 
          (finishedResponse.data?.length || 0);
        
        return totalCount;
      } catch (error) {
        console.error("Error fetching low stock items:", error);
        return 0;
      }
    },
    refetchInterval: 60000, // تحديث كل دقيقة
  });
  
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };
  
  return (
    <PageTransition>
      <div className="space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-card rounded-lg p-6 flex flex-col md:flex-row justify-between items-center gap-4 border shadow-sm"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">لوحة التحكم</h1>
            <p className="text-muted-foreground mt-2 dark:text-gray-400">مرحبًا بك في نظام إدارة المصنع - {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex gap-3 items-center">
            <Button variant="outline" size="sm" className="flex items-center gap-2 border-blue-200 hover:border-blue-300 dark:border-blue-800 dark:hover:border-blue-700" asChild>
              <Link to="/production/orders">
                <Layers className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                <span className="text-blue-800 dark:text-blue-300">أوامر الإنتاج</span>
              </Link>
            </Button>
            <Button variant="default" size="sm" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600" asChild>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                <span>إعدادات</span>
              </Link>
            </Button>
          </div>
        </motion.div>
        
        <Tabs defaultValue="overview" dir="rtl" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-4 bg-gray-100/80 dark:bg-gray-800/80">
            <TabsTrigger value="overview" className="text-base py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400">نظرة عامة</TabsTrigger>
            <TabsTrigger value="inventory" className="text-base py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400">المخزون</TabsTrigger>
            <TabsTrigger value="commercial" className="text-base py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400">المعاملات التجارية</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4 space-y-6">
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={item}>
                <DashboardCard
                  title="إجمالي المواد"
                  value={rawMaterialsCount?.toString() || "0"}
                  description="المواد الأولية المتوفرة"
                  icon={<DashboardCardIcon icon={Package} className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />}
                  link="/inventory/raw-materials"
                  className="h-full transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="أوامر الإنتاج"
                  value={activeProductionOrders?.toString() || "0"}
                  description="أوامر إنتاج نشطة"
                  icon={<DashboardCardIcon icon={Layers} className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />}
                  link="/production/orders"
                  className="h-full transition-all hover:shadow-md hover:border-green-200 dark:hover:border-green-800"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="المخزون المنخفض"
                  value={lowStockCount?.toString() || "0"}
                  description="عناصر أقل من الحد الأدنى"
                  icon={<DashboardCardIcon icon={AlertTriangle} className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />}
                  link="/inventory/low-stock"
                  alert={lowStockCount ? lowStockCount > 0 : false}
                  className="h-full transition-all hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="التحديثات"
                  value={todayUpdates?.toString() || "0"}
                  description="إجمالي التحديثات اليوم"
                  icon={<DashboardCardIcon icon={Clock} className="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />}
                  link="/inventory/tracking"
                  className="h-full transition-all hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800"
                />
              </motion.div>
            </motion.div>
            
            <div className="rounded-lg border bg-card shadow-sm p-6 overflow-hidden mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">الأداء المالي</h3>
                  <p className="text-muted-foreground text-sm mt-1 dark:text-gray-400">تحليل الاتجاهات المالية للفترة الحالية</p>
                </div>
                <Button variant="ghost" size="sm" asChild className="mt-2 md:mt-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Link to="/financial" className="text-xs flex items-center gap-1 text-blue-700 dark:text-blue-400">
                    <span>عرض التفاصيل</span>
                    <Settings className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <div className="mb-8">
                <FinancialTrendsChart 
                  variant="default"
                  height={370}
                  title=""
                  description=""
                  className="border-none shadow-none pb-8" 
                />
              </div>
            </div>
            
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="space-y-6">
                <div className="rounded-lg border bg-card shadow-sm p-6 overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">إحصائيات الإنتاج</h3>
                      <p className="text-muted-foreground text-sm mt-1 dark:text-gray-400">معدلات الإنتاج للمنتجات الرئيسية</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="mt-2 md:mt-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Link to="/production/orders" className="text-xs flex items-center gap-1 text-blue-700 dark:text-blue-400">
                        <span>عرض التفاصيل</span>
                        <Settings className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                  <ProductionChart />
                </div>
                
                <div className="rounded-lg border bg-card shadow-sm p-6 overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">توزيع المخزون</h3>
                      <p className="text-muted-foreground text-sm mt-1">توزيع المخزون حسب الفئات</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="mt-2 md:mt-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Link to="/inventory" className="text-xs flex items-center gap-1 text-blue-700 dark:text-blue-400">
                        <span>عرض التفاصيل</span>
                        <Settings className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                  <InventoryDistribution />
                </div>
              </div>
              <div>
                <InventoryValueCard />
              </div>
            </motion.div>
          </TabsContent>
          
          <TabsContent value="inventory" className="mt-4 space-y-6">
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={item}>
                <DashboardCard
                  title="المواد الخام"
                  value={rawMaterialsCount?.toString() || "0"}
                  description="المواد الأولية المتوفرة"
                  icon={<DashboardCardIcon icon={Package} className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />}
                  link="/inventory/raw-materials"
                  className="h-full transition-all hover:shadow-md"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="مخزون منخفض"
                  value={lowStockCount?.toString() || "0"}
                  description="عناصر أقل من الحد الأدنى"
                  icon={<DashboardCardIcon icon={AlertTriangle} className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />}
                  link="/inventory/low-stock"
                  alert={lowStockCount ? lowStockCount > 0 : false}
                  className="h-full transition-all hover:shadow-md"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="التحديثات"
                  value={todayUpdates?.toString() || "0"}
                  description="إجمالي التحديثات اليوم"
                  icon={<DashboardCardIcon icon={Clock} className="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />}
                  link="/inventory/tracking"
                  className="h-full transition-all hover:shadow-md"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="الحركة"
                  value="تتبع"
                  description="حركة المخزون"
                  icon={<DashboardCardIcon icon={Activity} className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />}
                  link="/inventory/tracking"
                  className="h-full transition-all hover:shadow-md"
                />
              </motion.div>
            </motion.div>

            <div className="rounded-lg border bg-card shadow-sm p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">قيمة المخزون</h3>
                  <p className="text-muted-foreground text-sm mt-1 dark:text-gray-400">مراقبة قيمة المخزون وتغيراته</p>
                </div>
                <Button variant="ghost" size="sm" asChild className="mt-2 md:mt-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Link to="/inventory" className="text-xs flex items-center gap-1 text-blue-700 dark:text-blue-400">
                    <span>عرض التفاصيل</span>
                    <Settings className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <InventoryValueCard />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border bg-card shadow-sm p-6 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">إحصائيات المخزون</h3>
                    <p className="text-muted-foreground text-sm mt-1">ملخص حالة المخزون بالأرقام</p>
                  </div>
                </div>
                <InventoryStats />
              </div>
              
              <div className="rounded-lg border bg-card shadow-sm p-6 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">توزيع المخزون</h3>
                    <p className="text-muted-foreground text-sm mt-1 dark:text-gray-400">النسب المئوية لفئات المخزون</p>
                  </div>
                </div>
                <InventoryDistribution />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="commercial" className="mt-4 space-y-6">
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={item}>
                <DashboardCard
                  title="الفواتير"
                  value="إدارة"
                  description="فواتير المبيعات والمشتريات"
                  icon={<DashboardCardIcon icon={Receipt} className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />}
                  link="/commercial/invoices"
                  className="h-full transition-all hover:shadow-md"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="المدفوعات"
                  value="متابعة"
                  description="مدفوعات العملاء والموردين"
                  icon={<DashboardCardIcon icon={Receipt} className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />}
                  link="/commercial/payments"
                  className="h-full transition-all hover:shadow-md"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="العملاء والموردين"
                  value="إدارة"
                  description="جميع الأطراف التجارية"
                  icon={<DashboardCardIcon icon={Users} className="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />}
                  link="/commercial/parties"
                  className="h-full transition-all hover:shadow-md"
                />
              </motion.div>
            </motion.div>

            <div className="rounded-lg border bg-card shadow-sm p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">الإحصائيات التجارية</h3>
                  <p className="text-muted-foreground text-sm mt-1 dark:text-gray-400">نظرة عامة على أداء المبيعات والمشتريات</p>
                </div>
                <Button variant="ghost" size="sm" asChild className="mt-2 md:mt-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Link to="/commercial" className="text-xs flex items-center gap-1 text-blue-700 dark:text-blue-400">
                    <span>عرض التفاصيل</span>
                    <Settings className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <CommercialStats />
            </div>

            <div className="rounded-lg border bg-card shadow-sm p-6 overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold">التحليلات المالية</h3>
                  <p className="text-muted-foreground text-sm mt-1">تحليل الاتجاهات المالية للمعاملات التجارية</p>
                </div>
                <Button variant="ghost" size="sm" asChild className="mt-2 md:mt-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Link to="/financial" className="text-xs flex items-center gap-1 text-blue-700 dark:text-blue-400">
                    <span>عرض التفاصيل</span>
                    <Settings className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <div className="mb-8">
                <FinancialTrendsChart 
                  variant="compact"
                  height={370}
                  title=""
                  description=""
                  className="border-none shadow-none pb-8" 
                />
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="border rounded-lg p-6 overflow-hidden bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center hover:shadow-md transition-all duration-300">
                <div className="text-center md:text-right">
                  <h3 className="text-xl font-medium text-indigo-900 dark:text-indigo-100">هل تريد إنشاء فاتورة جديدة؟</h3>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    قم بإنشاء فاتورة جديدة للمبيعات أو المشتريات بخطوات سهلة وسريعة
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <Button asChild variant="outline" className="border-indigo-200 dark:border-indigo-800">
                    <Link to="/commercial/invoices">عرض الفواتير</Link>
                  </Button>
                  <Button asChild className="transition-all hover:scale-105 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                    <Link to="/commercial/invoices/new">إنشاء فاتورة</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="col-span-full">
            <div className="border rounded-lg p-6 overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center hover:shadow-md transition-all duration-300">
              <div className="text-center md:text-right">
                <h3 className="text-xl font-medium text-blue-900 dark:text-blue-100">هل تريد إنشاء أمر إنتاج جديد؟</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  قم بإنشاء أمر إنتاج جديد لتسجيل عملية تصنيع منتج أو معالجة مواد خام
                </p>
              </div>
              
              <div className="flex gap-4">
                <Button asChild variant="outline" className="border-blue-200 dark:border-blue-800">
                  <Link to="/production/orders">أوامر الإنتاج</Link>
                </Button>
                <Button asChild className="transition-all hover:scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Link to="/production/orders/new">إنشاء أمر إنتاج</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Index;
