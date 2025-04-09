
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, LineChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Bar, Line, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, Loader2, Timer, Calendar, TrendingUp, ArrowUpRight, Layers, Package, Rocket, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ProductionService, { ProductionStats } from '@/services/ProductionService';
import { Separator } from '@/components/ui/separator';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ar-EG', { 
    style: 'currency', 
    currency: 'EGP',
    maximumFractionDigits: 0
  }).format(value);
};

const ProductionDashboard = () => {
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'production' | 'costs'>('production');

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
        {/* إجمالي أوامر الإنتاج */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Layers className="mr-2 h-4 w-4 text-blue-500" />
              إجمالي أوامر الإنتاج
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_production_orders || 0}</div>
            <Progress 
              value={stats?.total_production_orders ? 100 : 0} 
              className="h-2 mt-2" 
            />
            <div className="text-xs text-muted-foreground mt-2 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
              <span>{stats?.last_week_orders || 0} أوامر جديدة هذا الأسبوع</span>
            </div>
          </CardContent>
        </Card>

        {/* أوامر الإنتاج المكتملة */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              أوامر الإنتاج المكتملة
            </CardTitle>
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
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4 text-amber-500" />
              أوامر الإنتاج المعلقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_orders || 0}</div>
            <Progress 
              value={stats?.total_production_orders ? (stats.pending_orders / stats.total_production_orders) * 100 : 0} 
              className="h-2 mt-2"
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
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="mr-2 h-4 w-4 text-purple-500" />
              إجمالي تكلفة الإنتاج
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.total_cost || 0)}</div>
            <div className="text-xs text-muted-foreground mt-2">متوسط التكلفة للوحدة: {stats?.completed_orders ? formatCurrency((stats?.total_cost || 0) / stats.completed_orders) : formatCurrency(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية للإنتاج */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle>تحليل الإنتاج الشهري</CardTitle>
              <CardDescription>
                مقارنة أوامر الإنتاج وأوامر التعبئة على مدار الأشهر الستة الماضية
              </CardDescription>
            </div>
            <Tabs 
              value={activeChart} 
              onValueChange={(value) => setActiveChart(value as 'production' | 'costs')}
              className="mt-2 md:mt-0"
            >
              <TabsList>
                <TabsTrigger value="production">كميات الإنتاج</TabsTrigger>
                <TabsTrigger value="costs">تكاليف الإنتاج</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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
                    {activeChart === 'production' ? (
                      <>
                        <Bar dataKey="production_count" name="أوامر الإنتاج" fill="#8884d8" />
                        <Bar dataKey="packaging_count" name="أوامر التعبئة" fill="#82ca9d" />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="production_cost" name="تكلفة الإنتاج" fill="#8884d8" />
                        <Bar dataKey="packaging_cost" name="تكلفة التعبئة" fill="#82ca9d" />
                      </>
                    )}
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
                    {activeChart === 'production' ? (
                      <>
                        <Line type="monotone" dataKey="production_count" name="أوامر الإنتاج" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="packaging_count" name="أوامر التعبئة" stroke="#82ca9d" />
                      </>
                    ) : (
                      <>
                        <Line type="monotone" dataKey="production_cost" name="تكلفة الإنتاج" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="packaging_cost" name="تكلفة التعبئة" stroke="#82ca9d" />
                      </>
                    )}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>حالة الإنتاج</CardTitle>
            <CardDescription>نظرة عامة على حالة الإنتاج الحالية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="text-green-500 ml-2 h-5 w-5" />
                  <span>أوامر مكتملة</span>
                </div>
                <Badge variant="outline">{stats?.completed_orders || 0}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="text-amber-500 ml-2 h-5 w-5" />
                  <span>أوامر معلقة</span>
                </div>
                <Badge variant="outline">{stats?.pending_orders || 0}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Rocket className="text-blue-500 ml-2 h-5 w-5" />
                  <span>أوامر قيد التنفيذ</span>
                </div>
                <Badge variant="outline">{stats?.in_progress_orders || 0}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="text-red-500 ml-2 h-5 w-5" />
                  <span>أوامر ملغاة</span>
                </div>
                <Badge variant="outline">{stats?.cancelled_orders || 0}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="text-purple-500 ml-2 h-5 w-5" />
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

        <Card>
          <CardHeader>
            <CardTitle>مؤشرات الأداء</CardTitle>
            <CardDescription>مقاييس الأداء الرئيسية للإنتاج</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">معدل إكمال الأوامر</span>
                  <span className="text-sm font-medium">
                    {stats?.total_production_orders && stats.completed_orders
                      ? `${Math.round((stats.completed_orders / stats.total_production_orders) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <Progress 
                  value={stats?.total_production_orders ? (stats.completed_orders / stats.total_production_orders) * 100 : 0} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">معدل النمو الشهري</span>
                  <span className="text-sm font-medium">
                    {stats?.last_month_orders && stats?.last_week_orders
                      ? `${Math.round((stats.last_week_orders / stats.last_month_orders) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <Progress 
                  value={stats?.last_month_orders ? (stats.last_week_orders / stats.last_month_orders) * 100 : 0} 
                  className="h-2"
                  indicatorClassName="bg-blue-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">نسبة الأوامر المعلقة</span>
                  <span className="text-sm font-medium">
                    {stats?.total_production_orders && stats.pending_orders
                      ? `${Math.round((stats.pending_orders / stats.total_production_orders) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <Progress 
                  value={stats?.total_production_orders ? (stats.pending_orders / stats.total_production_orders) * 100 : 0} 
                  className="h-2"
                  indicatorClassName="bg-amber-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">كفاءة استخدام الموارد</span>
                  <span className="text-sm font-medium">
                    {stats?.total_production_orders && stats.cancelled_orders
                      ? `${Math.round(((stats.total_production_orders - stats.cancelled_orders) / stats.total_production_orders) * 100)}%`
                      : '100%'
                    }
                  </span>
                </div>
                <Progress 
                  value={stats?.total_production_orders ? ((stats.total_production_orders - (stats.cancelled_orders || 0)) / stats.total_production_orders) * 100 : 100} 
                  className="h-2"
                  indicatorClassName="bg-green-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductionDashboard;
