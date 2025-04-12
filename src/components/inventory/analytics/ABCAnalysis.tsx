
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { classifyABC } from '@/utils/inventoryAnalytics';
import { ChartPie } from 'lucide-react';

interface ABCAnalysisProps {
  inventoryType?: string;
}

const ABCAnalysis: React.FC<ABCAnalysisProps> = ({
  inventoryType = 'all'
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['abc-analysis', inventoryType],
    queryFn: async () => {
      try {
        let itemsWithValue: Array<{ id: number, code: string, name: string, value: number, type: string }> = [];
        
        // جلب المواد الخام
        if (inventoryType === 'all' || inventoryType === 'raw') {
          const { data: rawMaterials } = await supabase
            .from('raw_materials')
            .select('id, code, name, quantity, unit_cost');
          
          if (rawMaterials) {
            itemsWithValue = [
              ...itemsWithValue,
              ...rawMaterials.map(item => ({
                id: item.id,
                code: item.code,
                name: item.name,
                value: (item.quantity || 0) * (item.unit_cost || 0),
                type: 'raw'
              }))
            ];
          }
        }
        
        // جلب مواد التعبئة
        if (inventoryType === 'all' || inventoryType === 'packaging') {
          const { data: packagingMaterials } = await supabase
            .from('packaging_materials')
            .select('id, code, name, quantity, unit_cost');
          
          if (packagingMaterials) {
            itemsWithValue = [
              ...itemsWithValue,
              ...packagingMaterials.map(item => ({
                id: item.id,
                code: item.code,
                name: item.name,
                value: (item.quantity || 0) * (item.unit_cost || 0),
                type: 'packaging'
              }))
            ];
          }
        }
        
        // جلب المنتجات نصف المصنعة
        if (inventoryType === 'all' || inventoryType === 'semi') {
          const { data: semiFinishedProducts } = await supabase
            .from('semi_finished_products')
            .select('id, code, name, quantity, unit_cost');
          
          if (semiFinishedProducts) {
            itemsWithValue = [
              ...itemsWithValue,
              ...semiFinishedProducts.map(item => ({
                id: item.id,
                code: item.code,
                name: item.name,
                value: (item.quantity || 0) * (item.unit_cost || 0),
                type: 'semi'
              }))
            ];
          }
        }
        
        // جلب المنتجات النهائية
        if (inventoryType === 'all' || inventoryType === 'finished') {
          const { data: finishedProducts } = await supabase
            .from('finished_products')
            .select('id, code, name, quantity, unit_cost');
          
          if (finishedProducts) {
            itemsWithValue = [
              ...itemsWithValue,
              ...finishedProducts.map(item => ({
                id: item.id,
                code: item.code,
                name: item.name,
                value: (item.quantity || 0) * (item.unit_cost || 0),
                type: 'finished'
              }))
            ];
          }
        }
        
        // استبعاد العناصر ذات القيمة الصفرية
        const validItems = itemsWithValue.filter(item => item.value > 0);
        
        // تصنيف العناصر باستخدام طريقة ABC
        const abcClassification = classifyABC(validItems);
        
        // إضافة التصنيف إلى كل عنصر
        const itemsWithClassification = validItems.map(item => ({
          ...item,
          classification: abcClassification[item.id] || 'C'
        }));
        
        // ترتيب العناصر تنازليًا حسب القيمة
        const sortedItems = itemsWithClassification.sort((a, b) => b.value - a.value);
        
        // حساب إجمالي قيمة المخزون وعدد العناصر في كل فئة
        const totalValue = sortedItems.reduce((sum, item) => sum + item.value, 0);
        
        const categoryA = sortedItems.filter(item => item.classification === 'A');
        const categoryB = sortedItems.filter(item => item.classification === 'B');
        const categoryC = sortedItems.filter(item => item.classification === 'C');
        
        const categoryAValue = categoryA.reduce((sum, item) => sum + item.value, 0);
        const categoryBValue = categoryB.reduce((sum, item) => sum + item.value, 0);
        const categoryCValue = categoryC.reduce((sum, item) => sum + item.value, 0);
        
        const summary = {
          totalItems: sortedItems.length,
          totalValue: totalValue,
          categories: {
            A: {
              items: categoryA.length,
              value: categoryAValue,
              percentage: totalValue > 0 ? (categoryAValue / totalValue) * 100 : 0,
              itemsPercentage: sortedItems.length > 0 ? (categoryA.length / sortedItems.length) * 100 : 0
            },
            B: {
              items: categoryB.length,
              value: categoryBValue,
              percentage: totalValue > 0 ? (categoryBValue / totalValue) * 100 : 0,
              itemsPercentage: sortedItems.length > 0 ? (categoryB.length / sortedItems.length) * 100 : 0
            },
            C: {
              items: categoryC.length,
              value: categoryCValue,
              percentage: totalValue > 0 ? (categoryCValue / totalValue) * 100 : 0,
              itemsPercentage: sortedItems.length > 0 ? (categoryC.length / sortedItems.length) * 100 : 0
            }
          },
          topItems: sortedItems.slice(0, 10) // أعلى 10 عناصر من حيث القيمة
        };
        
        return summary;
      } catch (error) {
        console.error("Error performing ABC analysis:", error);
        return null;
      }
    },
    refetchInterval: 600000 // إعادة الاستعلام كل 10 دقائق
  });
  
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return [
      { name: 'فئة A', value: data.categories.A.value, percentage: data.categories.A.percentage },
      { name: 'فئة B', value: data.categories.B.value, percentage: data.categories.B.percentage },
      { name: 'فئة C', value: data.categories.C.value, percentage: data.categories.C.percentage }
    ];
  }, [data]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحليل ABC للمخزون</CardTitle>
          <CardDescription>تصنيف عناصر المخزون حسب قيمتها</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تحليل ABC للمخزون</CardTitle>
          <CardDescription>تصنيف عناصر المخزون حسب قيمتها</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6">
            تعذر تحليل البيانات. يرجى المحاولة مرة أخرى لاحقًا.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartPie className="h-5 w-5 text-primary" />
          <span>تحليل ABC للمخزون</span>
        </CardTitle>
        <CardDescription>
          تصنيف عناصر المخزون حسب قيمتها وأهميتها (A: القيمة العالية، B: القيمة المتوسطة، C: القيمة المنخفضة)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-base font-medium mb-4">توزيع قيمة المخزون حسب تصنيف ABC</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString('ar-EG')} ج.م`, 'القيمة']}
                    labelFormatter={(name) => `${name}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className="text-base font-medium mb-4">ملخص تحليل ABC</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">إجمالي العناصر</div>
                  <div className="text-2xl font-bold">{data.totalItems}</div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">إجمالي القيمة</div>
                  <div className="text-2xl font-bold">{data.totalValue.toLocaleString('ar-EG')} ج.م</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="border rounded-md p-3 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                  <div className="flex justify-between">
                    <div className="font-medium text-blue-700 dark:text-blue-300">الفئة A</div>
                    <div className="text-blue-700 dark:text-blue-300">{data.categories.A.items} عنصر ({data.categories.A.itemsPercentage.toFixed(1)}%)</div>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <div className="text-sm text-blue-600 dark:text-blue-400">قيمة عالية</div>
                    <div className="font-bold text-blue-700 dark:text-blue-300">
                      {data.categories.A.value.toLocaleString('ar-EG')} ج.م ({data.categories.A.percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-3 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex justify-between">
                    <div className="font-medium text-green-700 dark:text-green-300">الفئة B</div>
                    <div className="text-green-700 dark:text-green-300">{data.categories.B.items} عنصر ({data.categories.B.itemsPercentage.toFixed(1)}%)</div>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <div className="text-sm text-green-600 dark:text-green-400">قيمة متوسطة</div>
                    <div className="font-bold text-green-700 dark:text-green-300">
                      {data.categories.B.value.toLocaleString('ar-EG')} ج.م ({data.categories.B.percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-3 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                  <div className="flex justify-between">
                    <div className="font-medium text-amber-700 dark:text-amber-300">الفئة C</div>
                    <div className="text-amber-700 dark:text-amber-300">{data.categories.C.items} عنصر ({data.categories.C.itemsPercentage.toFixed(1)}%)</div>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <div className="text-sm text-amber-600 dark:text-amber-400">قيمة منخفضة</div>
                    <div className="font-bold text-amber-700 dark:text-amber-300">
                      {data.categories.C.value.toLocaleString('ar-EG')} ج.م ({data.categories.C.percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-base font-medium mb-3">أعلى 10 عناصر من حيث القيمة</h3>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-right">الكود</th>
                  <th className="px-4 py-2 text-right">الاسم</th>
                  <th className="px-4 py-2 text-right">القيمة</th>
                  <th className="px-4 py-2 text-right">الفئة</th>
                </tr>
              </thead>
              <tbody>
                {data.topItems.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <td className="px-4 py-2 text-right">{item.code}</td>
                    <td className="px-4 py-2 text-right">{item.name}</td>
                    <td className="px-4 py-2 text-right">{item.value.toLocaleString('ar-EG')} ج.م</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        item.classification === 'A' ? 'bg-blue-100 text-blue-700' :
                        item.classification === 'B' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        فئة {item.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ABCAnalysis;
