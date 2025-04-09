
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, FlaskConical, ListCheck, ArrowRight, PackageCheck, ArchiveX } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ProductionService from '@/services/ProductionService';
import InventoryService from '@/services/InventoryService';
import { toast } from 'sonner';

interface SimulationProduct {
  code: string;
  name: string;
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

const ProductionSimulation = () => {
  const [productOptions, setProductOptions] = useState<{code: string, name: string}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  
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

  const runSimulation = async () => {
    if (!selectedProduct || quantity <= 0) {
      toast.error('الرجاء إدخال المنتج والكمية');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // محاكاة عملية الإنتاج (هذه بيانات افتراضية، يمكن استبدالها بمنطق حقيقي)
      const inventoryService = InventoryService.getInstance();
      
      // الحصول على بيانات المنتج
      const { data: product } = await inventoryService.getFinishedProductByCode(selectedProduct);
      
      if (!product) {
        toast.error('المنتج غير موجود');
        setIsLoading(false);
        return;
      }
      
      // جلب بيانات متطلبات المنتج من المواد الأولية ومواد التعبئة
      const rawMaterials = await inventoryService.getRawMaterials();
      const packagingMaterials = await inventoryService.getPackagingMaterials();
      const semiFinishedProducts = await inventoryService.getSemiFinishedProducts();
      
      // حساب متطلبات المنتج نصف المصنع
      const semiFinishedRequirements: MaterialRequirement[] = [];
      if (product.semiFinished && product.semiFinished.code) {
        const semiFinished = semiFinishedProducts.find(sf => sf.code === product.semiFinished.code);
        const requiredQuantity = product.semiFinished.quantity * quantity;
        
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
          const requiredQuantity = pkg.quantity * quantity;
          
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
            const semiRequiredQuantity = product.semiFinished.quantity * quantity;
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
      const estimatedTime = Math.max(1, Math.ceil(quantity / 50));
      
      setSimulationResult({
        rawMaterials: rawMaterialRequirements,
        packagingMaterials: packagingRequirements,
        semiFinished: semiFinishedRequirements,
        estimatedTime,
        canProduce,
        missingItems: missingItemsCount
      });
      
    } catch (error) {
      console.error('Error in simulation:', error);
      toast.error('حدث خطأ أثناء تنفيذ المحاكاة');
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
            محاكاة إنتاج منتج
          </CardTitle>
          <CardDescription>
            اختر المنتج والكمية لمحاكاة عملية الإنتاج وتحليل المتطلبات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                onClick={runSimulation} 
                disabled={isLoading || !selectedProduct || quantity <= 0}
                className="gap-2 w-full"
              >
                {isLoading ? 'جاري المحاكاة...' : 'تنفيذ المحاكاة'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {simulationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>نتيجة المحاكاة</CardTitle>
              <CardDescription>
                تحليل إمكانية إنتاج {quantity} وحدة من المنتج {productOptions.find(p => p.code === selectedProduct)?.name}
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
                <Button variant="outline" className="gap-2" disabled={!simulationResult.canProduce}>
                  <ListCheck className="h-4 w-4" />
                  إنشاء أمر إنتاج
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
    </div>
  );
};

export default ProductionSimulation;
