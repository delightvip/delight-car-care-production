
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { Calendar, CalendarPlus, ChevronDown, ChevronUp, Loader2, RotateCcw, Search, Truck } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, addMonths, differenceInCalendarDays, parseISO } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ar } from 'date-fns/locale';

// نوع بيانات لتوقعات المواد
interface MaterialForecast {
  id: string;
  code: string;
  name: string;
  type: 'raw' | 'packaging';
  currentStock: number;
  unit: string;
  estimatedUsage: number;
  daysUntilStockout: number;
  requiredAmount: number;
  lastUsage: number[];
  usageTrend: 'increasing' | 'decreasing' | 'stable';
}

// نوع بيانات لخطة توريد المواد
interface MaterialSupplyPlan {
  id: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  materialType: 'raw' | 'packaging';
  supplyDate: Date;
  amount: number;
  unit: string;
  status: 'planned' | 'confirmed' | 'delivered';
  notes: string;
}

const MaterialsForecasting = () => {
  const [forecastPeriod, setForecastPeriod] = useState<number>(30);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [materialType, setMaterialType] = useState<'all' | 'raw' | 'packaging'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'daysLeft' | 'amount'>('daysLeft');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [materialSupplyPlans, setMaterialSupplyPlans] = useState<MaterialSupplyPlan[]>([]);
  const [showAddSupplyForm, setShowAddSupplyForm] = useState<boolean>(false);
  const [newSupply, setNewSupply] = useState<{
    materialId: string;
    supplyDate: Date | undefined;
    amount: number;
    notes: string;
  }>({
    materialId: '',
    supplyDate: undefined,
    amount: 0,
    notes: ''
  });
  
  // للحصول على بيانات المواد الخام
  const { data: rawMaterials, isLoading: isLoadingRaw } = useQuery({
    queryKey: ['raw-materials-for-forecast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, code, name, unit, quantity, min_stock')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على بيانات مواد التعبئة
  const { data: packagingMaterials, isLoading: isLoadingPackaging } = useQuery({
    queryKey: ['packaging-materials-for-forecast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('id, code, name, unit, quantity, min_stock')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على بيانات حركات المخزون
  const { data: inventoryMovements, isLoading: isLoadingMovements } = useQuery({
    queryKey: ['inventory-movements-for-forecast'],
    queryFn: async () => {
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 3);
      
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('id, item_id, item_type, movement_type, quantity, created_at')
        .gte('created_at', lastMonthDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // إعداد بيانات التوقعات
  const calculateForecasts = (): MaterialForecast[] => {
    if (isLoadingRaw || isLoadingPackaging || isLoadingMovements) return [];
    
    // تجميع بيانات المواد الخام ومواد التعبئة
    const allMaterials = [
      ...(rawMaterials || []).map(material => ({
        ...material,
        type: 'raw' as const
      })),
      ...(packagingMaterials || []).map(material => ({
        ...material,
        type: 'packaging' as const
      }))
    ];
    
    // حساب التوقعات لكل مادة
    const forecasts = allMaterials.map(material => {
      // البحث عن حركات المخزون الخاصة بهذه المادة
      const materialMovements = (inventoryMovements || []).filter(
        movement => movement.item_id === material.id.toString() && movement.item_type === material.type
      );
      
      // حساب الاستخدام خلال الفترة السابقة (عمليات السحب فقط - الأرقام السالبة)
      const usageMovements = materialMovements.filter(movement => movement.quantity < 0);
      
      // حساب متوسط الاستخدام اليومي
      const totalUsage = usageMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
      const daysInPeriod = 90; // 3 أشهر
      const averageDailyUsage = totalUsage / daysInPeriod || 0.01; // تجنب القسمة على صفر
      
      // حساب عدد الأيام المتبقية قبل نفاد المخزون
      const daysUntilStockout = averageDailyUsage > 0 ? Math.floor(material.quantity / averageDailyUsage) : 999;
      
      // حساب الكمية المطلوبة للفترة القادمة
      const requiredAmount = Math.max(0, (averageDailyUsage * forecastPeriod) - material.quantity);
      
      // تحليل اتجاه الاستهلاك
      const usageTrend = calculateUsageTrend(usageMovements);
      
      // حساب الاستخدام في الأشهر الثلاثة الماضية
      const lastUsage = calculateMonthlyUsage(usageMovements);
      
      return {
        id: material.id.toString(),
        code: material.code,
        name: material.name,
        type: material.type,
        currentStock: material.quantity,
        unit: material.unit,
        estimatedUsage: averageDailyUsage * forecastPeriod,
        daysUntilStockout,
        requiredAmount,
        lastUsage,
        usageTrend
      };
    });
    
    return forecasts;
  };
  
  // حساب اتجاه الاستهلاك
  const calculateUsageTrend = (usageMovements: any[]): 'increasing' | 'decreasing' | 'stable' => {
    if (usageMovements.length < 6) return 'stable';
    
    // تقسيم الحركات إلى نصفين لمقارنة الاتجاه
    const sortedMovements = [...usageMovements].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const midPoint = Math.floor(sortedMovements.length / 2);
    const firstHalfUsage = sortedMovements.slice(0, midPoint).reduce(
      (sum, movement) => sum + Math.abs(movement.quantity), 0
    );
    const secondHalfUsage = sortedMovements.slice(midPoint).reduce(
      (sum, movement) => sum + Math.abs(movement.quantity), 0
    );
    
    const percentChange = ((secondHalfUsage - firstHalfUsage) / firstHalfUsage) * 100;
    
    if (percentChange > 10) return 'increasing';
    if (percentChange < -10) return 'decreasing';
    return 'stable';
  };
  
  // حساب الاستخدام الشهري
  const calculateMonthlyUsage = (usageMovements: any[]): number[] => {
    const monthlyUsage: number[] = [0, 0, 0]; // للأشهر الثلاثة الماضية
    
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(today.getMonth() - 2);
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    
    usageMovements.forEach(movement => {
      const movementDate = new Date(movement.created_at);
      const absQuantity = Math.abs(movement.quantity);
      
      if (movementDate >= oneMonthAgo) {
        monthlyUsage[0] += absQuantity;
      } else if (movementDate >= twoMonthsAgo) {
        monthlyUsage[1] += absQuantity;
      } else if (movementDate >= threeMonthsAgo) {
        monthlyUsage[2] += absQuantity;
      }
    });
    
    return monthlyUsage;
  };
  
  // تطبيق الفلترة والترتيب على التوقعات
  const getForecastedMaterials = () => {
    const forecasts = calculateForecasts();
    
    // تطبيق فلترة نوع المادة
    let filteredForecasts = forecasts;
    if (materialType !== 'all') {
      filteredForecasts = forecasts.filter(forecast => forecast.type === materialType);
    }
    
    // تطبيق البحث النصي
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredForecasts = filteredForecasts.filter(forecast =>
        forecast.name.toLowerCase().includes(searchLower) ||
        forecast.code.toLowerCase().includes(searchLower)
      );
    }
    
    // تطبيق الترتيب
    const sortedForecasts = [...filteredForecasts].sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'daysLeft') {
        return sortOrder === 'asc'
          ? a.daysUntilStockout - b.daysUntilStockout
          : b.daysUntilStockout - a.daysUntilStockout;
      } else if (sortBy === 'amount') {
        return sortOrder === 'asc'
          ? a.requiredAmount - b.requiredAmount
          : b.requiredAmount - a.requiredAmount;
      }
      return 0;
    });
    
    return sortedForecasts;
  };
  
  // تغيير ترتيب النتائج
  const toggleSort = (column: 'name' | 'daysLeft' | 'amount') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  // إضافة خطة توريد جديدة
  const addSupplyPlan = () => {
    if (!newSupply.materialId) {
      toast.error('يرجى اختيار مادة');
      return;
    }
    
    if (!newSupply.supplyDate) {
      toast.error('يرجى تحديد تاريخ التوريد');
      return;
    }
    
    if (newSupply.amount <= 0) {
      toast.error('يرجى إدخال كمية صحيحة');
      return;
    }
    
    // البحث عن بيانات المادة
    const forecastedMaterials = getForecastedMaterials();
    const selectedMaterial = forecastedMaterials.find(material => material.id === newSupply.materialId);
    
    if (!selectedMaterial) {
      toast.error('لم يتم العثور على المادة المحددة');
      return;
    }
    
    // إنشاء خطة التوريد الجديدة
    const newSupplyPlan: MaterialSupplyPlan = {
      id: Date.now().toString(),
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      materialCode: selectedMaterial.code,
      materialType: selectedMaterial.type,
      supplyDate: newSupply.supplyDate,
      amount: newSupply.amount,
      unit: selectedMaterial.unit,
      status: 'planned',
      notes: newSupply.notes
    };
    
    // إضافة الخطة لقائمة الخطط
    setMaterialSupplyPlans(prev => [...prev, newSupplyPlan]);
    
    // إعادة تعيين نموذج الإضافة
    setNewSupply({
      materialId: '',
      supplyDate: undefined,
      amount: 0,
      notes: ''
    });
    
    setShowAddSupplyForm(false);
    toast.success('تمت إضافة خطة التوريد بنجاح');
  };
  
  // حذف خطة توريد
  const deleteSupplyPlan = (planId: string) => {
    setMaterialSupplyPlans(prev => prev.filter(plan => plan.id !== planId));
    toast.success('تم حذف خطة التوريد');
  };
  
  // تغيير حالة خطة توريد
  const updateSupplyPlanStatus = (planId: string, newStatus: 'planned' | 'confirmed' | 'delivered') => {
    setMaterialSupplyPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return { ...plan, status: newStatus };
    }));
    
    toast.success(`تم تحديث حالة خطة التوريد إلى ${getStatusText(newStatus)}`);
  };
  
  // الحصول على النص العربي لحالة التوريد
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'planned': return 'مخطط';
      case 'confirmed': return 'مؤكد';
      case 'delivered': return 'تم التسليم';
      default: return '';
    }
  };
  
  // الحصول على لون حالة التوريد
  const getStatusVariant = (status: string): 'outline' | 'secondary' | 'success' => {
    switch (status) {
      case 'planned': return 'outline';
      case 'confirmed': return 'secondary';
      case 'delivered': return 'success';
      default: return 'outline';
    }
  };
  
  // الحصول على لون حالة أيام المخزون المتبقية
  const getDaysLeftVariant = (days: number): 'outline' | 'destructive' | 'secondary' | 'success' => {
    if (days <= 7) return 'destructive';
    if (days <= 14) return 'secondary';
    if (days <= 30) return 'outline';
    return 'success';
  };
  
  // الحصول على نص اتجاه الاستهلاك
  const getTrendText = (trend: string): string => {
    switch (trend) {
      case 'increasing': return 'متزايد';
      case 'decreasing': return 'متناقص';
      case 'stable': return 'مستقر';
      default: return '';
    }
  };
  
  // الحصول على لون اتجاه الاستهلاك
  const getTrendVariant = (trend: string): 'destructive' | 'success' | 'outline' => {
    switch (trend) {
      case 'increasing': return 'destructive';
      case 'decreasing': return 'success';
      case 'stable': return 'outline';
      default: return 'outline';
    }
  };
  
  // حساب نسبة تغطية المخزون
  const calculateStockCoverage = (forecastedMaterials: MaterialForecast[]): number => {
    if (forecastedMaterials.length === 0) return 0;
    
    const materialsWithSufficientStock = forecastedMaterials.filter(
      material => material.daysUntilStockout >= forecastPeriod
    );
    
    return (materialsWithSufficientStock.length / forecastedMaterials.length) * 100;
  };
  
  // اللوحة الرئيسية لتوقعات المواد
  return (
    <div className="space-y-6">
      {/* أدوات التوقع والتصفية */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="forecastPeriod">فترة التوقع (بالأيام)</Label>
              <div className="flex space-x-2 space-x-reverse">
                <Input
                  id="forecastPeriod"
                  type="number"
                  min="1"
                  max="180"
                  value={forecastPeriod}
                  onChange={(e) => setForecastPeriod(Number(e.target.value))}
                />
                <Button variant="outline" onClick={() => setForecastPeriod(30)}>30</Button>
                <Button variant="outline" onClick={() => setForecastPeriod(60)}>60</Button>
                <Button variant="outline" onClick={() => setForecastPeriod(90)}>90</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="materialType">نوع المادة</Label>
              <Select value={materialType} onValueChange={(value) => setMaterialType(value as any)}>
                <SelectTrigger id="materialType">
                  <SelectValue placeholder="جميع المواد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواد</SelectItem>
                  <SelectItem value="raw">المواد الخام</SelectItem>
                  <SelectItem value="packaging">مواد التعبئة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="search">البحث في المواد</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="اسم المادة أو الكود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* الرسومات والإحصائيات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* إحصائيات التوقعات */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ملخص التوقعات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingRaw || isLoadingPackaging || isLoadingMovements ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {/* إحصائيات سريعة */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-sm font-medium text-muted-foreground">المواد المطلوبة</div>
                      <div className="text-2xl font-bold mt-1">
                        {getForecastedMaterials().filter(m => m.requiredAmount > 0).length}
                      </div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-sm font-medium text-muted-foreground">تغطية المخزون</div>
                      <div className="text-2xl font-bold mt-1">
                        {calculateStockCoverage(getForecastedMaterials()).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* المواد الأكثر طلباً */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">المواد الأكثر طلباً</h3>
                    <div className="space-y-2">
                      {getForecastedMaterials()
                        .filter(m => m.requiredAmount > 0)
                        .sort((a, b) => b.requiredAmount - a.requiredAmount)
                        .slice(0, 5)
                        .map(material => (
                          <div key={material.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                            <div className="text-sm">{material.name}</div>
                            <div className="font-medium">{material.requiredAmount.toFixed(1)} {material.unit}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  {/* المواد المتوقع نفادها قريباً */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">المواد المتوقع نفادها قريباً</h3>
                    <div className="space-y-2">
                      {getForecastedMaterials()
                        .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
                        .slice(0, 5)
                        .map(material => (
                          <div key={material.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                            <div className="text-sm">{material.name}</div>
                            <Badge variant={getDaysLeftVariant(material.daysUntilStockout)}>
                              {material.daysUntilStockout} يوم
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* خطط التوريد */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">خطط التوريد</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowAddSupplyForm(!showAddSupplyForm)}>
                {showAddSupplyForm ? 'إلغاء' : 'إضافة خطة توريد'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddSupplyForm && (
              <div className="mb-6 border rounded-md p-4">
                <h3 className="font-medium mb-4">إضافة خطة توريد جديدة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="materialSelect">المادة</Label>
                    <Select value={newSupply.materialId} onValueChange={(value) => setNewSupply({ ...newSupply, materialId: value })}>
                      <SelectTrigger id="materialSelect">
                        <SelectValue placeholder="اختر المادة" />
                      </SelectTrigger>
                      <SelectContent>
                        {getForecastedMaterials().map(material => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.name} ({material.requiredAmount.toFixed(1)} {material.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>تاريخ التوريد المتوقع</Label>
                    <DatePicker
                      date={newSupply.supplyDate}
                      setDate={(date) => setNewSupply({ ...newSupply, supplyDate: date })}
                      locale={ar}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supplyAmount">الكمية</Label>
                    <Input
                      id="supplyAmount"
                      type="number"
                      min="0"
                      value={newSupply.amount}
                      onChange={(e) => setNewSupply({ ...newSupply, amount: Number(e.target.value) })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supplyNotes">ملاحظات</Label>
                    <Input
                      id="supplyNotes"
                      value={newSupply.notes}
                      onChange={(e) => setNewSupply({ ...newSupply, notes: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button onClick={addSupplyPlan}>إضافة خطة التوريد</Button>
                </div>
              </div>
            )}
            
            {materialSupplyPlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد خطط توريد حتى الآن. قم بإضافة خطة توريد جديدة.
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-4">
                  {materialSupplyPlans.map(plan => (
                    <div key={plan.id} className="flex flex-col border rounded-md overflow-hidden">
                      <div className="flex justify-between items-center p-3 bg-muted/50">
                        <div>
                          <div className="font-medium">{plan.materialName}</div>
                          <div className="text-sm text-muted-foreground">
                            {plan.materialCode} · {format(plan.supplyDate, 'dd/MM/yyyy')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusVariant(plan.status)}>
                            {getStatusText(plan.status)}
                          </Badge>
                          <div className="font-medium">{plan.amount} {plan.unit}</div>
                        </div>
                      </div>
                      
                      <div className="p-3 flex flex-col sm:flex-row justify-between gap-3">
                        <div className="text-sm">
                          {plan.notes || 'لا توجد ملاحظات'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {plan.status === 'planned' && (
                            <Button size="sm" variant="outline" onClick={() => updateSupplyPlanStatus(plan.id, 'confirmed')}>
                              تأكيد
                            </Button>
                          )}
                          {plan.status === 'confirmed' && (
                            <Button size="sm" variant="outline" onClick={() => updateSupplyPlanStatus(plan.id, 'delivered')}>
                              تم التسليم
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteSupplyPlan(plan.id)}>
                            حذف
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* جدول التوقعات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">توقعات استهلاك المواد لفترة {forecastPeriod} يوم</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRaw || isLoadingPackaging || isLoadingMovements ? (
            <LoadingIndicator />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                      <div className="flex items-center">
                        المادة
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المخزون الحالي</TableHead>
                    <TableHead>الاستهلاك المتوقع</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('daysLeft')}>
                      <div className="flex items-center">
                        الأيام المتبقية
                        {sortBy === 'daysLeft' && (
                          sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('amount')}>
                      <div className="flex items-center">
                        الكمية المطلوبة
                        {sortBy === 'amount' && (
                          sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>اتجاه الاستهلاك</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getForecastedMaterials().map(material => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div className="font-medium">{material.name}</div>
                        <div className="text-xs text-muted-foreground">{material.code}</div>
                      </TableCell>
                      <TableCell>
                        {material.type === 'raw' ? 'مواد خام' : 'مواد تعبئة'}
                      </TableCell>
                      <TableCell>
                        {material.currentStock.toFixed(1)} {material.unit}
                      </TableCell>
                      <TableCell>
                        {material.estimatedUsage.toFixed(1)} {material.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getDaysLeftVariant(material.daysUntilStockout)}>
                          {material.daysUntilStockout} يوم
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {material.requiredAmount > 0 ? (
                          <span className="font-medium">{material.requiredAmount.toFixed(1)} {material.unit}</span>
                        ) : (
                          <span className="text-muted-foreground">مخزون كافي</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTrendVariant(material.usageTrend)}>
                          {getTrendText(material.usageTrend)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* تفاصيل استهلاك المواد */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تفاصيل استهلاك المواد</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRaw || isLoadingPackaging || isLoadingMovements ? (
            <LoadingIndicator />
          ) : (
            <ScrollArea className="h-[400px]">
              <Accordion type="single" collapsible className="w-full">
                {getForecastedMaterials().map(material => (
                  <AccordionItem key={material.id} value={material.id}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-4">
                        <div>
                          <span className="font-medium">{material.name}</span>
                          <span className="text-muted-foreground text-sm mr-2">({material.code})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getDaysLeftVariant(material.daysUntilStockout)}>
                            {material.daysUntilStockout} يوم
                          </Badge>
                          {material.requiredAmount > 0 && (
                            <Badge variant="outline" className="bg-muted/50">
                              {material.requiredAmount.toFixed(1)} {material.unit}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 p-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">المخزون الحالي</div>
                            <div className="font-medium">{material.currentStock.toFixed(1)} {material.unit}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">الاستهلاك المتوقع</div>
                            <div className="font-medium">{material.estimatedUsage.toFixed(1)} {material.unit}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">اتجاه الاستهلاك</div>
                            <Badge variant={getTrendVariant(material.usageTrend)}>
                              {getTrendText(material.usageTrend)}
                            </Badge>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium mb-2">استهلاك الأشهر الثلاثة الماضية</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 bg-muted/50 rounded-md text-center">
                              <div className="text-xs text-muted-foreground">الشهر الحالي</div>
                              <div className="font-medium">{material.lastUsage[0].toFixed(1)} {material.unit}</div>
                            </div>
                            <div className="p-2 bg-muted/50 rounded-md text-center">
                              <div className="text-xs text-muted-foreground">الشهر السابق</div>
                              <div className="font-medium">{material.lastUsage[1].toFixed(1)} {material.unit}</div>
                            </div>
                            <div className="p-2 bg-muted/50 rounded-md text-center">
                              <div className="text-xs text-muted-foreground">شهرين مضى</div>
                              <div className="font-medium">{material.lastUsage[2].toFixed(1)} {material.unit}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium mb-2">الاستهلاك المتوقع خلال الفترات القادمة</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 bg-muted/50 rounded-md text-center">
                              <div className="text-xs text-muted-foreground">30 يوم</div>
                              <div className="font-medium">{(material.estimatedUsage * 30 / forecastPeriod).toFixed(1)} {material.unit}</div>
                            </div>
                            <div className="p-2 bg-muted/50 rounded-md text-center">
                              <div className="text-xs text-muted-foreground">60 يوم</div>
                              <div className="font-medium">{(material.estimatedUsage * 60 / forecastPeriod).toFixed(1)} {material.unit}</div>
                            </div>
                            <div className="p-2 bg-muted/50 rounded-md text-center">
                              <div className="text-xs text-muted-foreground">90 يوم</div>
                              <div className="font-medium">{(material.estimatedUsage * 90 / forecastPeriod).toFixed(1)} {material.unit}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* خطط التوريد المرتبطة بهذه المادة */}
                        <div>
                          <div className="text-sm font-medium mb-2">خطط التوريد المرتبطة</div>
                          {materialSupplyPlans.filter(plan => plan.materialId === material.id).length === 0 ? (
                            <div className="text-sm text-muted-foreground">لا توجد خطط توريد لهذه المادة</div>
                          ) : (
                            <div className="space-y-2">
                              {materialSupplyPlans
                                .filter(plan => plan.materialId === material.id)
                                .map(plan => (
                                  <div key={plan.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                                    <div className="text-sm">
                                      {format(plan.supplyDate, 'dd/MM/yyyy')} - {plan.amount} {plan.unit}
                                    </div>
                                    <Badge variant={getStatusVariant(plan.status)}>
                                      {getStatusText(plan.status)}
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNewSupply({
                                materialId: material.id,
                                supplyDate: addMonths(new Date(), 1),
                                amount: Math.ceil(material.requiredAmount),
                                notes: `توريد ${material.name}`
                              });
                              setShowAddSupplyForm(true);
                            }}
                          >
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            إضافة خطة توريد
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialsForecasting;
