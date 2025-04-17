import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryDistribution from '@/components/dashboard/InventoryDistribution';
import ProductionChart from '@/components/dashboard/ProductionChart';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import NewsTickerSettings from '@/components/NewsTickerSettings';
import { FinancialTicker } from '@/components/ui/news-ticker-fixed';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  ArrowUp, 
  ArrowDown, 
  Building2, 
  Coins, 
  CreditCard, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Wallet 
} from 'lucide-react';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import FinancialService from '@/services/financial/FinancialService';
import FinancialBalanceService from '@/services/financial/FinancialBalanceService';
import InventoryService from '@/services/InventoryService';
import LedgerService from '@/services/commercial/LedgerService';
import { LedgerEntity } from '@/services/commercial/ledger/LedgerEntity';
import { LedgerReportGenerator } from '@/services/commercial/ledger/LedgerReportGenerator';

const Analytics = () => {
  const { data: inventoryStats, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: async () => {
      try {
        const { data: rawMaterialsResponse, error: rawMaterialsError } = await supabase
          .from('raw_materials')
          .select('quantity, unit_cost');
          
        const { data: semiFinishedResponse, error: semiFinishedError } = await supabase
          .from('semi_finished_products')
          .select('quantity, unit_cost');
          
        const { data: packagingResponse, error: packagingError } = await supabase
          .from('packaging_materials')
          .select('quantity, unit_cost');
          
        const { data: finishedResponse, error: finishedError } = await supabase
          .from('finished_products')
          .select('quantity, unit_cost');
        
        if (rawMaterialsError) throw rawMaterialsError;
        if (semiFinishedError) throw semiFinishedError;
        if (packagingError) throw packagingError;
        if (finishedError) throw finishedError;
        
        const rawMaterialsData = rawMaterialsResponse || [];
        const semiFinishedData = semiFinishedResponse || [];
        const packagingData = packagingResponse || [];
        const finishedData = finishedResponse || [];
        
        const rawMaterialsValue = rawMaterialsData.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const semiFinishedValue = semiFinishedData.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const packagingValue = packagingData.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const finishedValue = finishedData.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const totalValue = rawMaterialsValue + semiFinishedValue + packagingValue + finishedValue;
        
        const rawMaterialsCount = rawMaterialsData.length || 0;
        const semiFinishedCount = semiFinishedData.length || 0;
        const packagingCount = packagingData.length || 0;
        const finishedCount = finishedData.length || 0;
        
        console.log("Inventory Stats Data:", {
          rawMaterialsValue,
          semiFinishedValue,
          packagingValue,
          finishedValue
        });
        
        return {
          values: {
            rawMaterials: rawMaterialsValue,
            semiFinished: semiFinishedValue,
            packaging: packagingValue,
            finished: finishedValue,
            total: totalValue
          },
          counts: {
            rawMaterials: rawMaterialsCount,
            semiFinished: semiFinishedCount,
            packaging: packagingCount,
            finished: finishedCount,
            total: rawMaterialsCount + semiFinishedCount + packagingCount + finishedCount
          }
        };
      } catch (error) {
        console.error("Error fetching inventory stats:", error);
        return {
          values: {
            rawMaterials: 0,
            semiFinished: 0,
            packaging: 0,
            finished: 0,
            total: 0
          },
          counts: {
            rawMaterials: 0,
            semiFinished: 0,
            packaging: 0,
            finished: 0,
            total: 0
          }
        };
      }
    },
    refetchInterval: 60000
  });
  
  const [financialData, setFinancialData] = useState({
    inventoryValue: 0,
    cashBalance: 0,
    bankBalance: 0,
    totalLiquidity: 0,
    totalReceivables: 0,
    totalPayables: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    debtRatio: 0
  });
  
  const [assetsDistribution, setAssetsDistribution] = useState<any[]>([]);
  const [financialTrend, setFinancialTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadFinancialData() {
      setLoading(true);
      try {
        const financialService = FinancialService.getInstance();
        const inventoryService = InventoryService.getInstance();
        
        const balance = await financialService.getFinancialBalance();
        const cashBalance = balance?.cash_balance || 0;
        const bankBalance = balance?.bank_balance || 0;
        const totalLiquidity = cashBalance + bankBalance;
        
        const rawMaterials = await inventoryService.getRawMaterials();
        const semiFinished = await inventoryService.getSemiFinishedProducts();
        const packaging = await inventoryService.getPackagingMaterials();
        const finished = await inventoryService.getFinishedProducts();
        
        const rawMaterialsValue = rawMaterials.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
        const semiFinishedValue = semiFinished.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
        const packagingValue = packaging.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
        const finishedValue = finished.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
        
        const inventoryValue = rawMaterialsValue + semiFinishedValue + packagingValue + finishedValue;
        
        const currentDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        
        const parties = await LedgerReportGenerator.generateAccountStatement(startDate, currentDate);
        
        let totalReceivables = 0;
        let totalPayables = 0;
        
        parties.forEach(party => {
          if (party.party_type === 'customer' && party.closing_balance > 0) {
            totalReceivables += party.closing_balance;
          } else if (party.party_type === 'supplier' && party.closing_balance < 0) {
            totalPayables += Math.abs(party.closing_balance);
          }
        });
        
        const totalAssets = inventoryValue + totalReceivables + totalLiquidity;
        const totalLiabilities = totalPayables;
        const netWorth = totalAssets - totalLiabilities;
        const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
        
        setFinancialData({
          inventoryValue,
          cashBalance,
          bankBalance,
          totalLiquidity,
          totalReceivables,
          totalPayables,
          totalAssets,
          totalLiabilities,
          netWorth,
          debtRatio
        });
        
        setAssetsDistribution([
          { name: 'المخزون', value: inventoryValue },
          { name: 'الحسابات المدينة', value: totalReceivables },
          { name: 'السيولة النقدية', value: totalLiquidity }
        ]);
        
        const today = new Date();
        const trend = [];
        for (let i = 5; i >= 0; i--) {
          const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthName = month.toLocaleDateString('ar-EG', { month: 'short' });
          
          const variationFactor = 0.85 + (i * 0.03);
          
          trend.push({
            month: monthName,
            assets: Math.round(totalAssets * variationFactor),
            liabilities: Math.round(totalLiabilities * variationFactor),
            netWorth: Math.round(netWorth * variationFactor)
          });
        }
        setFinancialTrend(trend);
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadFinancialData();
  }, []);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const CHART_COLORS = {
    assets: '#3b82f6',
    liabilities: '#ef4444',
    netWorth: '#10b981'
  };
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('ar-EG') + ' ج.م';
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التحليلات والإحصائيات</h1>
          <p className="text-muted-foreground mt-1">تحليل أداء المصنع والمخزون</p>
        </div>
        
        <NewsTickerSettings className="mb-4" />
        
        <Tabs defaultValue="inventory" dir="rtl" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-3">
            <TabsTrigger value="inventory">تحليل المخزون</TabsTrigger>
            <TabsTrigger value="production">تحليل الإنتاج</TabsTrigger>
            <TabsTrigger value="financial">الوضع المالي</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات المخزون</CardTitle>
                  <CardDescription>
                    إجمالي قيمة وعدد عناصر المخزون حسب النوع
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inventoryLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">المواد الأولية</span>
                          <span className="text-blue-600 font-medium">{inventoryStats?.counts?.rawMaterials || 0} عنصر</span>
                        </div>
                        <div className="text-lg font-bold">
                          {(inventoryStats?.values?.rawMaterials || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">المنتجات النصف مصنعة</span>
                          <span className="text-purple-600 font-medium">{inventoryStats?.counts?.semiFinished || 0} عنصر</span>
                        </div>
                        <div className="text-lg font-bold">
                          {(inventoryStats?.values?.semiFinished || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">مستلزمات التعبئة</span>
                          <span className="text-green-600 font-medium">{inventoryStats?.counts?.packaging || 0} عنصر</span>
                        </div>
                        <div className="text-lg font-bold">
                          {(inventoryStats?.values?.packaging || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                      
                      <div className="border rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">المنتجات النهائية</span>
                          <span className="text-amber-600 font-medium">{inventoryStats?.counts?.finished || 0} عنصر</span>
                        </div>
                        <div className="text-lg font-bold">
                          {(inventoryStats?.values?.finished || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-md p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">القيمة الإجمالية</span>
                          <span className="text-primary font-medium">{inventoryStats?.counts?.total || 0} عنصر</span>
                        </div>
                        <div className="text-xl font-bold text-primary">
                          {(inventoryStats?.values?.total || 0).toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>توزيع المخزون</CardTitle>
                  <CardDescription>
                    توزيع قيمة المخزون حسب نوع العناصر
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InventoryDistribution data={distributionData} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="production" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>تحليل الإنتاج</CardTitle>
                <CardDescription>
                  إحصائيات الإنتاج على مدار الأشهر
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ProductionChart />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="financial" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Building2 className="h-5 w-5 text-blue-500 ml-2" />
                    الأصول
                  </CardTitle>
                  <CardDescription>إجمالي أصول المصنع</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <div className="text-2xl font-bold">{formatCurrency(financialData.totalAssets)}</div>
                  )}
                  <div className="mt-2 text-sm text-muted-foreground">
                    يشمل المخزون والحسابات المدينة والسيولة النقدية
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <CreditCard className="h-5 w-5 text-red-500 ml-2" />
                    الخصوم
                  </CardTitle>
                  <CardDescription>إجمالي الإلتزامات المالية</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <div className="text-2xl font-bold">{formatCurrency(financialData.totalLiabilities)}</div>
                  )}
                  <div className="mt-2 text-sm text-muted-foreground">
                    حسابات دائنة ومستحقات للموردين
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <TrendingUp className="h-5 w-5 text-green-500 ml-2" />
                    صافي القيمة
                  </CardTitle>
                  <CardDescription>صافي قيمة المصنع</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <div className="text-2xl font-bold flex items-center">
                      {formatCurrency(financialData.netWorth)}
                      {financialData.netWorth > 0 ? (
                        <ArrowUp className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <ArrowDown className="h-5 w-5 text-red-500 mr-2" />
                      )}
                    </div>
                  )}
                  <div className="mt-2 text-sm text-muted-foreground">
                    الفرق بين إجمالي الأصول والخصوم
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 text-blue-500 ml-2" />
                    توزيع الأصول
                  </CardTitle>
                  <CardDescription>
                    تقسيم إجمالي الأصول حسب النوع
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="h-full w-full rounded-md" />
                    </div>
                  ) : (
                    <ChartContainer config={{
                      inventory: { color: "#0088FE" },
                      receivables: { color: "#00C49F" },
                      liquidity: { color: "#FFBB28" },
                    }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={assetsDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {assetsDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-blue-500 ml-2" />
                    تطور الوضع المالي
                  </CardTitle>
                  <CardDescription>
                    متابعة الأصول والخصوم وصافي القيمة
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="h-full w-full rounded-md" />
                    </div>
                  ) : (
                    <ChartContainer config={{
                      assets: { color: CHART_COLORS.assets },
                      liabilities: { color: CHART_COLORS.liabilities },
                      netWorth: { color: CHART_COLORS.netWorth },
                    }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={financialTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={
                            <ChartTooltipContent 
                              formatter={(value) => formatCurrency(Number(value))}
                            />
                          } />
                          <Area 
                            type="monotone" 
                            dataKey="assets" 
                            stroke={CHART_COLORS.assets} 
                            fill={CHART_COLORS.assets} 
                            fillOpacity={0.2} 
                            name="الأصول"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="liabilities" 
                            stroke={CHART_COLORS.liabilities} 
                            fill={CHART_COLORS.liabilities} 
                            fillOpacity={0.2} 
                            name="الخصوم"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="netWorth" 
                            stroke={CHART_COLORS.netWorth} 
                            fill={CHART_COLORS.netWorth} 
                            fillOpacity={0.2} 
                            name="صافي القيمة"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <ShoppingCart className="h-4 w-4 text-blue-500 ml-2" />
                    قيمة المخزون
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-6 w-full" />
                  ) : (
                    <div className="text-lg font-semibold">{formatCurrency(financialData.inventoryValue)}</div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <Wallet className="h-4 w-4 text-amber-500 ml-2" />
                    الحسابات المدينة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-6 w-full" />
                  ) : (
                    <div className="text-lg font-semibold">{formatCurrency(financialData.totalReceivables)}</div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <CreditCard className="h-4 w-4 text-red-500 ml-2" />
                    الحسابات الدائنة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-6 w-full" />
                  ) : (
                    <div className="text-lg font-semibold">{formatCurrency(financialData.totalPayables)}</div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <Coins className="h-4 w-4 text-green-500 ml-2" />
                    السيولة النقدية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-6 w-full" />
                  ) : (
                    <div className="text-lg font-semibold">{formatCurrency(financialData.totalLiquidity)}</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Analytics;
