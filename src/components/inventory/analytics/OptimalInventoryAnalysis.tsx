
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  calculateEOQ, 
  calculateReorderPoint, 
  calculateOptimalInventoryLevel 
} from '@/utils/inventoryAnalytics';
import { Settings, ArrowUp, ArrowDown, BadgeDollarSign } from 'lucide-react';

// افتراضات أولية لنموذج EOQ
const DEFAULT_ORDER_COST = 100; // تكلفة إصدار أمر شراء
const DEFAULT_HOLDING_COST_PERCENT = 0.2; // 20% من قيمة الوحدة سنويًا لتكلفة التخزين
const DEFAULT_LEAD_TIME_DAYS = 7; // وقت الانتظار المفترض (أيام)
const DEFAULT_SAFETY_STOCK_DAYS = 3; // احتياطي أمان (أيام)

interface OptimalInventoryAnalysisProps {
  inventoryType?: string;
  selectedItems?: string[];
}

const OptimalInventoryAnalysis: React.FC<OptimalInventoryAnalysisProps> = ({
  inventoryType = 'all',
  selectedItems = []
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['optimal-inventory', inventoryType, JSON.stringify(selectedItems)],
    queryFn: async () => {
      try {
        // الحصول على حركات المخزون للتحليل
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const { data: movementsData, error: movementsError } = await supabase
          .from('inventory_movements')
          .select('*')
          .in('item_type', inventoryType === 'all' ? ['raw', 'packaging'] : [inventoryType])
          .gt('created_at', threeMonthsAgo.toISOString())
          .order('created_at', { ascending: false });
        
        if (movementsError) throw movementsError;
        
        // الحصول على بيانات عناصر المخزون
        let inventoryItems: any[] = [];
        
        if (inventoryType === 'all' || inventoryType === 'raw') {
          const { data: rawMaterials } = await supabase
            .from('raw_materials')
            .select('id, code, name, quantity, min_stock, unit, unit_cost')
            .in('id', selectedItems.length > 0 ? selectedItems.map(id => parseInt(id)) : selectedItems);
          
          if (rawMaterials) {
            inventoryItems = [...inventoryItems, ...rawMaterials.map(item => ({ ...item, type: 'raw' }))];
          }
        }
        
        if (inventoryType === 'all' || inventoryType === 'packaging') {
          const { data: packagingMaterials } = await supabase
            .from('packaging_materials')
            .select('id, code, name, quantity, min_stock, unit, unit_cost')
            .in('id', selectedItems.length > 0 ? selectedItems.map(id => parseInt(id)) : selectedItems);
          
          if (packagingMaterials) {
            inventoryItems = [...inventoryItems, ...packagingMaterials.map(item => ({ ...item, type: 'packaging' }))];
          }
        }
        
        // تحليل بيانات الاستهلاك لكل عنصر
        const analysisResults = inventoryItems.map(item => {
          // استخراج حركات هذا العنصر
          const itemMovements = movementsData?.filter(m => 
            m.item_id === item.id.toString() && m.item_type === item.type) || [];
          
          // حساب استهلاك العنصر خلال الفترة المحددة
          const consumptionData = itemMovements
            .filter(m => m.quantity < 0) // فقط حركات الاستهلاك
            .map(m => ({ quantity: Math.abs(m.quantity), date: new Date(m.created_at) }));
          
          // حساب إجمالي الاستهلاك
          const totalConsumption = consumptionData.reduce((sum, m) => sum + m.quantity, 0);
          
          // حساب عدد أيام الفترة
          const daysInPeriod = Math.max(1, Math.ceil((new Date().getTime() - threeMonthsAgo.getTime()) / (24 * 60 * 60 * 1000)));
          
          // حساب معدل الاستهلاك اليومي
          const dailyConsumptionRate = totalConsumption / daysInPeriod;
          
          // تقدير الاستهلاك السنوي
          const annualConsumption = dailyConsumptionRate * 365;
          
          // حساب تكلفة التخزين السنوية لوحدة واحدة
          const unitHoldingCost = item.unit_cost * DEFAULT_HOLDING_COST_PERCENT;
          
          // حساب الكمية الاقتصادية للطلب (EOQ)
          const eoq = calculateEOQ(annualConsumption, DEFAULT_ORDER_COST, unitHoldingCost);
          
          // حساب احتياطي الأمان
          const safetyStock = dailyConsumptionRate * DEFAULT_SAFETY_STOCK_DAYS;
          
          // حساب نقطة إعادة الطلب
          const reorderPoint = calculateReorderPoint(dailyConsumptionRate, DEFAULT_LEAD_TIME_DAYS, safetyStock);
          
          // حساب المستوى الأمثل للمخزون
          const optimalLevel = calculateOptimalInventoryLevel(eoq, reorderPoint);
          
          // حساب ترددات الطلب المثالية
          const optimalOrderFrequency = annualConsumption > 0 ? Math.ceil(annualConsumption / eoq) : 0;
          
          // حساب فرص التوفير
          const currentAnnualOrderCost = item.min_stock > 0 ? 
            (annualConsumption / item.min_stock) * DEFAULT_ORDER_COST : 0;
          
          const optimalAnnualOrderCost = optimalOrderFrequency * DEFAULT_ORDER_COST;
          
          const currentAnnualHoldingCost = ((item.quantity + item.min_stock) / 2) * unitHoldingCost;
          
          const optimalAnnualHoldingCost = (optimalLevel / 2) * unitHoldingCost;
          
          const currentTotalCost = currentAnnualOrderCost + currentAnnualHoldingCost;
          const optimalTotalCost = optimalAnnualOrderCost + optimalAnnualHoldingCost;
          
          const potentialSavings = currentTotalCost - optimalTotalCost;
          
          // حساب نسبة التوفير المحتملة
          const savingsPercentage = currentTotalCost > 0 ? (potentialSavings / currentTotalCost) * 100 : 0;
          
          return {
            id: item.id,
            code: item.code,
            name: item.name,
            type: item.type,
            unit: item.unit,
            currentStock: item.quantity,
            minStock: item.min_stock,
            unitCost: item.unit_cost,
            dailyConsumption: dailyConsumptionRate,
            annualConsumption,
            economicOrderQuantity: eoq,
            reorderPoint,
            safetyStock,
            optimalLevel,
            optimalOrderFrequency,
            currentCost: currentTotalCost,
            optimalCost: optimalTotalCost,
            potentialSavings,
            savingsPercentage,
            dataPoints: consumptionData.length
          };
        });
        
        // استبعاد العناصر ذات البيانات غير الكافية أو الاستهلاك الصفري
        const validResults = analysisResults.filter(item => 
          item.dataPoints >= 3 && item.dailyConsumption > 0
        );
        
        // ترتيب النتائج حسب فرص التوفير (تنازليًا)
        const sortedResults = [...validResults].sort((a, b) => b.potentialSavings - a.potentialSavings);
        
        return sortedResults;
      } catch (error) {
        console.error("Error analyzing optimal inventory levels:", error);
        return [];
      }
    },
    refetchInterval: 600000 // إعادة الاستعلام كل 10 دقائق
  });
  
  const totalPotentialSavings = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, item) => sum + item.potentialSavings, 0);
  }, [data]);
  
  const optimizationOpportunities = useMemo(() => {
    if (!data) return { increaseItems: [], decreaseItems: [] };
    
    // العناصر التي تحتاج زيادة مستوى المخزون
    const increaseItems = data
      .filter(item => item.optimalLevel > item.currentStock && item.savingsPercentage > 5)
      .slice(0, 5);
    
    // العناصر التي تحتاج خفض مستوى المخزون
    const decreaseItems = data
      .filter(item => item.optimalLevel < item.currentStock && item.savingsPercentage > 5)
      .slice(0, 5);
    
    return { increaseItems, decreaseItems };
  }, [data]);
  
  const comparisonChartData = useMemo(() => {
    if (!data) return [];
    
    return data.slice(0, 6).map(item => ({
      name: item.code,
      الحد_الأدنى_الحالي: item.minStock,
      المستوى_الأمثل: item.optimalLevel,
      المخزون_الحالي: item.currentStock
    }));
  }, [data]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحليل المستوى الأمثل للمخزون</CardTitle>
          <CardDescription>تحليل الكميات الاقتصادية للطلب ونقاط إعادة الطلب</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحليل المستوى الأمثل للمخزون</CardTitle>
          <CardDescription>تحليل الكميات الاقتصادية للطلب ونقاط إعادة الطلب</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6">
            لا توجد بيانات كافية لتحليل المستوى الأمثل للمخزون. يرجى التأكد من وجود بيانات حركة المخزون كافية.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <span>تحليل المستوى الأمثل للمخزون</span>
        </CardTitle>
        <CardDescription>
          تحليل الكميات الاقتصادية للطلب ونقاط إعادة الطلب باستخدام نموذج EOQ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <BadgeDollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground mb-1">إجمالي التوفير المحتمل</div>
                  <div className="text-2xl font-bold text-green-600">{totalPotentialSavings.toLocaleString('ar-EG')} ج.م</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <ArrowUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground mb-1">عناصر تحتاج لزيادة المخزون</div>
                  <div className="text-2xl font-bold text-blue-600">{optimizationOpportunities.increaseItems.length}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <ArrowDown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground mb-1">عناصر تحتاج لخفض المخزون</div>
                  <div className="text-2xl font-bold text-amber-600">{optimizationOpportunities.decreaseItems.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <h3 className="text-base font-medium mb-4">مقارنة المستويات الحالية مع المستويات المثلى</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={comparisonChartData}
                  margin={{ top: 20, right: 30, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="الحد_الأدنى_الحالي" stroke="#8884d8" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="المستوى_الأمثل" stroke="#82ca9d" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="المخزون_الحالي" stroke="#ffc658" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-medium mb-3 flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-blue-500" />
                <span>عناصر تحتاج لزيادة المخزون</span>
              </h3>
              {optimizationOpportunities.increaseItems.length > 0 ? (
                <div className="space-y-4">
                  {optimizationOpportunities.increaseItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="border rounded-md p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.code}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-green-600">توفير محتمل: {item.potentialSavings.toFixed(0)} ج.م</div>
                          <div className="text-xs text-muted-foreground">({item.savingsPercentage.toFixed(1)}%)</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>المخزون الحالي:</span>
                          <span className="font-medium">{item.currentStock.toFixed(0)} {item.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>المستوى الأمثل:</span>
                          <span className="font-medium text-blue-600">{item.optimalLevel.toFixed(0)} {item.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>الكمية المطلوب إضافتها:</span>
                          <span className="font-medium text-blue-600">{Math.max(0, item.optimalLevel - item.currentStock).toFixed(0)} {item.unit}</span>
                        </div>
                        <div className="w-full">
                          <Progress 
                            value={(item.currentStock / item.optimalLevel) * 100} 
                            className="h-2" 
                          />
                          <div className="flex justify-between text-xs mt-1">
                            <span>المستوى الحالي</span>
                            <span>المستوى الأمثل</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4 border rounded-md">
                  لا توجد عناصر تحتاج إلى زيادة المخزون
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-base font-medium mb-3 flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-amber-500" />
                <span>عناصر تحتاج لخفض المخزون</span>
              </h3>
              {optimizationOpportunities.decreaseItems.length > 0 ? (
                <div className="space-y-4">
                  {optimizationOpportunities.decreaseItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="border rounded-md p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.code}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-green-600">توفير محتمل: {item.potentialSavings.toFixed(0)} ج.م</div>
                          <div className="text-xs text-muted-foreground">({item.savingsPercentage.toFixed(1)}%)</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>المخزون الحالي:</span>
                          <span className="font-medium">{item.currentStock.toFixed(0)} {item.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>المستوى الأمثل:</span>
                          <span className="font-medium text-amber-600">{item.optimalLevel.toFixed(0)} {item.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>الكمية الزائدة:</span>
                          <span className="font-medium text-amber-600">{Math.max(0, item.currentStock - item.optimalLevel).toFixed(0)} {item.unit}</span>
                        </div>
                        <div className="w-full">
                          <Progress 
                            value={(item.optimalLevel / item.currentStock) * 100} 
                            className="h-2" 
                          />
                          <div className="flex justify-between text-xs mt-1">
                            <span>المستوى الأمثل</span>
                            <span>المستوى الحالي</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4 border rounded-md">
                  لا توجد عناصر تحتاج إلى خفض المخزون
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-base font-medium mb-3">تفاصيل تحليل المستوى الأمثل للمخزون</h3>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-right">الكود</th>
                    <th className="px-3 py-2 text-right">الاسم</th>
                    <th className="px-3 py-2 text-right">EOQ</th>
                    <th className="px-3 py-2 text-right">نقطة الطلب</th>
                    <th className="px-3 py-2 text-right">المستوى الأمثل</th>
                    <th className="px-3 py-2 text-right">التوفير المحتمل</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="px-3 py-2 text-right">{item.code}</td>
                      <td className="px-3 py-2 text-right">{item.name}</td>
                      <td className="px-3 py-2 text-right">{item.economicOrderQuantity.toFixed(0)} {item.unit}</td>
                      <td className="px-3 py-2 text-right">{item.reorderPoint.toFixed(0)} {item.unit}</td>
                      <td className="px-3 py-2 text-right">{item.optimalLevel.toFixed(0)} {item.unit}</td>
                      <td className="px-3 py-2 text-right">{item.potentialSavings.toFixed(0)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OptimalInventoryAnalysis;
