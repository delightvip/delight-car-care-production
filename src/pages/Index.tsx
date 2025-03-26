import React from 'react';
import PageTransition from '@/components/ui/PageTransition';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DashboardCardIcon from '@/components/dashboard/DashboardCardIcon';
import { Clock, Package, AlertTriangle, Layers, TrendingUp, Settings } from 'lucide-react';
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

export const Index = () => {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
            <p className="text-muted-foreground mt-1">مرحبًا بك في نظام إدارة المصنع</p>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
            <Link to="/settings">
              <Settings className="h-4 w-4" />
              <span>إعدادات</span>
            </Link>
          </Button>
        </div>
        
        <Tabs defaultValue="overview" dir="rtl" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-3">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="inventory">المخزون</TabsTrigger>
            <TabsTrigger value="commercial">المعاملات التجارية</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-8">
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={container}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={item}>
                <DashboardCard
                  title="إجمالي المواد"
                  value={rawMaterialsCount?.toString() || "0"}
                  description="المواد الأولية المتوفرة"
                  icon={<DashboardCardIcon icon={Package} className="bg-blue-100 text-blue-600" />}
                  link="/inventory/raw-materials"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="أوامر الإنتاج"
                  value={activeProductionOrders?.toString() || "0"}
                  description="أوامر إنتاج نشطة"
                  icon={<DashboardCardIcon icon={Layers} className="bg-green-100 text-green-600" />}
                  link="/production/orders"
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="المخزون المنخفض"
                  value={lowStockCount?.toString() || "0"}
                  description="عناصر أقل من الحد الأدنى"
                  icon={<DashboardCardIcon icon={AlertTriangle} className="bg-amber-100 text-amber-600" />}
                  link="/inventory/low-stock"
                  alert={lowStockCount ? lowStockCount > 0 : false}
                />
              </motion.div>
              
              <motion.div variants={item}>
                <DashboardCard
                  title="التحديثات"
                  value={todayUpdates?.toString() || "0"}
                  description="إجمالي التحديثات اليوم"
                  icon={<DashboardCardIcon icon={Clock} className="bg-purple-100 text-purple-600" />}
                  link="/inventory/tracking"
                />
              </motion.div>
            </motion.div>
            
            <FinancialTrendsChart />
            
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="space-y-6">
                <ProductionChart />
                <InventoryDistribution />
              </div>
              <div>
                <InventoryValueCard />
              </div>
            </motion.div>
          </TabsContent>
          
          <TabsContent value="inventory" className="mt-6 space-y-8">
            <InventoryValueCard />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InventoryStats />
              <div className="glass-panel p-6 h-80 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-lg font-medium text-gray-900 mb-4">توزيع المخزون</h3>
                <InventoryDistribution />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="commercial" className="mt-6 space-y-8">
            <CommercialStats />
            <FinancialTrendsChart />
          </TabsContent>
        </Tabs>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="col-span-full">
            <div className="border rounded-lg p-6 bg-card flex flex-col md:flex-row gap-6 justify-between items-center hover:shadow-md transition-shadow duration-300">
              <div className="text-center md:text-right">
                <h3 className="text-lg font-medium">هل تريد إنشاء أمر إنتاج جديد؟</h3>
                <p className="text-muted-foreground mt-1">
                  قم بإنشاء أمر إنتاج جديد لتسجيل عملية تصنيع منتج
                </p>
              </div>
              
              <div className="flex gap-4">
                <Button asChild variant="outline">
                  <Link to="/production/orders">أوامر الإنتاج</Link>
                </Button>
                <Button asChild className="transition-all hover:scale-105">
                  <Link to="/production/orders">إنشاء أمر إنتاج</Link>
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
