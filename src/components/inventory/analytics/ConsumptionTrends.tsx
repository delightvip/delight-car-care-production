
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { format, parseISO, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ConsumptionTrendsProps {
  inventoryType?: string;
  timeRange?: string;
}

type ConsumptionItem = {
  id: string;
  code: string;
  name: string;
  type: string;
  currentMonth: number;
  previousMonth: number;
  twoMonthsAgo: number;
  changeRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  avgConsumption: number;
};

const ConsumptionTrends: React.FC<ConsumptionTrendsProps> = ({
  inventoryType = 'all',
  timeRange = 'month'
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['consumption-trends', inventoryType, timeRange],
    queryFn: async () => {
      try {
        // تحديد فترات الزمن للتحليل
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        
        // جلب كافة حركات المخزون للفترة المحددة (آخر 3 أشهر)
        const { data: movements, error } = await supabase
          .from('inventory_movements')
          .select('*')
          .in('item_type', inventoryType === 'all' ? ['raw', 'packaging', 'semi', 'finished'] : [inventoryType])
          .gt('created_at', subMonths(now, 3).toISOString())
          .lt('quantity', 0) // فقط حركات السحب (استهلاك)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // الحصول على معلومات العناصر
        let itemsInfo: Record<string, { code: string, name: string, type: string }> = {};
        
        if (inventoryType === 'all' || inventoryType === 'raw') {
          const { data: rawMaterials } = await supabase
            .from('raw_materials')
            .select('id, code, name');
          
          if (rawMaterials) {
            rawMaterials.forEach(item => {
              itemsInfo[`raw-${item.id}`] = { code: item.code, name: item.name, type: 'raw' };
            });
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'packaging') {
          const { data: packagingMaterials } = await supabase
            .from('packaging_materials')
            .select('id, code, name');
          
          if (packagingMaterials) {
            packagingMaterials.forEach(item => {
              itemsInfo[`packaging-${item.id}`] = { code: item.code, name: item.name, type: 'packaging' };
            });
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'semi') {
          const { data: semiFinishedProducts } = await supabase
            .from('semi_finished_products')
            .select('id, code, name');
          
          if (semiFinishedProducts) {
            semiFinishedProducts.forEach(item => {
              itemsInfo[`semi-${item.id}`] = { code: item.code, name: item.name, type: 'semi' };
            });
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'finished') {
          const { data: finishedProducts } = await supabase
            .from('finished_products')
            .select('id, code, name');
          
          if (finishedProducts) {
            finishedProducts.forEach(item => {
              itemsInfo[`finished-${item.id}`] = { code: item.code, name: item.name, type: 'finished' };
            });
          }
        }
        
        // تحليل بيانات الاستهلاك لكل عنصر في الفترات المختلفة
        const consumptionByItem: Record<string, {
          currentMonth: number;
          previousMonth: number;
          twoMonthsAgo: number;
        }> = {};
        
        movements?.forEach(movement => {
          const itemKey = `${movement.item_type}-${movement.item_id}`;
          const quantity = Math.abs(movement.quantity);
          const date = parseISO(movement.created_at);
          
          if (!consumptionByItem[itemKey]) {
            consumptionByItem[itemKey] = {
              currentMonth: 0,
              previousMonth: 0,
              twoMonthsAgo: 0
            };
          }
          
          if (date >= currentMonthStart) {
            consumptionByItem[itemKey].currentMonth += quantity;
          } else if (date >= previousMonthStart) {
            consumptionByItem[itemKey].previousMonth += quantity;
          } else if (date >= twoMonthsAgoStart) {
            consumptionByItem[itemKey].twoMonthsAgo += quantity;
          }
        });
        
        // إعداد تحليل الاتجاهات لكل عنصر
        const consumptionTrends: ConsumptionItem[] = Object.entries(consumptionByItem)
          .filter(([itemKey]) => itemsInfo[itemKey]) // استبعاد العناصر التي ليس لها معلومات
          .map(([itemKey, consumption]) => {
            const itemInfo = itemsInfo[itemKey];
            
            // حساب معدل التغير بين الشهر الحالي والشهر السابق
            const changeRate = consumption.previousMonth > 0 
              ? ((consumption.currentMonth - consumption.previousMonth) / consumption.previousMonth) * 100
              : 0;
            
            // تحديد الاتجاه
            let trend: 'increasing' | 'decreasing' | 'stable';
            if (changeRate > 10) {
              trend = 'increasing';
            } else if (changeRate < -10) {
              trend = 'decreasing';
            } else {
              trend = 'stable';
            }
            
            // حساب متوسط الاستهلاك
            const avgConsumption = (consumption.currentMonth + consumption.previousMonth + consumption.twoMonthsAgo) / 3;
            
            return {
              id: itemKey,
              code: itemInfo.code,
              name: itemInfo.name,
              type: itemInfo.type,
              currentMonth: consumption.currentMonth,
              previousMonth: consumption.previousMonth,
              twoMonthsAgo: consumption.twoMonthsAgo,
              changeRate,
              trend,
              avgConsumption
            };
          })
          .filter(item => item.currentMonth > 0 || item.previousMonth > 0 || item.twoMonthsAgo > 0); // استبعاد العناصر غير المستخدمة
        
        // ترتيب حسب معدل التغير (تنازلي)
        const sortedTrends = [...consumptionTrends].sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
        
        return {
          trends: sortedTrends,
          currentMonthLabel: format(currentMonthStart, 'MMMM yyyy', { locale: ar }),
          previousMonthLabel: format(previousMonthStart, 'MMMM yyyy', { locale: ar }),
          twoMonthsAgoLabel: format(twoMonthsAgoStart, 'MMMM yyyy', { locale: ar })
        };
      } catch (error) {
        console.error("Error analyzing consumption trends:", error);
        return null;
      }
    },
    refetchInterval: 600000 // إعادة الاستعلام كل 10 دقائق
  });
  
  const increasingItems = useMemo(() => {
    if (!data?.trends) return [];
    return data.trends.filter(item => item.trend === 'increasing').slice(0, 5);
  }, [data]);
  
  const decreasingItems = useMemo(() => {
    if (!data?.trends) return [];
    return data.trends.filter(item => item.trend === 'decreasing').slice(0, 5);
  }, [data]);
  
  const chartData = useMemo(() => {
    if (!data?.trends) return [];
    
    return data.trends.slice(0, 8).map(item => ({
      name: item.name,
      code: item.code,
      [data.twoMonthsAgoLabel]: item.twoMonthsAgo,
      [data.previousMonthLabel]: item.previousMonth,
      [data.currentMonthLabel]: item.currentMonth
    }));
  }, [data]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحليل اتجاهات الاستهلاك</CardTitle>
          <CardDescription>تحليل معدلات استهلاك المخزون والتغيرات</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحليل اتجاهات الاستهلاك</CardTitle>
          <CardDescription>تحليل معدلات استهلاك المخزون والتغيرات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6">
            تعذر تحليل بيانات الاستهلاك. يرجى المحاولة مرة أخرى لاحقًا.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span>تحليل اتجاهات الاستهلاك</span>
        </CardTitle>
        <CardDescription>
          تحليل تغير معدلات استهلاك المخزون وتحديد الاتجاهات الصاعدة والهابطة
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.trends.length > 0 ? (
          <div className="space-y-6">
            <div className="h-[300px]">
              <h3 className="text-base font-medium mb-4">مقارنة استهلاك أهم العناصر في آخر 3 أشهر</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [value, 'الكمية']}
                    labelFormatter={(name) => `${name}`}
                  />
                  <Legend />
                  <Bar dataKey={data.twoMonthsAgoLabel} fill="#8884d8" />
                  <Bar dataKey={data.previousMonthLabel} fill="#82ca9d" />
                  <Bar dataKey={data.currentMonthLabel} fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  <span>العناصر ذات الاستهلاك المتزايد</span>
                </h3>
                {increasingItems.length > 0 ? (
                  <div className="space-y-3">
                    {increasingItems.map((item) => (
                      <div 
                        key={item.id}
                        className="border rounded-md p-3 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{item.code}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.type === 'raw' ? 'مواد خام' :
                                 item.type === 'packaging' ? 'تعبئة' :
                                 item.type === 'semi' ? 'نصف مصنع' : 'منتج نهائي'}
                              </Badge>
                            </div>
                          </div>
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            +{item.changeRate.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center">
                            <div className="text-muted-foreground">{data.twoMonthsAgoLabel}</div>
                            <div className="font-medium">{item.twoMonthsAgo.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">{data.previousMonthLabel}</div>
                            <div className="font-medium">{item.previousMonth.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">{data.currentMonthLabel}</div>
                            <div className="font-medium">{item.currentMonth.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    لا توجد عناصر ذات استهلاك متزايد بشكل ملحوظ
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-base font-medium mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <span>العناصر ذات الاستهلاك المتناقص</span>
                </h3>
                {decreasingItems.length > 0 ? (
                  <div className="space-y-3">
                    {decreasingItems.map((item) => (
                      <div 
                        key={item.id}
                        className="border rounded-md p-3 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{item.code}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.type === 'raw' ? 'مواد خام' :
                                 item.type === 'packaging' ? 'تعبئة' :
                                 item.type === 'semi' ? 'نصف مصنع' : 'منتج نهائي'}
                              </Badge>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            {item.changeRate.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center">
                            <div className="text-muted-foreground">{data.twoMonthsAgoLabel}</div>
                            <div className="font-medium">{item.twoMonthsAgo.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">{data.previousMonthLabel}</div>
                            <div className="font-medium">{item.previousMonth.toFixed(1)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">{data.currentMonthLabel}</div>
                            <div className="font-medium">{item.currentMonth.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    لا توجد عناصر ذات استهلاك متناقص بشكل ملحوظ
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-medium mb-3">ملخص اتجاهات الاستهلاك</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-right">الكود</th>
                      <th className="px-4 py-2 text-right">الاسم</th>
                      <th className="px-4 py-2 text-right">متوسط الاستهلاك</th>
                      <th className="px-4 py-2 text-right">نسبة التغير</th>
                      <th className="px-4 py-2 text-right">الاتجاه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trends.slice(0, 10).map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="px-4 py-2 text-right">{item.code}</td>
                        <td className="px-4 py-2 text-right">{item.name}</td>
                        <td className="px-4 py-2 text-right">{item.avgConsumption.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{item.changeRate > 0 ? `+${item.changeRate.toFixed(1)}%` : `${item.changeRate.toFixed(1)}%`}</td>
                        <td className="px-4 py-2 text-right">
                          {item.trend === 'increasing' ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1 w-fit">
                              <TrendingUp className="h-3 w-3" />
                              <span>متزايد</span>
                            </Badge>
                          ) : item.trend === 'decreasing' ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 w-fit">
                              <TrendingDown className="h-3 w-3" />
                              <span>متناقص</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground flex items-center gap-1 w-fit">
                              <span>مستقر</span>
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6">
            لا توجد بيانات كافية لتحليل اتجاهات الاستهلاك. يرجى التأكد من وجود بيانات حركة المخزون.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsumptionTrends;
