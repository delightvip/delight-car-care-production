
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, LineChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Bar, Line, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ProductionService from '@/services/ProductionService';
import { Separator } from '@/components/ui/separator';

const ProductionDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const productionService = ProductionService.getInstance();
        const productionStats = await productionService.getProductionStats();
        setStats(productionStats);
        
        const productionChartData = await productionService.getProductionChartData();
        setChartData(productionChartData);
      } catch (error) {
        console.error('Error loading production data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* إحصائيات أوامر الإنتاج */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي أوامر الإنتاج</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_production_orders || 0}</div>
            <Progress 
              value={stats?.total_production_orders ? 100 : 0} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>

        {/* أوامر الإنتاج المكتملة */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">أوامر الإنتاج المكتملة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed_orders || 0}</div>
            <Progress 
              value={stats?.total_production_orders ? (stats.completed_orders / stats.total_production_orders) * 100 : 0} 
              className="h-2 mt-2" 
            />
            <div className="text-xs text-muted-foreground mt-2">
              {stats?.total_production_orders 
                ? `${Math.round((stats.completed_orders / stats.total_production_orders) * 100)}% من الإجمالي` 
                : '0% من الإجمالي'
              }
            </div>
          </CardContent>
        </Card>

        {/* أوامر الإنتاج المعلقة */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">أوامر الإنتاج المعلقة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_orders || 0}</div>
            <Progress 
              value={stats?.total_production_orders ? (stats.pending_orders / stats.total_production_orders) * 100 : 0} 
              className="h-2 mt-2"
              className="h-2 mt-2 bg-amber-100"
              indicatorClassName="bg-amber-500"
            />
            <div className="text-xs text-muted-foreground mt-2">
              {stats?.total_production_orders 
                ? `${Math.round((stats.pending_orders / stats.total_production_orders) * 100)}% من الإجمالي` 
                : '0% من الإجمالي'
              }
            </div>
          </CardContent>
        </Card>

        {/* إجمالي تكلفة الإنتاج */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي تكلفة الإنتاج</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_cost?.toFixed(2) || 0}</div>
            <div className="text-xs text-muted-foreground mt-2">للأوامر المكتملة</div>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية للإنتاج */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل الإنتاج الشهري</CardTitle>
          <CardDescription>
            مقارنة بين أوامر الإنتاج وأوامر التعبئة على مدار الأشهر الستة الماضية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bar">
            <TabsList className="mb-4">
              <TabsTrigger value="bar">رسم بياني شريطي</TabsTrigger>
              <TabsTrigger value="line">رسم بياني خطي</TabsTrigger>
            </TabsList>
            
            <TabsContent value="bar">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="production_count" name="أوامر الإنتاج" fill="#8884d8" />
                    <Bar dataKey="packaging_count" name="أوامر التعبئة" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="line">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="production_count" name="أوامر الإنتاج" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="packaging_count" name="أوامر التعبئة" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          يتم تحديث البيانات تلقائياً مع كل أمر إنتاج جديد
        </CardFooter>
      </Card>

      {/* ملخص الحالة */}
      <Card>
        <CardHeader>
          <CardTitle>حالة الإنتاج</CardTitle>
          <CardDescription>نظرة عامة على حالة الإنتاج الحالية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="text-green-500 mr-2 h-5 w-5" />
                <span>أوامر مكتملة</span>
              </div>
              <Badge variant="outline">{stats?.completed_orders || 0}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="text-amber-500 mr-2 h-5 w-5" />
                <span>أوامر معلقة</span>
              </div>
              <Badge variant="outline">{stats?.pending_orders || 0}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="text-blue-500 mr-2 h-5 w-5" />
                <span>كفاءة الإنتاج</span>
              </div>
              <Badge variant="outline">
                {stats?.total_production_orders && stats.completed_orders
                  ? `${Math.round((stats.completed_orders / stats.total_production_orders) * 100)}%`
                  : '0%'
                }
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionDashboard;
