
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BadgePercent, Factory, LineChart, Loader2, PackageCheck, RotateCcw, Save, SquareStack, Target } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { addMonths, format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { ar } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

// نوع بيانات لخط الإنتاج
interface ProductionLine {
  id: string;
  name: string;
  baseCapacity: number; // الطاقة الأساسية اليومية
  currentEfficiency: number; // نسبة الكفاءة الحالية (0-100%)
  maxCapacity: number; // أقصى طاقة ممكنة
  availableHours: number; // ساعات العمل المتاحة
  setupTime: number; // وقت التجهيز (بالساعات)
  maintenanceSchedule: Date[]; // مواعيد الصيانة المخططة
}

// نوع بيانات المنتج لتخطيط السعة
interface CapacityProduct {
  id: string;
  name: string;
  type: 'semi' | 'finished';
  processingTime: number; // وقت المعالجة بالساعات لكل وحدة
  plannedProduction: {
    [month: string]: number; // الشهر: الكمية المخططة
  };
}

// نوع بيانات للخطة الشهرية
interface MonthlyPlan {
  month: string; // YYYY-MM
  products: {
    [productId: string]: number; // معرف المنتج: الكمية المخططة
  };
  totalHours: number;
  requiredCapacity: number;
  capacityUtilization: number;
}

const ProductionCapacityPlanning = () => {
  // البيانات المبدئية لأغراض المحاكاة
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([
    {
      id: '1',
      name: 'خط الإنتاج الرئيسي',
      baseCapacity: 100,
      currentEfficiency: 80,
      maxCapacity: 120,
      availableHours: 8,
      setupTime: 1.5,
      maintenanceSchedule: [addMonths(new Date(), 1), addMonths(new Date(), 3)]
    },
    {
      id: '2',
      name: 'خط إنتاج ثانوي',
      baseCapacity: 60,
      currentEfficiency: 90,
      maxCapacity: 70,
      availableHours: 6,
      setupTime: 1,
      maintenanceSchedule: [addMonths(new Date(), 2)]
    }
  ]);
  
  const [capacityProducts, setCapacityProducts] = useState<CapacityProduct[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>([]);
  const [selectedProductionLine, setSelectedProductionLine] = useState<string>('1');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedView, setSelectedView] = useState<'planning' | 'analytics'>('planning');
  const [showAddProductForm, setShowAddProductForm] = useState<boolean>(false);
  const [showEditLineForm, setShowEditLineForm] = useState<boolean>(false);
  const [lineEfficiency, setLineEfficiency] = useState<number>(80);
  const [newProduct, setNewProduct] = useState<{
    name: string;
    type: 'semi' | 'finished';
    processingTime: number;
    plannedQuantity: number;
  }>({
    name: '',
    type: 'finished',
    processingTime: 0.5,
    plannedQuantity: 0
  });
  
  // للحصول على بيانات المنتجات نصف المصنعة
  const { data: semiFinishedProducts, isLoading: isLoadingSemiFinished } = useQuery({
    queryKey: ['semi-finished-for-capacity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // للحصول على بيانات المنتجات النهائية
  const { data: finishedProducts, isLoading: isLoadingFinished } = useQuery({
    queryKey: ['finished-products-for-capacity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_products')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // تهيئة البيانات الأولية بعد تحميل المنتجات
  React.useEffect(() => {
    if (!isLoadingSemiFinished && !isLoadingFinished && capacityProducts.length === 0) {
      const initialProducts: CapacityProduct[] = [
        ...(semiFinishedProducts || []).slice(0, 3).map(product => ({
          id: `semi-${product.id}`,
          name: product.name,
          type: 'semi' as const,
          processingTime: 0.5 + Math.random() * 0.5, // وقت معالجة عشوائي بين 0.5 و 1 ساعة
          plannedProduction: {
            [selectedMonth]: 20 + Math.floor(Math.random() * 30)
          }
        })),
        ...(finishedProducts || []).slice(0, 3).map(product => ({
          id: `finished-${product.id}`,
          name: product.name,
          type: 'finished' as const,
          processingTime: 1 + Math.random() * 1, // وقت معالجة عشوائي بين 1 و 2 ساعة
          plannedProduction: {
            [selectedMonth]: 10 + Math.floor(Math.random() * 20)
          }
        }))
      ];
      
      setCapacityProducts(initialProducts);
      
      // إنشاء خطة شهرية أولية
      const currentMonthPlan = createMonthlyPlan(initialProducts, selectedMonth, productionLines[0]);
      setMonthlyPlans([currentMonthPlan]);
    }
  }, [isLoadingSemiFinished, isLoadingFinished]);
  
  // إنشاء خطة شهرية
  const createMonthlyPlan = (products: CapacityProduct[], month: string, productionLine: ProductionLine): MonthlyPlan => {
    const productPlans: { [key: string]: number } = {};
    let totalHours = 0;
    
    products.forEach(product => {
      const quantity = product.plannedProduction[month] || 0;
      productPlans[product.id] = quantity;
      totalHours += product.processingTime * quantity;
    });
    
    // إضافة وقت الإعداد
    totalHours += productionLine.setupTime * Object.keys(productPlans).length;
    
    // حساب استخدام السعة
    const availableCapacity = productionLine.availableHours * 30; // ساعات العمل المتاحة في الشهر
    const adjustedAvailableCapacity = availableCapacity * (productionLine.currentEfficiency / 100);
    const capacityUtilization = totalHours / adjustedAvailableCapacity * 100;
    
    return {
      month,
      products: productPlans,
      totalHours,
      requiredCapacity: totalHours / 30, // متوسط الساعات المطلوبة يومياً
      capacityUtilization: capacityUtilization > 100 ? 100 : capacityUtilization
    };
  };
  
  // إضافة منتج جديد للتخطيط
  const addProductToPlanning = () => {
    if (!newProduct.name || newProduct.processingTime <= 0 || newProduct.plannedQuantity < 0) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة بشكل صحيح');
      return;
    }
    
    // إنشاء منتج جديد
    const newProductId = `${newProduct.type}-${Date.now()}`;
    const plannedProduction: { [key: string]: number } = {};
    plannedProduction[selectedMonth] = newProduct.plannedQuantity;
    
    const productToAdd: CapacityProduct = {
      id: newProductId,
      name: newProduct.name,
      type: newProduct.type,
      processingTime: newProduct.processingTime,
      plannedProduction
    };
    
    // إضافة المنتج للقائمة
    setCapacityProducts(prev => [...prev, productToAdd]);
    
    // تحديث الخطة الشهرية
    const selectedLine = productionLines.find(line => line.id === selectedProductionLine) || productionLines[0];
    const updatedMonthlyPlans = [...monthlyPlans];
    const monthPlanIndex = updatedMonthlyPlans.findIndex(plan => plan.month === selectedMonth);
    
    if (monthPlanIndex >= 0) {
      // تحديث الخطة الموجودة
      const updatedProducts = { ...updatedMonthlyPlans[monthPlanIndex].products };
      updatedProducts[newProductId] = newProduct.plannedQuantity;
      
      const updatedMonthPlan = createMonthlyPlan(
        [...capacityProducts, productToAdd],
        selectedMonth,
        selectedLine
      );
      
      updatedMonthlyPlans[monthPlanIndex] = updatedMonthPlan;
    } else {
      // إنشاء خطة جديدة
      const newMonthPlan = createMonthlyPlan(
        [...capacityProducts, productToAdd],
        selectedMonth,
        selectedLine
      );
      
      updatedMonthlyPlans.push(newMonthPlan);
    }
    
    setMonthlyPlans(updatedMonthlyPlans);
    
    // إعادة تعيين النموذج
    setNewProduct({
      name: '',
      type: 'finished',
      processingTime: 0.5,
      plannedQuantity: 0
    });
    
    setShowAddProductForm(false);
    toast.success('تمت إضافة المنتج للتخطيط');
  };
  
  // تحديث كمية الإنتاج المخططة
  const updatePlannedQuantity = (productId: string, newQuantity: number) => {
    // تحديث المنتج
    const updatedProducts = capacityProducts.map(product => {
      if (product.id !== productId) return product;
      
      const updatedPlannedProduction = { ...product.plannedProduction };
      updatedPlannedProduction[selectedMonth] = newQuantity;
      
      return {
        ...product,
        plannedProduction: updatedPlannedProduction
      };
    });
    
    setCapacityProducts(updatedProducts);
    
    // تحديث الخطة الشهرية
    const selectedLine = productionLines.find(line => line.id === selectedProductionLine) || productionLines[0];
    const updatedMonthlyPlans = [...monthlyPlans];
    const monthPlanIndex = updatedMonthlyPlans.findIndex(plan => plan.month === selectedMonth);
    
    if (monthPlanIndex >= 0) {
      const updatedMonthPlan = createMonthlyPlan(
        updatedProducts,
        selectedMonth,
        selectedLine
      );
      
      updatedMonthlyPlans[monthPlanIndex] = updatedMonthPlan;
      setMonthlyPlans(updatedMonthlyPlans);
    }
  };
  
  // حذف منتج من التخطيط
  const removeProductFromPlanning = (productId: string) => {
    // حذف المنتج
    const updatedProducts = capacityProducts.filter(product => product.id !== productId);
    setCapacityProducts(updatedProducts);
    
    // تحديث الخطة الشهرية
    const selectedLine = productionLines.find(line => line.id === selectedProductionLine) || productionLines[0];
    const updatedMonthlyPlans = [...monthlyPlans];
    const monthPlanIndex = updatedMonthlyPlans.findIndex(plan => plan.month === selectedMonth);
    
    if (monthPlanIndex >= 0) {
      const updatedMonthPlan = createMonthlyPlan(
        updatedProducts,
        selectedMonth,
        selectedLine
      );
      
      updatedMonthlyPlans[monthPlanIndex] = updatedMonthPlan;
      setMonthlyPlans(updatedMonthlyPlans);
    }
    
    toast.success('تم حذف المنتج من التخطيط');
  };
  
  // تحديث كفاءة خط الإنتاج
  const updateLineEfficiency = () => {
    const updatedLines = productionLines.map(line => {
      if (line.id !== selectedProductionLine) return line;
      
      return {
        ...line,
        currentEfficiency: lineEfficiency
      };
    });
    
    setProductionLines(updatedLines);
    
    // تحديث الخطة الشهرية
    const selectedLine = updatedLines.find(line => line.id === selectedProductionLine) || updatedLines[0];
    const updatedMonthlyPlans = [...monthlyPlans];
    const monthPlanIndex = updatedMonthlyPlans.findIndex(plan => plan.month === selectedMonth);
    
    if (monthPlanIndex >= 0) {
      const updatedMonthPlan = createMonthlyPlan(
        capacityProducts,
        selectedMonth,
        selectedLine
      );
      
      updatedMonthlyPlans[monthPlanIndex] = updatedMonthPlan;
      setMonthlyPlans(updatedMonthlyPlans);
    }
    
    setShowEditLineForm(false);
    toast.success('تم تحديث كفاءة خط الإنتاج');
  };
  
  // الحصول على بيانات تحليل السعة
  const getCapacityAnalysisData = () => {
    // إنشاء بيانات للأشهر الستة القادمة
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 6; i++) {
      const month = addMonths(currentDate, i);
      months.push(format(month, 'yyyy-MM'));
    }
    
    // حساب الاستخدام المتوقع لكل شهر
    const selectedLine = productionLines.find(line => line.id === selectedProductionLine) || productionLines[0];
    const monthlyData = months.map(month => {
      let requiredHours = 0;
      
      capacityProducts.forEach(product => {
        const quantity = product.plannedProduction[month] || 0;
        requiredHours += product.processingTime * quantity;
      });
      
      // إضافة وقت الإعداد
      const productsWithPlannedProduction = capacityProducts.filter(
        product => (product.plannedProduction[month] || 0) > 0
      );
      requiredHours += selectedLine.setupTime * productsWithPlannedProduction.length;
      
      // حساب السعة المتاحة
      const availableHours = selectedLine.availableHours * 30;
      const adjustedAvailableHours = availableHours * (selectedLine.currentEfficiency / 100);
      
      return {
        month: month,
        monthName: format(new Date(month + '-01'), 'MMM yyyy'),
        requiredHours,
        availableHours: adjustedAvailableHours,
        utilizationRate: (requiredHours / adjustedAvailableHours) * 100
      };
    });
    
    return monthlyData;
  };
  
  // الحصول على بيانات توزيع الإنتاج حسب المنتج
  const getProductDistributionData = () => {
    if (!selectedMonth) return [];
    
    const productData = capacityProducts.map(product => {
      const quantity = product.plannedProduction[selectedMonth] || 0;
      const hours = product.processingTime * quantity;
      
      return {
        name: product.name,
        type: product.type === 'semi' ? 'نصف مصنع' : 'منتج نهائي',
        quantity,
        hours,
        processingTime: product.processingTime
      };
    }).filter(data => data.quantity > 0);
    
    return productData;
  };
  
  // حفظ الخطة
  const savePlan = () => {
    toast.success('تم حفظ خطة الإنتاج');
  };
  
  // إعادة تعيين الخطة
  const resetPlan = () => {
    const confirmReset = window.confirm('هل أنت متأكد من إعادة تعيين الخطة؟ سيتم حذف جميع التغييرات.');
    
    if (confirmReset) {
      // إعادة تعيين التخطيط للشهر الحالي
      const selectedLine = productionLines.find(line => line.id === selectedProductionLine) || productionLines[0];
      const updatedCapacityProducts = capacityProducts.map(product => {
        const updatedPlannedProduction = { ...product.plannedProduction };
        updatedPlannedProduction[selectedMonth] = 0;
        
        return {
          ...product,
          plannedProduction: updatedPlannedProduction
        };
      });
      
      setCapacityProducts(updatedCapacityProducts);
      
      // تحديث الخطة الشهرية
      const updatedMonthlyPlans = [...monthlyPlans];
      const monthPlanIndex = updatedMonthlyPlans.findIndex(plan => plan.month === selectedMonth);
      
      if (monthPlanIndex >= 0) {
        const updatedMonthPlan = createMonthlyPlan(
          updatedCapacityProducts,
          selectedMonth,
          selectedLine
        );
        
        updatedMonthlyPlans[monthPlanIndex] = updatedMonthPlan;
        setMonthlyPlans(updatedMonthlyPlans);
      }
      
      toast.success('تم إعادة تعيين خطة الإنتاج');
    }
  };
  
  // اللوحة الرئيسية لتخطيط سعة الإنتاج
  return (
    <div className="space-y-6">
      {/* أدوات التخطيط والتحليل */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="productionLine">خط الإنتاج</Label>
              <Select value={selectedProductionLine} onValueChange={setSelectedProductionLine}>
                <SelectTrigger id="productionLine">
                  <SelectValue placeholder="اختر خط الإنتاج" />
                </SelectTrigger>
                <SelectContent>
                  {productionLines.map(line => (
                    <SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>الشهر</Label>
              <div className="grid grid-cols-4 gap-1">
                <Button
                  variant={selectedMonth === format(new Date(), 'yyyy-MM') ? "default" : "outline"}
                  className="col-span-1"
                  onClick={() => setSelectedMonth(format(new Date(), 'yyyy-MM'))}
                >
                  الحالي
                </Button>
                <Button
                  variant={selectedMonth === format(addMonths(new Date(), 1), 'yyyy-MM') ? "default" : "outline"}
                  className="col-span-1"
                  onClick={() => setSelectedMonth(format(addMonths(new Date(), 1), 'yyyy-MM'))}
                >
                  +1
                </Button>
                <Button
                  variant={selectedMonth === format(addMonths(new Date(), 2), 'yyyy-MM') ? "default" : "outline"}
                  className="col-span-1"
                  onClick={() => setSelectedMonth(format(addMonths(new Date(), 2), 'yyyy-MM'))}
                >
                  +2
                </Button>
                <Button
                  variant={selectedMonth === format(addMonths(new Date(), 3), 'yyyy-MM') ? "default" : "outline"}
                  className="col-span-1"
                  onClick={() => setSelectedMonth(format(addMonths(new Date(), 3), 'yyyy-MM'))}
                >
                  +3
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>نوع العرض</Label>
              <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)} className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="planning" className="flex items-center gap-2">
                    <Target size={16} />
                    <span>التخطيط</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-2">
                    <LineChart size={16} />
                    <span>التحليلات</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* عرض التخطيط أو التحليل حسب الاختيار */}
      <TabsContent value="planning" className="mt-0 space-y-6" forceMount={selectedView === 'planning'} hidden={selectedView !== 'planning'}>
        {/* إحصائيات التخطيط */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 pb-2">
              <div className="text-center">
                <Factory className="h-8 w-8 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-medium mt-2">طاقة خط الإنتاج</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-muted-foreground text-sm">الكفاءة:</span>
                  <Badge variant="outline" className="ml-2">
                    {productionLines.find(line => line.id === selectedProductionLine)?.currentEfficiency || 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground text-sm">الساعات اليومية:</span>
                  <Badge variant="outline" className="ml-2">
                    {productionLines.find(line => line.id === selectedProductionLine)?.availableHours || 0} ساعة
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => {
                    const selectedLineData = productionLines.find(line => line.id === selectedProductionLine);
                    if (selectedLineData) {
                      setLineEfficiency(selectedLineData.currentEfficiency);
                      setShowEditLineForm(true);
                    }
                  }}
                >
                  تعديل الكفاءة
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 pb-2">
              <div className="text-center">
                <SquareStack className="h-8 w-8 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-medium mt-2">الخطة الشهرية</h3>
                <p className="text-2xl font-bold mt-1">
                  {(monthlyPlans.find(plan => plan.month === selectedMonth)?.products && 
                   Object.values(monthlyPlans.find(plan => plan.month === selectedMonth)?.products || {}).reduce((a, b) => a + b, 0)) || 0} وحدة
                </p>
                <p className="text-muted-foreground text-sm">
                  {selectedMonth ? format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: ar }) : ''}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 pb-2">
              <div className="text-center">
                <BadgePercent className="h-8 w-8 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-medium mt-2">استغلال السعة</h3>
                
                <div className="relative h-8 w-full bg-muted rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`absolute top-0 left-0 h-full ${
                      (monthlyPlans.find(plan => plan.month === selectedMonth)?.capacityUtilization || 0) > 90
                        ? 'bg-red-500'
                        : (monthlyPlans.find(plan => plan.month === selectedMonth)?.capacityUtilization || 0) > 70
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, monthlyPlans.find(plan => plan.month === selectedMonth)?.capacityUtilization || 0)}%` }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center font-medium text-white z-10">
                    {(monthlyPlans.find(plan => plan.month === selectedMonth)?.capacityUtilization || 0).toFixed(1)}%
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* أدوات تعديل الخطة */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">خطة الإنتاج - {selectedMonth ? format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: ar }) : ''}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetPlan}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  إعادة تعيين
                </Button>
                <Button variant="outline" onClick={() => setShowAddProductForm(!showAddProductForm)}>
                  {showAddProductForm ? 'إلغاء' : 'إضافة منتج'}
                </Button>
                <Button onClick={savePlan}>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ الخطة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showAddProductForm && (
              <div className="mb-6 border rounded-md p-4">
                <h3 className="font-medium mb-4">إضافة منتج للخطة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productSelect">المنتج</Label>
                    <Select value={newProduct.name} onValueChange={(value) => setNewProduct({ ...newProduct, name: value })}>
                      <SelectTrigger id="productSelect">
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="جديد">إضافة منتج جديد</SelectItem>
                        {semiFinishedProducts?.map(product => (
                          <SelectItem key={`semi-${product.id}`} value={product.name}>
                            {product.name} (نصف مصنع)
                          </SelectItem>
                        ))}
                        {finishedProducts?.map(product => (
                          <SelectItem key={`finished-${product.id}`} value={product.name}>
                            {product.name} (منتج نهائي)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="productType">نوع المنتج</Label>
                    <Select value={newProduct.type} onValueChange={(value) => setNewProduct({ ...newProduct, type: value as any })}>
                      <SelectTrigger id="productType">
                        <SelectValue placeholder="اختر نوع المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semi">نصف مصنع</SelectItem>
                        <SelectItem value="finished">منتج نهائي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="processingTime">وقت المعالجة (ساعة/وحدة)</Label>
                    <Input
                      id="processingTime"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={newProduct.processingTime}
                      onChange={(e) => setNewProduct({ ...newProduct, processingTime: Number(e.target.value) })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="plannedQuantity">الكمية المخططة</Label>
                    <Input
                      id="plannedQuantity"
                      type="number"
                      min="0"
                      value={newProduct.plannedQuantity}
                      onChange={(e) => setNewProduct({ ...newProduct, plannedQuantity: Number(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button onClick={addProductToPlanning}>إضافة للخطة</Button>
                </div>
              </div>
            )}
            
            {showEditLineForm && (
              <div className="mb-6 border rounded-md p-4">
                <h3 className="font-medium mb-4">تعديل كفاءة خط الإنتاج</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="lineEfficiency">كفاءة خط الإنتاج ({lineEfficiency}%)</Label>
                      <span className="text-sm text-muted-foreground">
                        متوسط الكفاءة: 80%
                      </span>
                    </div>
                    <Slider
                      id="lineEfficiency"
                      value={[lineEfficiency]}
                      min={50}
                      max={100}
                      step={5}
                      onValueChange={(value) => setLineEfficiency(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" className="mr-2" onClick={() => setShowEditLineForm(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={updateLineEfficiency}>تحديث الكفاءة</Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* جدول الخطة */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>وقت المعالجة</TableHead>
                    <TableHead>الكمية المخططة</TableHead>
                    <TableHead>إجمالي الساعات</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capacityProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        لا توجد منتجات في الخطة. قم بإضافة منتجات للخطة.
                      </TableCell>
                    </TableRow>
                  ) : (
                    capacityProducts.map(product => {
                      const plannedQuantity = product.plannedProduction[selectedMonth] || 0;
                      const totalHours = product.processingTime * plannedQuantity;
                      
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                          </TableCell>
                          <TableCell>
                            {product.type === 'semi' ? 'نصف مصنع' : 'منتج نهائي'}
                          </TableCell>
                          <TableCell>
                            {product.processingTime} ساعة/وحدة
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={plannedQuantity}
                              onChange={(e) => updatePlannedQuantity(product.id, Number(e.target.value))}
                              className="w-24 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {totalHours.toFixed(1)} ساعة
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => removeProductFromPlanning(product.id)}>
                              حذف
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            {capacityProducts.length > 0 && (
              <div className="flex justify-between items-center mt-4 p-3 bg-muted rounded-md">
                <div>
                  <span className="font-medium">إجمالي الساعات المطلوبة:</span>
                  <span className="mr-2">
                    {(monthlyPlans.find(plan => plan.month === selectedMonth)?.totalHours || 0).toFixed(1)} ساعة
                  </span>
                </div>
                <div>
                  <span className="font-medium">الساعات المطلوبة يومياً:</span>
                  <span className="mr-2">
                    {(monthlyPlans.find(plan => plan.month === selectedMonth)?.requiredCapacity || 0).toFixed(1)} ساعة
                  </span>
                </div>
                <div>
                  <span className="font-medium">استغلال السعة:</span>
                  <Badge variant={
                    (monthlyPlans.find(plan => plan.month === selectedMonth)?.capacityUtilization || 0) > 90
                      ? "destructive"
                      : (monthlyPlans.find(plan => plan.month === selectedMonth)?.capacityUtilization || 0) > 70
                        ? "secondary"
                        : "success"
                  } className="mr-1">
                    {(monthlyPlans.find(plan => plan.month === selectedMonth)?.capacityUtilization || 0).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="analytics" className="mt-0 space-y-6" forceMount={selectedView === 'analytics'} hidden={selectedView !== 'analytics'}>
        {/* رسومات تحليلية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تحليل السعة على مدار الأشهر</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getCapacityAnalysisData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthName" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`${value.toFixed(1)} ساعة`, '']}
                    />
                    <Legend />
                    <Bar dataKey="requiredHours" name="الساعات المطلوبة" fill="#4338ca" />
                    <Bar dataKey="availableHours" name="الساعات المتاحة" fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">
                  يوضح الرسم البياني معدل استغلال السعة على مدار الأشهر الستة القادمة، مقارنة الساعات المطلوبة بالساعات المتاحة.
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">توزيع الإنتاج حسب المنتج</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getProductDistributionData()}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => {
                        const entry = props.payload;
                        return [
                          name === 'hours' ? `${value.toFixed(1)} ساعة` : `${value} وحدة`,
                          name === 'hours' ? 'إجمالي الساعات' : 'الكمية المخططة'
                        ];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="hours" name="الساعات" fill="#6366F1" />
                    <Bar dataKey="quantity" name="الكمية" fill="#F97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">
                  يوضح الرسم البياني توزيع الإنتاج للشهر المحدد حسب المنتج، موضحاً الكمية المخططة وإجمالي الساعات المطلوبة لكل منتج.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* جدول تحليل السعة */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تحليل السعة للأشهر القادمة</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الشهر</TableHead>
                      <TableHead>الساعات المطلوبة</TableHead>
                      <TableHead>الساعات المتاحة</TableHead>
                      <TableHead>نسبة الاستغلال</TableHead>
                      <TableHead>حالة السعة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getCapacityAnalysisData().map(data => (
                      <TableRow key={data.month}>
                        <TableCell>
                          <div className="font-medium">{data.monthName}</div>
                        </TableCell>
                        <TableCell>
                          {data.requiredHours.toFixed(1)} ساعة
                        </TableCell>
                        <TableCell>
                          {data.availableHours.toFixed(1)} ساعة
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            data.utilizationRate > 90
                              ? "destructive"
                              : data.utilizationRate > 70
                                ? "secondary"
                                : "success"
                          }>
                            {data.utilizationRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {data.utilizationRate > 100 ? (
                            <Badge variant="destructive">تجاوز السعة</Badge>
                          ) : data.utilizationRate > 90 ? (
                            <Badge variant="secondary">اقتراب من الحد الأقصى</Badge>
                          ) : data.utilizationRate > 70 ? (
                            <Badge variant="outline">استغلال جيد</Badge>
                          ) : (
                            <Badge variant="success">سعة متاحة</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
            
            <div className="mt-6">
              <h3 className="font-medium mb-3">توصيات لتحسين استغلال السعة</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                {getCapacityAnalysisData().some(data => data.utilizationRate > 100) && (
                  <li>
                    هناك شهور تتجاوز فيها الخطة السعة المتاحة. يمكن النظر في إعادة توزيع الإنتاج أو زيادة ساعات العمل.
                  </li>
                )}
                {getCapacityAnalysisData().some(data => data.utilizationRate < 60) && (
                  <li>
                    هناك شهور ذات استغلال منخفض للسعة. يمكن استغلال ذلك في زيادة الإنتاج أو جدولة أعمال الصيانة.
                  </li>
                )}
                <li>
                  متوسط استغلال السعة: {
                    (getCapacityAnalysisData().reduce((acc, curr) => acc + curr.utilizationRate, 0) / getCapacityAnalysisData().length).toFixed(1)
                  }%
                </li>
                <li>
                  يمكن تحسين التخطيط من خلال توزيع الإنتاج بشكل أكثر توازناً بين الأشهر لتجنب فترات الذروة والانخفاض.
                </li>
                <li>
                  مراقبة كفاءة خط الإنتاج وإجراء الصيانة الدورية لضمان استمرار العمل بكفاءة عالية.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
};

export default ProductionCapacityPlanning;
