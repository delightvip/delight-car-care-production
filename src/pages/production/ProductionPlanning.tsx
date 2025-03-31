
import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, CalendarRange, Factory, Package, RotateCw, AlertTriangle, CheckCircle2, Truck 
} from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProductionService from '@/services/ProductionService';
import InventoryService from '@/services/InventoryService';

// Define types for raw materials
interface RawMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
}

// Define types for semi-finished products
interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  ingredients: {
    code: string;
    name: string;
    percentage: number;
  }[];
}

// Define types for finished products
interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  semiFinished: {
    code: string;
    name: string;
    quantity: number;
  };
  packaging: {
    code: string;
    name: string;
    quantity: number;
  }[];
}

// Define types for packaging materials
interface PackagingMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
}

// Define types for simulation results
interface ProductionCapacityResult {
  type: 'production';
  semiFinished: SemiFinishedProduct;
  materials: {
    code: string;
    name: string;
    availableQuantity: number;
    requiredPercentage: number;
    maxProduction: number;
    isLimiting: boolean;
  }[];
  maxPossibleProduction: number;
  daysOfProduction: number;
}

interface RawMaterialsDepletionResult {
  type: 'raw-materials';
  simulationData: any[];
  daysUntilDepletion: number;
  reorderRequired: boolean;
  material: RawMaterial;
}

interface PackagingCapacityResult {
  type: 'packaging';
  product: FinishedProduct;
  semiFinishedAvailable: number;
  maxProductionFromSemi: number;
  packagingLimits: {
    code: string;
    name: string;
    availableQuantity: number;
    requiredQuantity: number;
    maxProduction: number;
    isLimiting: boolean;
  }[];
  maxPossibleProduction: number;
  daysOfProduction: number;
  limitingFactor: 'semiFinished' | 'packaging';
}

interface PackagingMaterialUsageResult {
  type: 'packaging-materials';
  material: PackagingMaterial;
  productStats: {
    productCode: string;
    productName: string;
    requiredQuantity: number;
    maxProduction: number;
  }[];
  simulationData: any[];
  daysUntilDepletion: number;
  reorderRequired: boolean;
}

type SimulationResult = 
  | ProductionCapacityResult
  | RawMaterialsDepletionResult
  | PackagingCapacityResult
  | PackagingMaterialUsageResult
  | null;

// Type guards to check which type of simulation result we have
const isProductionCapacityResult = (result: SimulationResult): result is ProductionCapacityResult => 
  result !== null && result.type === 'production';

const isRawMaterialsDepletionResult = (result: SimulationResult): result is RawMaterialsDepletionResult => 
  result !== null && result.type === 'raw-materials';

const isPackagingCapacityResult = (result: SimulationResult): result is PackagingCapacityResult => 
  result !== null && result.type === 'packaging';

const isPackagingMaterialUsageResult = (result: SimulationResult): result is PackagingMaterialUsageResult => 
  result !== null && result.type === 'packaging-materials';

const ProductionPlanning = () => {
  const [simulationPeriod, setSimulationPeriod] = useState<number>(30); // days
  const [simulationScenario, setSimulationScenario] = useState<string>("moderate");
  const [selectedTab, setSelectedTab] = useState<string>("production");
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<string>("");
  const [selectedSemiFinished, setSelectedSemiFinished] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedPackagingMaterial, setSelectedPackagingMaterial] = useState<string>("");
  const [dailyProductionRate, setDailyProductionRate] = useState<number>(10);
  
  const productionService = ProductionService.getInstance();
  const inventoryService = InventoryService.getInstance();
  
  // Fetch raw materials
  const { data: rawMaterials = [], isLoading: isRawMaterialsLoading } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: async () => {
      try {
        return await inventoryService.getRawMaterials();
      } catch (error) {
        console.error("Error loading raw materials:", error);
        toast.error("حدث خطأ أثناء تحميل المواد الخام");
        return [];
      }
    }
  });
  
  // Fetch semi-finished products
  const { data: semiFinishedProducts = [], isLoading: isSemiFinishedLoading } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      try {
        return await inventoryService.getSemiFinishedProducts();
      } catch (error) {
        console.error("Error loading semi-finished products:", error);
        toast.error("حدث خطأ أثناء تحميل المنتجات نصف المصنعة");
        return [];
      }
    }
  });
  
  // Fetch finished products
  const { data: finishedProducts = [], isLoading: isFinishedProductsLoading } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: async () => {
      try {
        return await inventoryService.getFinishedProducts();
      } catch (error) {
        console.error("Error loading finished products:", error);
        toast.error("حدث خطأ أثناء تحميل المنتجات النهائية");
        return [];
      }
    }
  });
  
  // Fetch packaging materials
  const { data: packagingMaterials = [], isLoading: isPackagingMaterialsLoading } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: async () => {
      try {
        return await inventoryService.getPackagingMaterials();
      } catch (error) {
        console.error("Error loading packaging materials:", error);
        toast.error("حدث خطأ أثناء تحميل مواد التعبئة");
        return [];
      }
    }
  });
  
  const isLoading = isRawMaterialsLoading || isSemiFinishedLoading || isFinishedProductsLoading || isPackagingMaterialsLoading;
  
  // Run simulation for raw materials depletion
  const simulateRawMaterialsDepletion = useCallback(() => {
    if (!selectedRawMaterial || !rawMaterials.length) return null;
    
    const material = rawMaterials.find(m => m.code === selectedRawMaterial);
    if (!material) return null;
    
    // Calculate daily usage based on scenario
    let dailyUsage = 0;
    
    switch (simulationScenario) {
      case "conservative":
        dailyUsage = dailyProductionRate * 0.8;
        break;
      case "moderate":
        dailyUsage = dailyProductionRate;
        break;
      case "aggressive":
        dailyUsage = dailyProductionRate * 1.2;
        break;
      default:
        dailyUsage = dailyProductionRate;
    }
    
    // Calculate depletion
    const daysUntilDepletion = Math.floor(material.quantity / dailyUsage);
    const simulationData = [];
    
    let remainingQuantity = material.quantity;
    
    for (let day = 0; day <= Math.min(simulationPeriod, daysUntilDepletion); day++) {
      simulationData.push({
        day,
        quantity: remainingQuantity,
        threshold: material.min_stock
      });
      remainingQuantity -= dailyUsage;
      if (remainingQuantity < 0) remainingQuantity = 0;
    }
    
    // If depletion doesn't happen within the period, extend to full period
    if (daysUntilDepletion > simulationPeriod) {
      for (let day = simulationData.length; day <= simulationPeriod; day++) {
        simulationData.push({
          day,
          quantity: material.quantity - (day * dailyUsage),
          threshold: material.min_stock
        });
      }
    }
    
    return {
      type: 'raw-materials' as const,
      simulationData,
      daysUntilDepletion,
      reorderRequired: daysUntilDepletion <= simulationPeriod,
      material
    };
  }, [selectedRawMaterial, rawMaterials, simulationScenario, simulationPeriod, dailyProductionRate]);
  
  // Simulate production capacity based on available materials
  const simulateProductionCapacity = useCallback(() => {
    if (!selectedSemiFinished || !semiFinishedProducts.length) return null;
    
    const semiFinished = semiFinishedProducts.find(p => p.code === selectedSemiFinished);
    if (!semiFinished) return null;
    
    const requiredMaterials = semiFinished.ingredients.map(ingredient => {
      const material = rawMaterials.find(m => m.code === ingredient.code);
      if (!material) return null;
      
      const maxProduction = Math.floor(material.quantity / (ingredient.percentage / 100));
      
      return {
        code: material.code,
        name: material.name,
        availableQuantity: material.quantity,
        requiredPercentage: ingredient.percentage,
        maxProduction,
        isLimiting: false // Will be set later
      };
    }).filter(Boolean);
    
    // Find the limiting factor (material that allows least production)
    const limitingMaterial = [...requiredMaterials].sort((a, b) => a.maxProduction - b.maxProduction)[0];
    
    if (limitingMaterial) {
      // Mark the limiting material
      const updatedMaterials = requiredMaterials.map(m => ({
        ...m,
        isLimiting: m.code === limitingMaterial.code
      }));
      
      // Calculate production capacity
      const maxPossibleProduction = limitingMaterial.maxProduction;
      
      return {
        type: 'production' as const,
        semiFinished,
        materials: updatedMaterials,
        maxPossibleProduction,
        daysOfProduction: Math.floor(maxPossibleProduction / dailyProductionRate)
      };
    }
    
    return null;
  }, [selectedSemiFinished, semiFinishedProducts, rawMaterials, dailyProductionRate]);
  
  // Simulate packaging capacity
  const simulatePackagingCapacity = useCallback(() => {
    if (!selectedProduct || !finishedProducts.length) return null;
    
    const product = finishedProducts.find(p => p.code === selectedProduct);
    if (!product) return null;
    
    // Check semi-finished availability
    const semiFinished = semiFinishedProducts.find(p => p.code === product.semiFinished.code);
    const semiFinishedAvailable = semiFinished ? semiFinished.quantity : 0;
    const maxProductionFromSemi = Math.floor(semiFinishedAvailable / product.semiFinished.quantity);
    
    // Check packaging materials availability
    const packagingLimits = product.packaging.map(pkg => {
      const material = packagingMaterials.find(m => m.code === pkg.code);
      if (!material) return null;
      
      const maxProduction = Math.floor(material.quantity / pkg.quantity);
      
      return {
        code: material.code,
        name: material.name,
        availableQuantity: material.quantity,
        requiredQuantity: pkg.quantity,
        maxProduction,
        isLimiting: false
      };
    }).filter(Boolean);
    
    // Find limiting packaging material
    let limitingPackaging = [...packagingLimits].sort((a, b) => a.maxProduction - b.maxProduction)[0];
    
    let maxPossibleProduction = maxProductionFromSemi;
    let limitingFactor = "semiFinished" as const;
    
    if (limitingPackaging && limitingPackaging.maxProduction < maxProductionFromSemi) {
      maxPossibleProduction = limitingPackaging.maxProduction;
      limitingFactor = "packaging" as const;
      
      // Mark the limiting packaging material
      packagingLimits.forEach(p => {
        if (p.code === limitingPackaging.code) {
          p.isLimiting = true;
        }
      });
    }
    
    return {
      type: 'packaging' as const,
      product,
      semiFinishedAvailable,
      maxProductionFromSemi,
      packagingLimits,
      maxPossibleProduction,
      daysOfProduction: Math.floor(maxPossibleProduction / dailyProductionRate),
      limitingFactor
    };
  }, [selectedProduct, finishedProducts, semiFinishedProducts, packagingMaterials, dailyProductionRate]);
  
  // Simulate packaging material usage
  const simulatePackagingMaterialUsage = useCallback(() => {
    if (!selectedPackagingMaterial || !packagingMaterials.length) return null;
    
    const material = packagingMaterials.find(m => m.code === selectedPackagingMaterial);
    if (!material) return null;
    
    // Find products that use this packaging material
    const productsUsingMaterial = finishedProducts.filter(
      product => product.packaging.some(pkg => pkg.code === selectedPackagingMaterial)
    );
    
    // Calculate statistics for each product
    const productStats = productsUsingMaterial.map(product => {
      const packagingItem = product.packaging.find(pkg => pkg.code === selectedPackagingMaterial);
      if (!packagingItem) return null;
      
      const maxProduction = Math.floor(material.quantity / packagingItem.quantity);
      
      return {
        productCode: product.code,
        productName: product.name,
        requiredQuantity: packagingItem.quantity,
        maxProduction
      };
    }).filter(Boolean);
    
    // Calculate usage trend
    let remainingQuantity = material.quantity;
    const simulationData = [];
    
    // Daily usage scenarios
    const dailyUsage = (() => {
      switch (simulationScenario) {
        case "conservative": return material.quantity * 0.01;
        case "moderate": return material.quantity * 0.03;  
        case "aggressive": return material.quantity * 0.05;
        default: return material.quantity * 0.03;
      }
    })();
    
    for (let day = 0; day <= simulationPeriod; day++) {
      simulationData.push({
        day,
        quantity: Math.max(0, remainingQuantity),
        threshold: material.min_stock
      });
      remainingQuantity -= dailyUsage;
    }
    
    const daysUntilDepletion = Math.floor(material.quantity / dailyUsage);
    
    return {
      type: 'packaging-materials' as const,
      material,
      productStats,
      simulationData,
      daysUntilDepletion,
      reorderRequired: daysUntilDepletion <= simulationPeriod
    };
  }, [selectedPackagingMaterial, packagingMaterials, finishedProducts, simulationScenario, simulationPeriod]);
  
  // Calculate results based on selected tab
  const simulationResult: SimulationResult = (() => {
    switch (selectedTab) {
      case "production":
        return simulateProductionCapacity();
      case "raw-materials":
        return simulateRawMaterialsDepletion();
      case "packaging":
        return simulatePackagingCapacity();
      case "packaging-materials":
        return simulatePackagingMaterialUsage();
      default:
        return null;
    }
  })();

  return (
    <PageTransition>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col items-start pb-6 mb-6 border-b">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
            تخطيط الإنتاج
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            التخطيط المستقبلي للإنتاج وجدولته ومحاكاة سيناريوهات مختلفة
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Simulation Parameters Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>معلمات المحاكاة</CardTitle>
                <CardDescription>حدد معايير تخطيط الإنتاج</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="simulation-period">فترة المحاكاة (بالأيام)</Label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Slider
                      id="simulation-period"
                      min={7}
                      max={90}
                      step={1}
                      value={[simulationPeriod]}
                      onValueChange={(value) => setSimulationPeriod(value[0])}
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{simulationPeriod}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="production-rate">معدل الإنتاج اليومي</Label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Slider
                      id="production-rate"
                      min={1}
                      max={100}
                      step={1}
                      value={[dailyProductionRate]}
                      onValueChange={(value) => setDailyProductionRate(value[0])}
                      className="flex-1"
                    />
                    <span className="w-12 text-center">{dailyProductionRate}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>سيناريو الاستخدام</Label>
                  <RadioGroup 
                    value={simulationScenario} 
                    onValueChange={setSimulationScenario}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="conservative" id="conservative" />
                      <Label htmlFor="conservative">محافظ (80%)</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="moderate" id="moderate" />
                      <Label htmlFor="moderate">معتدل (100%)</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="aggressive" id="aggressive" />
                      <Label htmlFor="aggressive">مكثف (120%)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Simulation Content */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <Tabs defaultValue="production" className="w-full" value={selectedTab} onValueChange={setSelectedTab}>
                <CardHeader className="pb-0">
                  <TabsList className="w-full mb-4 grid grid-cols-1 md:grid-cols-4">
                    <TabsTrigger value="production" className="flex gap-2 items-center">
                      <Factory className="h-4 w-4" />
                      <span>قدرة الإنتاج</span>
                    </TabsTrigger>
                    <TabsTrigger value="raw-materials" className="flex gap-2 items-center">
                      <Package className="h-4 w-4" />
                      <span>استنفاد المواد الخام</span>
                    </TabsTrigger>
                    <TabsTrigger value="packaging" className="flex gap-2 items-center">
                      <Package className="h-4 w-4" />
                      <span>قدرة التعبئة</span>
                    </TabsTrigger>
                    <TabsTrigger value="packaging-materials" className="flex gap-2 items-center">
                      <Package className="h-4 w-4" />
                      <span>مواد التعبئة</span>
                    </TabsTrigger>
                  </TabsList>
                  <CardDescription>
                    تحليل تخطيط الإنتاج بناءً على المخزون المتاح والاستهلاك المتوقع
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="text-center">
                        <div className="flex justify-center mb-4">
                          <RotateCw className="h-6 w-6 animate-spin text-primary" />
                        </div>
                        <p>جاري تحميل البيانات...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Production Capacity Tab */}
                      <TabsContent value="production" className="mt-0">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="semi-finished">اختر المنتج نصف المصنع</Label>
                            <Select 
                              value={selectedSemiFinished} 
                              onValueChange={setSelectedSemiFinished}
                            >
                              <SelectTrigger id="semi-finished">
                                <SelectValue placeholder="اختر المنتج" />
                              </SelectTrigger>
                              <SelectContent>
                                {semiFinishedProducts.map(product => (
                                  <SelectItem key={product.code} value={product.code}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Production Capacity Results */}
                          {selectedSemiFinished && isProductionCapacityResult(simulationResult) && (
                            <div className="mt-6 space-y-6">
                              <Card className="bg-muted/40">
                                <CardContent className="pt-6">
                                  <div className="space-y-4">
                                    <h3 className="text-xl font-semibold">قدرة الإنتاج المتاحة</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="p-4 bg-card rounded-lg border">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">الكمية القصوى الممكن إنتاجها</p>
                                        <p className="text-2xl font-bold">{simulationResult.maxPossibleProduction.toFixed(1)} {simulationResult.semiFinished.unit}</p>
                                      </div>
                                      <div className="p-4 bg-card rounded-lg border">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">أيام الإنتاج المتاحة</p>
                                        <p className="text-2xl font-bold">{simulationResult.daysOfProduction} يوم</p>
                                      </div>
                                    </div>
                                    
                                    <h4 className="font-medium mt-4">المواد المطلوبة</h4>
                                    <div className="space-y-2">
                                      {simulationResult.materials.map((material, index) => (
                                        <div 
                                          key={material.code}
                                          className={`p-3 flex flex-col border rounded-md ${material.isLimiting ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : ''}`}
                                        >
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <p className="font-medium">{material.name}</p>
                                              <p className="text-sm text-muted-foreground">
                                                النسبة المطلوبة: {material.requiredPercentage}%
                                              </p>
                                            </div>
                                            {material.isLimiting && (
                                              <Badge className="bg-amber-500 hover:bg-amber-500">العامل المحدد</Badge>
                                            )}
                                          </div>
                                          <div className="mt-2 space-y-1">
                                            <div className="flex justify-between text-sm">
                                              <span>الكمية المتاحة:</span>
                                              <span className="font-medium">{material.availableQuantity.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                              <span>الحد الأقصى للإنتاج:</span>
                                              <span className={`font-medium ${material.isLimiting ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                                {material.maxProduction.toFixed(1)} {simulationResult.semiFinished.unit}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                          
                          {!selectedSemiFinished && (
                            <div className="text-center py-12">
                              <p className="text-muted-foreground">اختر منتجًا نصف مصنع لعرض تحليل قدرة الإنتاج</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Raw Materials Tab */}
                      <TabsContent value="raw-materials" className="mt-0">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="raw-material">اختر المادة الخام</Label>
                            <Select 
                              value={selectedRawMaterial} 
                              onValueChange={setSelectedRawMaterial}
                            >
                              <SelectTrigger id="raw-material">
                                <SelectValue placeholder="اختر المادة الخام" />
                              </SelectTrigger>
                              <SelectContent>
                                {rawMaterials.map(material => (
                                  <SelectItem key={material.code} value={material.code}>
                                    {material.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Raw Material Depletion Results */}
                          {selectedRawMaterial && isRawMaterialsDepletionResult(simulationResult) && (
                            <div className="mt-6">
                              <Card className="bg-muted/40">
                                <CardContent className="pt-6">
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="p-4 bg-card rounded-lg border">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">الكمية الحالية</p>
                                        <p className="text-2xl font-bold">
                                          {simulationResult.material.quantity.toFixed(2)} {simulationResult.material.unit}
                                        </p>
                                      </div>
                                      <div className="p-4 bg-card rounded-lg border">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">الحد الأدنى للمخزون</p>
                                        <p className="text-2xl font-bold">
                                          {simulationResult.material.min_stock} {simulationResult.material.unit}
                                        </p>
                                      </div>
                                      <div className={`p-4 rounded-lg border ${
                                        simulationResult.reorderRequired 
                                          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' 
                                          : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                      }`}>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">أيام الاستهلاك المتبقية</p>
                                        <p className="text-2xl font-bold flex items-center">
                                          {simulationResult.daysUntilDepletion} يوم
                                          {simulationResult.reorderRequired 
                                            ? <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                                            : <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                                          }
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-6">
                                      <h4 className="font-medium mb-4">توقع استهلاك المخزون</h4>
                                      <ResponsiveContainer width="100%" height={300}>
                                        <RechartsBarChart
                                          data={simulationResult.simulationData}
                                          margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                                        >
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="day" label={{ value: 'الأيام', position: 'insideBottomRight', offset: -10 }} />
                                          <YAxis label={{ value: 'الكمية', angle: -90, position: 'insideLeft' }} />
                                          <Tooltip />
                                          <Legend />
                                          <Bar dataKey="quantity" name="الكمية المتبقية" fill="#8884d8" />
                                          <Bar dataKey="threshold" name="الحد الأدنى" fill="#ff7300" />
                                        </RechartsBarChart>
                                      </ResponsiveContainer>
                                    </div>
                                    
                                    {simulationResult.reorderRequired && (
                                      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                                        <h4 className="font-medium text-red-700 dark:text-red-400 flex items-center">
                                          <AlertTriangle className="h-5 w-5 mr-2" />
                                          تنبيه: اقتراب نفاذ المخزون
                                        </h4>
                                        <p className="mt-1 text-red-600 dark:text-red-300">
                                          سينفذ المخزون في غضون {simulationResult.daysUntilDepletion} يومًا. يُرجى إعادة الطلب قبل نفاذ المخزون.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                          
                          {!selectedRawMaterial && (
                            <div className="text-center py-12">
                              <p className="text-muted-foreground">اختر مادة خام لعرض تحليل الاستنفاد</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Packaging Capacity Tab */}
                      <TabsContent value="packaging" className="mt-0">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="finished-product">اختر المنتج النهائي</Label>
                            <Select 
                              value={selectedProduct} 
                              onValueChange={setSelectedProduct}
                            >
                              <SelectTrigger id="finished-product">
                                <SelectValue placeholder="اختر المنتج النهائي" />
                              </SelectTrigger>
                              <SelectContent>
                                {finishedProducts.map(product => (
                                  <SelectItem key={product.code} value={product.code}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Packaging Capacity Results */}
                          {selectedProduct && isPackagingCapacityResult(simulationResult) && (
                            <div className="mt-6 space-y-6">
                              <Card className="bg-muted/40">
                                <CardContent className="pt-6">
                                  <div className="space-y-4">
                                    <h3 className="text-xl font-semibold">قدرة التعبئة المتاحة</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="p-4 bg-card rounded-lg border">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">الكمية القصوى الممكن تعبئتها</p>
                                        <p className="text-2xl font-bold">{simulationResult.maxPossibleProduction.toFixed(1)} {simulationResult.product.unit}</p>
                                      </div>
                                      <div className="p-4 bg-card rounded-lg border">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">أيام الإنتاج المتاحة</p>
                                        <p className="text-2xl font-bold">{simulationResult.daysOfProduction} يوم</p>
                                      </div>
                                      <div className="p-4 bg-card rounded-lg border">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">العامل المحدد</p>
                                        <p className="text-xl font-bold">
                                          {simulationResult.limitingFactor === "semiFinished" 
                                            ? "المنتج نصف المصنع" 
                                            : "مواد التعبئة"}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-4">
                                      <h4 className="font-medium mb-2">المنتج نصف المصنع</h4>
                                      <div className={`p-3 flex justify-between items-start border rounded-md ${
                                        simulationResult.limitingFactor === "semiFinished" 
                                          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                                          : ''
                                      }`}>
                                        <div>
                                          <p className="font-medium">{simulationResult.product.semiFinished.name}</p>
                                          <div className="flex space-x-4 rtl:space-x-reverse mt-1">
                                            <p className="text-sm">
                                              <span className="text-muted-foreground">الكمية المطلوبة:</span> {simulationResult.product.semiFinished.quantity} / وحدة
                                            </p>
                                            <p className="text-sm">
                                              <span className="text-muted-foreground">المتاح:</span> {simulationResult.semiFinishedAvailable}
                                            </p>
                                          </div>
                                        </div>
                                        {simulationResult.limitingFactor === "semiFinished" && (
                                          <Badge className="bg-amber-500 hover:bg-amber-500">العامل المحدد</Badge>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="mt-4">
                                      <h4 className="font-medium mb-2">مواد التعبئة المطلوبة</h4>
                                      <div className="space-y-2">
                                        {simulationResult.packagingLimits.map((material, index) => (
                                          <div 
                                            key={material.code}
                                            className={`p-3 flex justify-between items-start border rounded-md ${
                                              material.isLimiting 
                                                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                                                : ''
                                            }`}
                                          >
                                            <div>
                                              <p className="font-medium">{material.name}</p>
                                              <div className="flex space-x-4 rtl:space-x-reverse mt-1">
                                                <p className="text-sm">
                                                  <span className="text-muted-foreground">الكمية المطلوبة:</span> {material.requiredQuantity} / وحدة
                                                </p>
                                                <p className="text-sm">
                                                  <span className="text-muted-foreground">المتاح:</span> {material.availableQuantity}
                                                </p>
                                              </div>
                                            </div>
                                            {material.isLimiting && (
                                              <Badge className="bg-amber-500 hover:bg-amber-500">العامل المحدد</Badge>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                          
                          {!selectedProduct && (
                            <div className="text-center py-12">
                              <p className="text-muted-foreground">اختر منتجًا نهائيًا لعرض تحليل قدرة التعبئة</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Packaging Materials Tab */}
                      <TabsContent value="packaging-materials" className="mt-0">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="packaging-material">اختر مواد التعبئة</Label>
                            <Select 
                              value={selectedPackagingMaterial} 
                              onValueChange={setSelectedPackagingMaterial}
                            >
                              <SelectTrigger id="packaging-material">
                                <SelectValue placeholder="اختر مواد التعبئة" />
                              </SelectTrigger>
                              <SelectContent>
                                {packagingMaterials.map(material => (
                                  <SelectItem key={material.code} value={material.code}>
                                    {material.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Packaging Material Usage Results */}
                          {selectedPackagingMaterial && isPackagingMaterialUsageResult(simulationResult) && (
                            <div className="mt-6 space-y-6">
                              <Card className="bg-muted/40">
                                <CardContent className="pt-6">
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="p-4 bg-card rounded-lg border">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">الكمية الحالية</p>
                                        <p className="text-2xl font-bold">
                                          {simulationResult.material.quantity.toFixed(2)} {simulationResult.material.unit}
                                        </p>
                                      </div>
                                      <div className="p-4 bg-card rounded-lg border">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">الحد الأدنى للمخزون</p>
                                        <p className="text-2xl font-bold">
                                          {simulationResult.material.min_stock} {simulationResult.material.unit}
                                        </p>
                                      </div>
                                      <div className={`p-4 rounded-lg border ${
                                        simulationResult.reorderRequired 
                                          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' 
                                          : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                      }`}>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">أيام الاستهلاك المتبقية</p>
                                        <p className="text-2xl font-bold flex items-center">
                                          {simulationResult.daysUntilDepletion} يوم
                                          {simulationResult.reorderRequired 
                                            ? <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                                            : <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                                          }
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-6">
                                      <h4 className="font-medium mb-4">توقع استهلاك المخزون</h4>
                                      <ResponsiveContainer width="100%" height={300}>
                                        <RechartsBarChart
                                          data={simulationResult.simulationData}
                                          margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                                        >
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="day" label={{ value: 'الأيام', position: 'insideBottomRight', offset: -10 }} />
                                          <YAxis label={{ value: 'الكمية', angle: -90, position: 'insideLeft' }} />
                                          <Tooltip />
                                          <Legend />
                                          <Bar dataKey="quantity" name="الكمية المتبقية" fill="#8884d8" />
                                          <Bar dataKey="threshold" name="الحد الأدنى" fill="#ff7300" />
                                        </RechartsBarChart>
                                      </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="mt-4">
                                      <h4 className="font-medium mb-2">المنتجات التي تستخدم هذه المادة</h4>
                                      <div className="space-y-2">
                                        {simulationResult.productStats.map((product, index) => (
                                          <div 
                                            key={product.productCode}
                                            className="p-3 flex justify-between items-center border rounded-md"
                                          >
                                            <div>
                                              <p className="font-medium">{product.productName}</p>
                                              <p className="text-sm text-muted-foreground">
                                                الكمية المطلوبة: {product.requiredQuantity} / وحدة
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <p className="font-medium">الإنتاج الممكن</p>
                                              <p className="text-sm">{product.maxProduction} وحدة</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                          
                          {!selectedPackagingMaterial && (
                            <div className="text-center py-12">
                              <p className="text-muted-foreground">اختر مواد تعبئة لعرض تحليل الاستخدام</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </>
                  )}
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProductionPlanning;
