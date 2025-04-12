
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChartBar, DollarSign, LineChart, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { CartesianGrid, Line, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';

// نوع بيانات لتحليل التكاليف
interface CostAnalysisItem {
  id: string;
  name: string;
  code: string;
  type: 'raw' | 'semi' | 'packaging' | 'finished';
  originalCost: number;
  adjustedCost: number;
  adjustmentFactor: number;
}

// نوع بيانات سيناريو تكاليف
interface CostScenario {
  id: string;
  name: string;
  description: string;
  items: CostAnalysisItem[];
  totalOriginalCost: number;
  totalAdjustedCost: number;
}

const CostSimulation = () => {
  const [scenarios, setScenarios] = useState<CostScenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<CostScenario | null>(null);
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [newScenarioDescription, setNewScenarioDescription] = useState<string>('');
  const [selectedChart, setSelectedChart] = useState<'comparison' | 'impact'>('comparison');

  // للحصول على بيانات المواد الخام
  const { data: rawMaterials, isLoading: isLoadingRaw } = useQuery({
    queryKey: ['raw-materials-for-cost'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, code, unit_cost')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على بيانات المنتجات نصف المصنعة
  const { data: semiFinished, isLoading: isLoadingSemi } = useQuery({
    queryKey: ['semi-finished-for-cost'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, name, code, unit_cost')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على بيانات مواد التعبئة
  const { data: packagingMaterials, isLoading: isLoadingPackaging } = useQuery({
    queryKey: ['packaging-materials-for-cost'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('id, name, code, unit_cost')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على بيانات المنتجات النهائية
  const { data: finishedProducts, isLoading: isLoadingFinished } = useQuery({
    queryKey: ['finished-products-for-cost'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_products')
        .select('id, name, code, unit_cost')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // إنشاء سيناريو جديد
  const createNewScenario = () => {
    if (!newScenarioName) {
      toast.error('يرجى إدخال اسم للسيناريو');
      return;
    }
    
    // تجميع البيانات من جميع المصادر
    const rawItems: CostAnalysisItem[] = (rawMaterials || []).map(item => ({
      id: `raw-${item.id}`,
      name: item.name,
      code: item.code,
      type: 'raw',
      originalCost: item.unit_cost,
      adjustedCost: item.unit_cost,
      adjustmentFactor: 1
    }));
    
    const semiItems: CostAnalysisItem[] = (semiFinished || []).map(item => ({
      id: `semi-${item.id}`,
      name: item.name,
      code: item.code,
      type: 'semi',
      originalCost: item.unit_cost,
      adjustedCost: item.unit_cost,
      adjustmentFactor: 1
    }));
    
    const packagingItems: CostAnalysisItem[] = (packagingMaterials || []).map(item => ({
      id: `packaging-${item.id}`,
      name: item.name,
      code: item.code,
      type: 'packaging',
      originalCost: item.unit_cost,
      adjustedCost: item.unit_cost,
      adjustmentFactor: 1
    }));
    
    const finishedItems: CostAnalysisItem[] = (finishedProducts || []).map(item => ({
      id: `finished-${item.id}`,
      name: item.name,
      code: item.code,
      type: 'finished',
      originalCost: item.unit_cost,
      adjustedCost: item.unit_cost,
      adjustmentFactor: 1
    }));
    
    // دمج جميع العناصر
    const allItems = [...rawItems, ...semiItems, ...packagingItems, ...finishedItems];
    
    // حساب إجمالي التكاليف
    const totalOriginalCost = allItems.reduce((sum, item) => sum + item.originalCost, 0);
    
    // إنشاء السيناريو الجديد
    const newScenario: CostScenario = {
      id: Date.now().toString(),
      name: newScenarioName,
      description: newScenarioDescription || `سيناريو تكاليف ${newScenarioName}`,
      items: allItems,
      totalOriginalCost,
      totalAdjustedCost: totalOriginalCost
    };
    
    // إضافة السيناريو للقائمة وتعيينه كسيناريو نشط
    setScenarios(prev => [...prev, newScenario]);
    setActiveScenario(newScenario);
    
    // إعادة تعيين النموذج
    setNewScenarioName('');
    setNewScenarioDescription('');
    
    toast.success('تم إنشاء سيناريو التكاليف الجديد');
  };
  
  // تعديل عامل التكلفة لعنصر في السيناريو
  const updateItemCostFactor = (itemId: string, newFactor: number) => {
    if (!activeScenario) return;
    
    // تحديث العنصر المطلوب
    const updatedItems = activeScenario.items.map(item => {
      if (item.id !== itemId) return item;
      
      return {
        ...item,
        adjustmentFactor: newFactor,
        adjustedCost: item.originalCost * newFactor
      };
    });
    
    // إعادة حساب إجمالي التكاليف المعدلة
    const totalAdjustedCost = updatedItems.reduce((sum, item) => sum + item.adjustedCost, 0);
    
    // تحديث السيناريو النشط
    const updatedScenario: CostScenario = {
      ...activeScenario,
      items: updatedItems,
      totalAdjustedCost
    };
    
    setActiveScenario(updatedScenario);
    
    // تحديث قائمة السيناريوهات
    setScenarios(prev => prev.map(s => s.id === updatedScenario.id ? updatedScenario : s));
  };
  
  // تطبيق عامل زيادة على مجموعة من العناصر
  const applyBulkIncrease = (itemType: 'raw' | 'semi' | 'packaging' | 'finished', factor: number) => {
    if (!activeScenario) return;
    
    // تحديث العناصر من النوع المحدد
    const updatedItems = activeScenario.items.map(item => {
      if (item.type !== itemType) return item;
      
      return {
        ...item,
        adjustmentFactor: factor,
        adjustedCost: item.originalCost * factor
      };
    });
    
    // إعادة حساب إجمالي التكاليف المعدلة
    const totalAdjustedCost = updatedItems.reduce((sum, item) => sum + item.adjustedCost, 0);
    
    // تحديث السيناريو النشط
    const updatedScenario: CostScenario = {
      ...activeScenario,
      items: updatedItems,
      totalAdjustedCost
    };
    
    setActiveScenario(updatedScenario);
    
    // تحديث قائمة السيناريوهات
    setScenarios(prev => prev.map(s => s.id === updatedScenario.id ? updatedScenario : s));
    
    toast.success(`تم تطبيق عامل ${factor}× على جميع عناصر ${getItemTypeName(itemType)}`);
  };
  
  // الحصول على اسم نوع العنصر بالعربية
  const getItemTypeName = (type: 'raw' | 'semi' | 'packaging' | 'finished'): string => {
    switch (type) {
      case 'raw': return 'المواد الخام';
      case 'semi': return 'المنتجات نصف المصنعة';
      case 'packaging': return 'مواد التعبئة';
      case 'finished': return 'المنتجات النهائية';
      default: return '';
    }
  };
  
  // تحديد لون لنوع العنصر في الرسوم البيانية
  const getColorForType = (type: string): string => {
    switch (type) {
      case 'raw': return '#4338ca';
      case 'semi': return '#0891b2';
      case 'packaging': return '#7c3aed';
      case 'finished': return '#059669';
      default: return '#64748b';
    }
  };
  
  // بيانات للرسم البياني للمقارنة
  const getComparisonChartData = () => {
    if (!activeScenario) return [];
    
    // تجميع المواد حسب النوع
    const rawSum = activeScenario.items
      .filter(item => item.type === 'raw')
      .reduce((sum, item) => ({ original: sum.original + item.originalCost, adjusted: sum.adjusted + item.adjustedCost }), { original: 0, adjusted: 0 });
    
    const semiSum = activeScenario.items
      .filter(item => item.type === 'semi')
      .reduce((sum, item) => ({ original: sum.original + item.originalCost, adjusted: sum.adjusted + item.adjustedCost }), { original: 0, adjusted: 0 });
    
    const packagingSum = activeScenario.items
      .filter(item => item.type === 'packaging')
      .reduce((sum, item) => ({ original: sum.original + item.originalCost, adjusted: sum.adjusted + item.adjustedCost }), { original: 0, adjusted: 0 });
    
    const finishedSum = activeScenario.items
      .filter(item => item.type === 'finished')
      .reduce((sum, item) => ({ original: sum.original + item.originalCost, adjusted: sum.adjusted + item.adjustedCost }), { original: 0, adjusted: 0 });
    
    return [
      { name: 'المواد الخام', original: rawSum.original, adjusted: rawSum.adjusted },
      { name: 'المنتجات نصف المصنعة', original: semiSum.original, adjusted: semiSum.adjusted },
      { name: 'مواد التعبئة', original: packagingSum.original, adjusted: packagingSum.adjusted },
      { name: 'المنتجات النهائية', original: finishedSum.original, adjusted: finishedSum.adjusted }
    ];
  };
  
  // بيانات للرسم البياني لتأثير التغيرات
  const getImpactChartData = () => {
    if (!activeScenario) return [];
    
    // العناصر ذات التغير الأكبر في التكلفة
    return activeScenario.items
      .map(item => ({
        name: item.name,
        code: item.code,
        type: item.type,
        change: (item.adjustedCost - item.originalCost),
        percentChange: ((item.adjustedCost - item.originalCost) / item.originalCost) * 100
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10);
  };
  
  // إعادة تعيين السيناريو إلى القيم الأصلية
  const resetScenario = () => {
    if (!activeScenario) return;
    
    // إعادة تعيين جميع العناصر إلى عامل 1
    const resetItems = activeScenario.items.map(item => ({
      ...item,
      adjustmentFactor: 1,
      adjustedCost: item.originalCost
    }));
    
    // تحديث السيناريو
    const updatedScenario: CostScenario = {
      ...activeScenario,
      items: resetItems,
      totalAdjustedCost: activeScenario.totalOriginalCost
    };
    
    setActiveScenario(updatedScenario);
    
    // تحديث قائمة السيناريوهات
    setScenarios(prev => prev.map(s => s.id === updatedScenario.id ? updatedScenario : s));
    
    toast.info('تم إعادة تعيين جميع التعديلات إلى القيم الأصلية');
  };
  
  // حفظ السيناريو
  const saveScenario = () => {
    if (!activeScenario) return;
    
    // لأغراض المحاكاة، نقوم فقط بعرض رسالة نجاح
    toast.success('تم حفظ السيناريو بنجاح');
  };
  
  // حذف السيناريو
  const deleteScenario = (scenarioId: string) => {
    setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    
    if (activeScenario && activeScenario.id === scenarioId) {
      setActiveScenario(null);
    }
    
    toast.success('تم حذف السيناريو');
  };
  
  // تحميل السيناريو
  const loadScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      setActiveScenario(scenario);
      toast.success(`تم تحميل سيناريو "${scenario.name}"`);
    }
  };
  
  // حسابات إضافية للسيناريو
  const scenarioStats = activeScenario ? {
    totalItems: activeScenario.items.length,
    increasedItems: activeScenario.items.filter(item => item.adjustedCost > item.originalCost).length,
    decreasedItems: activeScenario.items.filter(item => item.adjustedCost < item.originalCost).length,
    unchangedItems: activeScenario.items.filter(item => item.adjustedCost === item.originalCost).length,
    totalIncrease: activeScenario.totalAdjustedCost - activeScenario.totalOriginalCost,
    percentageChange: ((activeScenario.totalAdjustedCost - activeScenario.totalOriginalCost) / activeScenario.totalOriginalCost) * 100
  } : null;
  
  // تصنيف العناصر حسب النوع للعرض
  const getItemsByType = (type: 'raw' | 'semi' | 'packaging' | 'finished') => {
    if (!activeScenario) return [];
    return activeScenario.items.filter(item => item.type === type);
  };
  
  // اللوحة الرئيسية لمحاكاة التكاليف
  return (
    <div className="space-y-6">
      {!activeScenario ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* نموذج إنشاء سيناريو جديد */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">إنشاء سيناريو تكاليف جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scenarioName">اسم السيناريو</Label>
                <Input
                  id="scenarioName"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="أدخل اسماً للسيناريو"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scenarioDesc">وصف السيناريو (اختياري)</Label>
                <Input
                  id="scenarioDesc"
                  value={newScenarioDescription}
                  onChange={(e) => setNewScenarioDescription(e.target.value)}
                  placeholder="أدخل وصفاً للسيناريو"
                />
              </div>
              <Button
                onClick={createNewScenario}
                className="w-full"
                disabled={isLoadingRaw || isLoadingSemi || isLoadingPackaging || isLoadingFinished}
              >
                إنشاء سيناريو جديد
              </Button>
              
              {(isLoadingRaw || isLoadingSemi || isLoadingPackaging || isLoadingFinished) && (
                <div className="text-center text-sm text-muted-foreground">
                  جاري تحميل البيانات...
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* قائمة السيناريوهات الحالية */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">السيناريوهات المتاحة</CardTitle>
            </CardHeader>
            <CardContent>
              {scenarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد سيناريوهات متاحة. قم بإنشاء سيناريو جديد.
                </div>
              ) : (
                <div className="space-y-4">
                  {scenarios.map((scenario) => (
                    <div key={scenario.id} className="flex justify-between items-center p-4 border rounded-md">
                      <div>
                        <h3 className="font-medium">{scenario.name}</h3>
                        <p className="text-sm text-muted-foreground">{scenario.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => loadScenario(scenario.id)}>
                          تحميل
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteScenario(scenario.id)}>
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* عنوان السيناريو وإجراءات */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{activeScenario.name}</h2>
              <p className="text-muted-foreground">{activeScenario.description}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetScenario}>
                <RotateCcw className="h-4 w-4 mr-2" />
                إعادة تعيين
              </Button>
              <Button variant="outline" onClick={saveScenario}>
                <Save className="h-4 w-4 mr-2" />
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setActiveScenario(null)}>
                العودة للقائمة
              </Button>
            </div>
          </div>
          
          {/* ملخص السيناريو */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium mt-2">التكلفة الأصلية</h3>
                  <p className="text-2xl font-bold">{activeScenario.totalOriginalCost.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium mt-2">التكلفة المعدلة</h3>
                  <p className="text-2xl font-bold">{activeScenario.totalAdjustedCost.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <ChartBar className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium mt-2">التغير المطلق</h3>
                  <p className={`text-2xl font-bold ${scenarioStats?.totalIncrease === 0 ? '' : scenarioStats?.totalIncrease! > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {scenarioStats?.totalIncrease.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <LineChart className="h-8 w-8 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium mt-2">التغير النسبي</h3>
                  <p className={`text-2xl font-bold ${scenarioStats?.percentageChange === 0 ? '' : scenarioStats?.percentageChange! > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {scenarioStats?.percentageChange.toFixed(2)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* الرسوم البيانية والتحليلات */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">تحليل التغيرات في التكاليف</CardTitle>
                  <Select value={selectedChart} onValueChange={(value) => setSelectedChart(value as any)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="نوع التحليل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comparison">مقارنة التكاليف</SelectItem>
                      <SelectItem value="impact">تأثير التغيرات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {selectedChart === 'comparison' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getComparisonChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="original" name="التكلفة الأصلية" fill="#6366F1" />
                        <Bar dataKey="adjusted" name="التكلفة المعدلة" fill="#EC4899" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getImpactChartData()} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip 
                          formatter={(value: any, name: any, props: any) => {
                            const entry = props.payload;
                            return [`${value.toFixed(2)} (${entry.percentChange.toFixed(2)}%)`, `التغير في ${entry.name}`];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="change" name="مقدار التغير" fill={(entry) => 
                          entry.change > 0 ? '#ef4444' : '#10b981'
                        } />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* أدوات تطبيق التغييرات الجماعية */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تطبيق تغييرات جماعية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium">المواد الخام</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('raw', 0.9)}>-10%</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('raw', 1)}>إعادة</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('raw', 1.1)}>+10%</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('raw', 1.2)}>+20%</Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">المنتجات نصف المصنعة</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('semi', 0.9)}>-10%</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('semi', 1)}>إعادة</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('semi', 1.1)}>+10%</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('semi', 1.2)}>+20%</Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">مواد التعبئة</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('packaging', 0.9)}>-10%</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('packaging', 1)}>إعادة</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('packaging', 1.15)}>+15%</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('packaging', 1.3)}>+30%</Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">المنتجات النهائية</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('finished', 0.95)}>-5%</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('finished', 1)}>إعادة</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('finished', 1.05)}>+5%</Button>
                    <Button size="sm" variant="outline" onClick={() => applyBulkIncrease('finished', 1.1)}>+10%</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* تفاصيل العناصر */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تعديل عناصر السيناريو</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="raw">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
                  <TabsTrigger value="raw">المواد الخام</TabsTrigger>
                  <TabsTrigger value="semi">المنتجات نصف المصنعة</TabsTrigger>
                  <TabsTrigger value="packaging">مواد التعبئة</TabsTrigger>
                  <TabsTrigger value="finished">المنتجات النهائية</TabsTrigger>
                </TabsList>
                
                <ScrollArea className="h-[350px] mt-4">
                  <TabsContent value="raw" className="space-y-4 mt-2">
                    {getItemsByType('raw').map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.code}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">التكلفة الأصلية:</span> {item.originalCost.toFixed(2)}
                          </div>
                          <div className="w-24">
                            <Slider
                              value={[item.adjustmentFactor * 100]}
                              min={50}
                              max={200}
                              step={5}
                              onValueChange={(value) => updateItemCostFactor(item.id, value[0] / 100)}
                            />
                          </div>
                          <Badge variant={
                            item.adjustmentFactor === 1 ? "outline" : 
                            item.adjustmentFactor > 1 ? "destructive" : "success"
                          }>
                            {(item.adjustmentFactor * 100).toFixed(0)}%
                          </Badge>
                          <div className="w-20 text-center">
                            {item.adjustedCost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="semi" className="space-y-4 mt-2">
                    {getItemsByType('semi').map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.code}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">التكلفة الأصلية:</span> {item.originalCost.toFixed(2)}
                          </div>
                          <div className="w-24">
                            <Slider
                              value={[item.adjustmentFactor * 100]}
                              min={50}
                              max={200}
                              step={5}
                              onValueChange={(value) => updateItemCostFactor(item.id, value[0] / 100)}
                            />
                          </div>
                          <Badge variant={
                            item.adjustmentFactor === 1 ? "outline" : 
                            item.adjustmentFactor > 1 ? "destructive" : "success"
                          }>
                            {(item.adjustmentFactor * 100).toFixed(0)}%
                          </Badge>
                          <div className="w-20 text-center">
                            {item.adjustedCost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="packaging" className="space-y-4 mt-2">
                    {getItemsByType('packaging').map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.code}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">التكلفة الأصلية:</span> {item.originalCost.toFixed(2)}
                          </div>
                          <div className="w-24">
                            <Slider
                              value={[item.adjustmentFactor * 100]}
                              min={50}
                              max={200}
                              step={5}
                              onValueChange={(value) => updateItemCostFactor(item.id, value[0] / 100)}
                            />
                          </div>
                          <Badge variant={
                            item.adjustmentFactor === 1 ? "outline" : 
                            item.adjustmentFactor > 1 ? "destructive" : "success"
                          }>
                            {(item.adjustmentFactor * 100).toFixed(0)}%
                          </Badge>
                          <div className="w-20 text-center">
                            {item.adjustedCost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="finished" className="space-y-4 mt-2">
                    {getItemsByType('finished').map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.code}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">التكلفة الأصلية:</span> {item.originalCost.toFixed(2)}
                          </div>
                          <div className="w-24">
                            <Slider
                              value={[item.adjustmentFactor * 100]}
                              min={50}
                              max={200}
                              step={5}
                              onValueChange={(value) => updateItemCostFactor(item.id, value[0] / 100)}
                            />
                          </div>
                          <Badge variant={
                            item.adjustmentFactor === 1 ? "outline" : 
                            item.adjustmentFactor > 1 ? "destructive" : "success"
                          }>
                            {(item.adjustmentFactor * 100).toFixed(0)}%
                          </Badge>
                          <div className="w-20 text-center">
                            {item.adjustedCost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CostSimulation;
