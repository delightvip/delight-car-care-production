
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, FlaskConical, ListCheck, ArrowRight, PackageCheck, ArchiveX, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ProductionService from '@/services/ProductionService';
import InventoryService from '@/services/InventoryService';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProductSimulationItem {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
}

interface MaterialRequirement {
  code: string;
  name: string;
  required: number;
  available: number;
  status: 'available' | 'low' | 'unavailable';
}

interface SimulationResult {
  rawMaterials: MaterialRequirement[];
  packagingMaterials: MaterialRequirement[];
  semiFinished: MaterialRequirement[];
  estimatedTime: number; // بالأيام
  canProduce: boolean;
  missingItems: number;
}

interface AggregatedResult extends SimulationResult {
  products: ProductSimulationItem[];
  totalProducts: number;
}

const ProductionSimulation = () => {
  const [productOptions, setProductOptions] = useState<{code: string, name: string}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationItems, setSimulationItems] = useState<ProductSimulationItem[]>([]);
  const [aggregatedResult, setAggregatedResult] = useState<AggregatedResult | null>(null);
  
  useEffect(() => {
    // جلب بيانات المنتجات من الخدمة
    const fetchProducts = async () => {
      try {
        const inventoryService = InventoryService.getInstance();
        const products = await inventoryService.getFinishedProducts();
        
        setProductOptions(products.map(product => ({
          code: product.code,
          name: product.name
        })));
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('حدث خطأ أثناء جلب بيانات المنتجات');
      }
    };
    
    fetchProducts();
  }, []);

  const addProductToSimulation = () => {
    if (!selectedProduct || quantity <= 0) {
      toast.error('الرجاء إدخال المنتج والكمية');
      return;
    }
    
    const selectedProductDetails = productOptions.find(p => p.code === selectedProduct);
    
    if (!selectedProductDetails) {
      toast.error('المنتج غير موجود');
      return;
    }
    
    const newItem: ProductSimulationItem = {
      id: Date.now().toString(),
      productCode: selectedProduct,
      productName: selectedProductDetails.name,
      quantity: quantity
    };
    
    setSimulationItems([...simulationItems, newItem]);
    setSelectedProduct('');
    setQuantity(0);
    
    toast.success(`تمت إضافة ${selectedProductDetails.name} إلى المحاكاة`);
  };
  
  const removeProductFromSimulation = (id: string) => {
    setSimulationItems(simulationItems.filter(item => item.id !== id));
  };

  const runSingleSimulation = async (productCode: string, productQuantity: number): Promise<SimulationResult> => {
    const inventoryService = InventoryService.getInstance();
    
    // الحصول على بيانات المنتج
    const { data: product } = await inventoryService.getFinishedProductByCode(productCode);
    
    if (!product) {
      throw new Error('المنتج غير موجود');
    }
    
    // جلب بيانات متطلبات المنتج من المواد الأولية ومواد التعبئة
    const rawMaterials = await inventoryService.getRawMaterials();
    const packagingMaterials = await inventoryService.getPackagingMaterials();
    const semiFinishedProducts = await inventoryService.getSemiFinishedProducts();
    
    // حساب متطلبات المنتج نصف المصنع
    const semiFinishedRequirements: MaterialRequirement[] = [];
    if (product.semiFinished && product.semiFinished.code) {
      const semiFinished = semiFinishedProducts.find(sf => sf.code === product.semiFinished.code);
      const requiredQuantity = product.semiFinished.quantity * productQuantity;
      
      if (semiFinished) {
        const availableQuantity = semiFinished.quantity || 0;
        semiFinishedRequirements.push({
          code: semiFinished.code,
          name: semiFinished.name,
          required: requiredQuantity,
          available: availableQuantity,
          status: availableQuantity >= requiredQuantity ? 'available' : 
                 availableQuantity > 0 ? 'low' : 'unavailable'
        });
      }
    }
    
    // حساب متطلبات مواد التعبئة
    const packagingRequirements: MaterialRequirement[] = [];
    if (product.packaging && Array.isArray(product.packaging)) {
      for (const pkg of product.packaging) {
        const packagingMaterial = packagingMaterials.find(p => p.code === pkg.code);
        const requiredQuantity = pkg.quantity * productQuantity;
        
        if (packagingMaterial) {
          const availableQuantity = packagingMaterial.quantity || 0;
          packagingRequirements.push({
            code: pkg.code,
            name: pkg.name,
            required: requiredQuantity,
            available: availableQuantity,
            status: availableQuantity >= requiredQuantity ? 'available' : 
                   availableQuantity > 0 ? 'low' : 'unavailable'
          });
        }
      }
    }
    
    // حساب متطلبات المواد الأولية للمنتج نصف المصنع
    const rawMaterialRequirements: MaterialRequirement[] = [];
    const semiFinishedCode = product.semiFinished?.code;
    
    if (semiFinishedCode) {
      const semiFinished = semiFinishedProducts.find(sf => sf.code === semiFinishedCode);
      
      if (semiFinished && semiFinished.ingredients && Array.isArray(semiFinished.ingredients)) {
        for (const ingredient of semiFinished.ingredients) {
          const rawMaterial = rawMaterials.find(rm => rm.code === ingredient.code);
          const semiRequiredQuantity = product.semiFinished.quantity * productQuantity;
          const requiredQuantity = (ingredient.percentage / 100) * semiRequiredQuantity;
          
          if (rawMaterial) {
            const availableQuantity = rawMaterial.quantity || 0;
            rawMaterialRequirements.push({
              code: ingredient.code,
              name: ingredient.name,
              required: requiredQuantity,
              available: availableQuantity,
              status: availableQuantity >= requiredQuantity ? 'available' : 
                     availableQuantity > 0 ? 'low' : 'unavailable'
            });
          }
        }
      }
    }
    
    // حساب عدد العناصر الناقصة
    const missingItemsCount = 
      rawMaterialRequirements.filter(item => item.status === 'unavailable').length +
      packagingRequirements.filter(item => item.status === 'unavailable').length +
      semiFinishedRequirements.filter(item => item.status === 'unavailable').length;
    
    // حساب ما إذا كان يمكن الإنتاج
    const canProduce = missingItemsCount === 0;
    
    // تقدير الوقت المطلوب (منطق افتراضي للعرض)
    const estimatedTime = Math.max(1, Math.ceil(productQuantity / 50));
    
    return {
      rawMaterials: rawMaterialRequirements,
      packagingMaterials: packagingRequirements,
      semiFinished: semiFinishedRequirements,
      estimatedTime,
      canProduce,
      missingItems: missingItemsCount
    };
  };

  const aggregateSimulationResults = (results: SimulationResult[]): AggregatedResult => {
    // تجميع المواد الخام
    const rawMaterialsMap = new Map<string, MaterialRequirement>();
    
    // تجميع المواد نصف المصنعة
    const semiFinishedMap = new Map<string, MaterialRequirement>();
    
    // تجميع مواد التعبئة
    const packagingMaterialsMap = new Map<string, MaterialRequirement>();
    
    // متغيرات إجمالية
    let totalMissingItems = 0;
    let allCanProduce = true;
    let maxEstimatedTime = 0;
    
    // تجميع نتائج المحاكاة
    results.forEach(result => {
      // تجميع المواد الخام
      result.rawMaterials.forEach(item => {
        if (rawMaterialsMap.has(item.code)) {
          const existingItem = rawMaterialsMap.get(item.code)!;
          existingItem.required += item.required;
          existingItem.status = existingItem.available >= existingItem.required ? 'available' :
                               existingItem.available > 0 ? 'low' : 'unavailable';
        } else {
          rawMaterialsMap.set(item.code, { ...item });
        }
      });
      
      // تجميع المواد نصف المصنعة
      result.semiFinished.forEach(item => {
        if (semiFinishedMap.has(item.code)) {
          const existingItem = semiFinishedMap.get(item.code)!;
          existingItem.required += item.required;
          existingItem.status = existingItem.available >= existingItem.required ? 'available' :
                               existingItem.available > 0 ? 'low' : 'unavailable';
        } else {
          semiFinishedMap.set(item.code, { ...item });
        }
      });
      
      // تجميع مواد التعبئة
      result.packagingMaterials.forEach(item => {
        if (packagingMaterialsMap.has(item.code)) {
          const existingItem = packagingMaterialsMap.get(item.code)!;
          existingItem.required += item.required;
          existingItem.status = existingItem.available >= existingItem.required ? 'available' :
                               existingItem.available > 0 ? 'low' : 'unavailable';
        } else {
          packagingMaterialsMap.set(item.code, { ...item });
        }
      });
      
      // تحديث المتغيرات الإجمالية
      totalMissingItems += result.missingItems;
      allCanProduce = allCanProduce && result.canProduce;
      maxEstimatedTime = Math.max(maxEstimatedTime, result.estimatedTime);
    });
    
    // إعادة حساب حالة العناصر
    const rawMaterials = Array.from(rawMaterialsMap.values()).map(item => {
      item.status = item.available >= item.required ? 'available' :
                   item.available > 0 ? 'low' : 'unavailable';
      return item;
    });
    
    const semiFinished = Array.from(semiFinishedMap.values()).map(item => {
      item.status = item.available >= item.required ? 'available' :
                   item.available > 0 ? 'low' : 'unavailable';
      return item;
    });
    
    const packagingMaterials = Array.from(packagingMaterialsMap.values()).map(item => {
      item.status = item.available >= item.required ? 'available' :
                   item.available > 0 ? 'low' : 'unavailable';
      return item;
    });
    
    // إعادة حساب العناصر الناقصة
    const missingItems = 
      rawMaterials.filter(item => item.status === 'unavailable').length +
      packagingMaterials.filter(item => item.status === 'unavailable').length +
      semiFinished.filter(item => item.status === 'unavailable').length;
    
    return {
      rawMaterials,
      packagingMaterials,
      semiFinished,
      estimatedTime: maxEstimatedTime,
      canProduce: missingItems === 0,
      missingItems,
      products: simulationItems,
      totalProducts: simulationItems.length
    };
  };

  const runSimulation = async () => {
    if (simulationItems.length === 0) {
      toast.error('الرجاء إضافة منتج واحد على الأقل للمحاكاة');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // إجراء المحاكاة لكل منتج على حدة
      const simulationResults: SimulationResult[] = [];
      
      for (const item of simulationItems) {
        const result = await runSingleSimulation(item.productCode, item.quantity);
        simulationResults.push(result);
      }
      
      // تجميع النتائج إذا كان هناك أكثر من منتج
      if (simulationItems.length === 1) {
        setSimulationResult(simulationResults[0]);
        setAggregatedResult(null);
      } else {
        const aggregated = aggregateSimulationResults(simulationResults);
        setAggregatedResult(aggregated);
        setSimulationResult(null);
      }
    } catch (error) {
      console.error('Error in simulation:', error);
      toast.error('حدث خطأ أثناء تنفيذ المحاكاة');
    } finally {
      setIsLoading(false);
    }
  };

  const createProductionOrder = async (productCode: string, quantity: number) => {
    try {
      setIsLoading(true);
      
      // الحصول على بيانات المنتج
      const inventoryService = InventoryService.getInstance();
      const { data: product } = await inventoryService.getFinishedProductByCode(productCode);
      
      if (!product) {
        toast.error('المنتج غير موجود');
        return;
      }
      
      // إنشاء أمر الإنتاج
      const productionService = ProductionService.getInstance();
      const newOrder = await productionService.createProductionOrder({
        product_code: productCode,
        product_name: product.name,
        quantity: quantity,
        unit: product.unit,
        date: new Date().toISOString().split('T')[0]
      });
      
      if (newOrder) {
        toast.success(`تم إنشاء أمر الإنتاج بنجاح: ${newOrder.code}`);
      }
    } catch (error) {
      console.error('Error creating production order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر الإنتاج');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            محاكاة إنتاج متعدد
          </CardTitle>
          <CardDescription>
            أضف المنتجات والكميات لمحاكاة عملية الإنتاج وتحليل المتطلبات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">المنتج</label>
              <Select
                value={selectedProduct}
                onValueChange={setSelectedProduct}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map(product => (
                    <SelectItem key={product.code} value={product.code}>
                      {product.name} ({product.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">الكمية</label>
              <Input
                type="number"
                placeholder="أدخل الكمية"
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={addProductToSimulation} 
                disabled={isLoading || !selectedProduct || quantity <= 0}
                className="gap-2 w-full"
              >
                <Plus className="h-4 w-4" />
                إضافة إلى المحاكاة
              </Button>
            </div>
          </div>
          
          {/* قائمة المنتجات المضافة للمحاكاة */}
          <div className="border rounded-md p-4 mb-4">
            <h3 className="text-sm font-medium mb-2">المنتجات المضافة للمحاكاة</h3>
            
            {simulationItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">لم تتم إضافة أي منتجات بعد</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {simulationItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-muted p-2 rounded-md">
                    <div>
                      <span className="font-medium">{item.productName}</span>
                      <div className="text-xs text-muted-foreground">{item.productCode}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>الكمية: {item.quantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeProductFromSimulation(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={runSimulation} 
              disabled={isLoading || simulationItems.length === 0}
              className="gap-2"
              variant="default"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري المحاكاة...
                </>
              ) : (
                <>
                  تنفيذ المحاكاة
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {simulationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>نتيجة المحاكاة</CardTitle>
              <CardDescription>
                تحليل إمكانية إنتاج {simulationItems[0].quantity} وحدة من المنتج {simulationItems[0].productName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant={simulationResult.canProduce ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {simulationResult.canProduce 
                    ? "يمكن تنفيذ أمر الإنتاج" 
                    : "لا يمكن تنفيذ أمر الإنتاج بالكامل"
                  }
                </AlertTitle>
                <AlertDescription>
                  {simulationResult.canProduce 
                    ? "جميع المواد متوفرة بالكميات المطلوبة"
                    : `هناك ${simulationResult.missingItems} ${simulationResult.missingItems === 1 ? 'مادة غير متوفرة' : 'مواد غير متوفرة'}`
                  }
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">الوقت التقديري للإنتاج:</span>
                  <span>
                    {simulationResult.estimatedTime} {simulationResult.estimatedTime === 1 ? 'يوم' : 'أيام'}
                  </span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">نسبة توفر المواد الخام:</span>
                  <span>
                    {Math.round(
                      (simulationResult.rawMaterials.filter(m => m.status === 'available').length / 
                      Math.max(1, simulationResult.rawMaterials.length)) * 100
                    )}%
                  </span>
                </div>
                
                <Progress 
                  value={
                    (simulationResult.rawMaterials.filter(m => m.status === 'available').length / 
                    Math.max(1, simulationResult.rawMaterials.length)) * 100
                  } 
                  className="h-2" 
                />
                
                <Separator />
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">نسبة توفر المنتجات نصف المصنعة:</span>
                  <span>
                    {Math.round(
                      (simulationResult.semiFinished.filter(m => m.status === 'available').length / 
                      Math.max(1, simulationResult.semiFinished.length)) * 100
                    )}%
                  </span>
                </div>
                
                <Progress 
                  value={
                    (simulationResult.semiFinished.filter(m => m.status === 'available').length / 
                    Math.max(1, simulationResult.semiFinished.length)) * 100
                  } 
                  className="h-2" 
                />
                
                <Separator />
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium">نسبة توفر مواد التعبئة:</span>
                  <span>
                    {Math.round(
                      (simulationResult.packagingMaterials.filter(m => m.status === 'available').length / 
                      Math.max(1, simulationResult.packagingMaterials.length)) * 100
                    )}%
                  </span>
                </div>
                
                <Progress 
                  value={
                    (simulationResult.packagingMaterials.filter(m => m.status === 'available').length / 
                    Math.max(1, simulationResult.packagingMaterials.length)) * 100
                  } 
                  className="h-2" 
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="default" 
                  className="gap-2" 
                  disabled={!simulationResult.canProduce || isLoading}
                  onClick={() => createProductionOrder(simulationItems[0].productCode, simulationItems[0].quantity)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <ListCheck className="h-4 w-4" />
                      إنشاء أمر إنتاج
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>متطلبات المواد</CardTitle>
              <CardDescription>
                تفاصيل المواد المطلوبة وحالة توفرها
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[500px] overflow-y-auto">
              {simulationResult.semiFinished.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <PackageCheck className="h-4 w-4" />
                    المنتجات نصف المصنعة
                  </h3>
                  <div className="space-y-2">
                    {simulationResult.semiFinished.map(item => (
                      <div key={item.code} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div>
                          <span className="font-medium block">{item.name}</span>
                          <span className="text-xs text-muted-foreground">{item.code}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-right">
                            <span className="block">{item.required.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">مطلوب</span>
                          </div>
                          <div className="text-sm text-right">
                            <span className="block">{item.available.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">متوفر</span>
                          </div>
                          <Badge 
                            variant={
                              item.status === 'available' ? 'default' : 
                              item.status === 'low' ? 'outline' : 'destructive'
                            }
                          >
                            {item.status === 'available' ? 'متوفر' : 
                             item.status === 'low' ? 'متوفر جزئيًا' : 'غير متوفر'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {simulationResult.rawMaterials.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ArchiveX className="h-4 w-4" />
                    المواد الخام
                  </h3>
                  <div className="space-y-2">
                    {simulationResult.rawMaterials.map(item => (
                      <div key={item.code} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div>
                          <span className="font-medium block">{item.name}</span>
                          <span className="text-xs text-muted-foreground">{item.code}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-right">
                            <span className="block">{item.required.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">مطلوب</span>
                          </div>
                          <div className="text-sm text-right">
                            <span className="block">{item.available.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">متوفر</span>
                          </div>
                          <Badge 
                            variant={
                              item.status === 'available' ? 'default' : 
                              item.status === 'low' ? 'outline' : 'destructive'
                            }
                          >
                            {item.status === 'available' ? 'متوفر' : 
                             item.status === 'low' ? 'متوفر جزئيًا' : 'غير متوفر'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {simulationResult.packagingMaterials.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <PackageCheck className="h-4 w-4" />
                    مواد التعبئة
                  </h3>
                  <div className="space-y-2">
                    {simulationResult.packagingMaterials.map(item => (
                      <div key={item.code} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div>
                          <span className="font-medium block">{item.name}</span>
                          <span className="text-xs text-muted-foreground">{item.code}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-right">
                            <span className="block">{item.required.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">مطلوب</span>
                          </div>
                          <div className="text-sm text-right">
                            <span className="block">{item.available.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">متوفر</span>
                          </div>
                          <Badge 
                            variant={
                              item.status === 'available' ? 'default' : 
                              item.status === 'low' ? 'outline' : 'destructive'
                            }
                          >
                            {item.status === 'available' ? 'متوفر' : 
                             item.status === 'low' ? 'متوفر جزئيًا' : 'غير متوفر'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {aggregatedResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>نتيجة المحاكاة المجمعة</CardTitle>
              <CardDescription>
                تحليل إمكانية إنتاج {aggregatedResult.totalProducts} منتجات مختلفة في نفس الوقت
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant={aggregatedResult.canProduce ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {aggregatedResult.canProduce 
                    ? "يمكن تنفيذ جميع أوامر الإنتاج" 
                    : "لا يمكن تنفيذ جميع أوامر الإنتاج"
                  }
                </AlertTitle>
                <AlertDescription>
                  {aggregatedResult.canProduce 
                    ? "جميع المواد متوفرة بالكميات المطلوبة لكل المنتجات"
                    : `هناك ${aggregatedResult.missingItems} ${aggregatedResult.missingItems === 1 ? 'مادة غير متوفرة' : 'مواد غير متوفرة'} تعيق الإنتاج`
                  }
                </AlertDescription>
              </Alert>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">الوقت التقديري الإجمالي للإنتاج:</span>
                    <span>
                      {aggregatedResult.estimatedTime} {aggregatedResult.estimatedTime === 1 ? 'يوم' : 'أيام'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">نسبة توفر المواد الخام:</span>
                    <span>
                      {Math.round(
                        (aggregatedResult.rawMaterials.filter(m => m.status === 'available').length / 
                        Math.max(1, aggregatedResult.rawMaterials.length)) * 100
                      )}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={
                      (aggregatedResult.rawMaterials.filter(m => m.status === 'available').length / 
                      Math.max(1, aggregatedResult.rawMaterials.length)) * 100
                    } 
                    className="h-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">نسبة توفر المنتجات نصف المصنعة:</span>
                    <span>
                      {Math.round(
                        (aggregatedResult.semiFinished.filter(m => m.status === 'available').length / 
                        Math.max(1, aggregatedResult.semiFinished.length)) * 100
                      )}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={
                      (aggregatedResult.semiFinished.filter(m => m.status === 'available').length / 
                      Math.max(1, aggregatedResult.semiFinished.length)) * 100
                    } 
                    className="h-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">نسبة توفر مواد التعبئة:</span>
                    <span>
                      {Math.round(
                        (aggregatedResult.packagingMaterials.filter(m => m.status === 'available').length / 
                        Math.max(1, aggregatedResult.packagingMaterials.length)) * 100
                      )}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={
                      (aggregatedResult.packagingMaterials.filter(m => m.status === 'available').length / 
                      Math.max(1, aggregatedResult.packagingMaterials.length)) * 100
                    } 
                    className="h-2" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">المنتجات المضمنة في المحاكاة:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {aggregatedResult.products.map(product => (
                    <div key={product.id} className="flex items-center justify-between bg-muted p-2 rounded-md">
                      <div>
                        <span className="font-medium">{product.productName}</span>
                        <div className="text-xs text-muted-foreground">{product.productCode}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">الكمية: {product.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2 flex gap-1 items-center text-xs"
                          disabled={!aggregatedResult.canProduce || isLoading}
                          onClick={() => createProductionOrder(product.productCode, product.quantity)}
                        >
                          <ListCheck className="h-3 w-3" />
                          أمر إنتاج
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    setAggregatedResult(null);
                    setSimulationResult(null);
                  }}
                >
                  <AlertTriangle className="h-4 w-4" />
                  إلغاء المحاكاة
                </Button>
                
                <Button 
                  variant="default" 
                  className="gap-2" 
                  disabled={!aggregatedResult.canProduce || isLoading}
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      // إنشاء أوامر إنتاج لجميع المنتجات
                      for (const product of aggregatedResult.products) {
                        await createProductionOrder(product.productCode, product.quantity);
                      }
                      toast.success('تم إنشاء جميع أوامر الإنتاج بنجاح');
                      // إعادة تعيين المحاكاة
                      setAggregatedResult(null);
                      setSimulationResult(null);
                      setSimulationItems([]);
                    } catch (error) {
                      console.error('Error creating production orders:', error);
                      toast.error('حدث خطأ أثناء إنشاء أوامر الإنتاج');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      إنشاء جميع أوامر الإنتاج
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="raw">
            <TabsList className="mb-4">
              <TabsTrigger value="raw">المواد الخام ({aggregatedResult.rawMaterials.length})</TabsTrigger>
              <TabsTrigger value="semi">نصف مصنعة ({aggregatedResult.semiFinished.length})</TabsTrigger>
              <TabsTrigger value="packaging">مواد تعبئة ({aggregatedResult.packagingMaterials.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="raw">
              <Card>
                <CardHeader>
                  <CardTitle>المواد الخام المطلوبة</CardTitle>
                  <CardDescription>
                    تفاصيل المواد الخام المطلوبة لإنتاج جميع المنتجات
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  {aggregatedResult.rawMaterials.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">
                      لا توجد مواد خام مطلوبة
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {aggregatedResult.rawMaterials.map(item => (
                        <div key={item.code} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div>
                            <span className="font-medium block">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.code}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-right">
                              <span className="block">{item.required.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">مطلوب</span>
                            </div>
                            <div className="text-sm text-right">
                              <span className="block">{item.available.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">متوفر</span>
                            </div>
                            <Badge 
                              variant={
                                item.status === 'available' ? 'default' : 
                                item.status === 'low' ? 'outline' : 'destructive'
                              }
                            >
                              {item.status === 'available' ? 'متوفر' : 
                               item.status === 'low' ? 'متوفر جزئيًا' : 'غير متوفر'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="semi">
              <Card>
                <CardHeader>
                  <CardTitle>المنتجات نصف المصنعة المطلوبة</CardTitle>
                  <CardDescription>
                    تفاصيل المنتجات نصف المصنعة المطلوبة لإنتاج جميع المنتجات
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  {aggregatedResult.semiFinished.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">
                      لا توجد منتجات نصف مصنعة مطلوبة
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {aggregatedResult.semiFinished.map(item => (
                        <div key={item.code} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div>
                            <span className="font-medium block">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.code}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-right">
                              <span className="block">{item.required.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">مطلوب</span>
                            </div>
                            <div className="text-sm text-right">
                              <span className="block">{item.available.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">متوفر</span>
                            </div>
                            <Badge 
                              variant={
                                item.status === 'available' ? 'default' : 
                                item.status === 'low' ? 'outline' : 'destructive'
                              }
                            >
                              {item.status === 'available' ? 'متوفر' : 
                               item.status === 'low' ? 'متوفر جزئيًا' : 'غير متوفر'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="packaging">
              <Card>
                <CardHeader>
                  <CardTitle>مواد التعبئة المطلوبة</CardTitle>
                  <CardDescription>
                    تفاصيل مواد التعبئة المطلوبة لإنتاج جميع المنتجات
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  {aggregatedResult.packagingMaterials.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">
                      لا توجد مواد تعبئة مطلوبة
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {aggregatedResult.packagingMaterials.map(item => (
                        <div key={item.code} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div>
                            <span className="font-medium block">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.code}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-right">
                              <span className="block">{item.required.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">مطلوب</span>
                            </div>
                            <div className="text-sm text-right">
                              <span className="block">{item.available.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">متوفر</span>
                            </div>
                            <Badge 
                              variant={
                                item.status === 'available' ? 'default' : 
                                item.status === 'low' ? 'outline' : 'destructive'
                              }
                            >
                              {item.status === 'available' ? 'متوفر' : 
                               item.status === 'low' ? 'متوفر جزئيًا' : 'غير متوفر'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ProductionSimulation;
