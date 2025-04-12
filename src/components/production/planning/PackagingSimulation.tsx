
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, Box, Package, Loader2, Plus, RotateCcw, Save, Truck, Trash2, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// نوع بيانات المنتج المعبأ
interface PackagedProduct {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
}

// نوع بيانات مادة التعبئة
interface PackagingMaterial {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
}

// نوع بيانات متطلبات التعبئة
interface PackagingRequirement {
  productId: string;
  materialId: string;
  quantityPerUnit: number;
}

// نوع بيانات محاكاة التعبئة
interface PackagingSimulationItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  materials: {
    id: string;
    materialId: string;
    materialCode: string;
    materialName: string;
    requiredQuantity: number;
    availableQuantity: number;
    isSufficient: boolean;
    unitCost: number;
    totalCost: number;
  }[];
  isComplete: boolean;
  totalPackagingCost: number;
}

const PackagingSimulation = () => {
  const [simulationItems, setSimulationItems] = useState<PackagingSimulationItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(100);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('setup');
  
  // للحصول على بيانات المنتجات النهائية
  const { data: finishedProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['finished-products-for-packaging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finished_products')
        .select('id, code, name, unit, unit_cost')
        .order('name');
      
      if (error) throw error;
      
      return (data || []).map(product => ({
        id: product.id.toString(),
        code: product.code,
        name: product.name,
        unit: product.unit || 'وحدة',
        quantity: 0, // ليست مهمة في المحاكاة
        unitCost: product.unit_cost || 0
      }));
    }
  });
  
  // للحصول على بيانات مواد التعبئة
  const { data: packagingMaterials, isLoading: isLoadingMaterials } = useQuery({
    queryKey: ['packaging-materials-for-simulation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('id, code, name, unit, unit_cost, quantity')
        .order('name');
      
      if (error) throw error;
      
      return (data || []).map(material => ({
        id: material.id.toString(),
        code: material.code,
        name: material.name,
        unit: material.unit || 'وحدة',
        quantity: material.quantity || 0,
        unitCost: material.unit_cost || 0
      }));
    }
  });
  
  // بيانات متطلبات التعبئة (يمكن أن تأتي من قاعدة البيانات في التطبيق الحقيقي)
  const [packagingRequirements, setPackagingRequirements] = useState<PackagingRequirement[]>([]);
  
  // إعداد متطلبات التعبئة الافتراضية عند تحميل البيانات
  useEffect(() => {
    if (packagingMaterials && packagingMaterials.length > 0 && finishedProducts && finishedProducts.length > 0) {
      const defaultRequirements: PackagingRequirement[] = [];
      
      // توليد متطلبات افتراضية
      finishedProducts.forEach(product => {
        // لكل منتج، نضيف متطلبات لمواد تعبئة مختلفة (عشوائية للمحاكاة)
        const numberOfMaterials = 2 + Math.floor(Math.random() * 3); // عدد عشوائي من 2 إلى 4 مواد
        
        const shuffledMaterials = [...packagingMaterials].sort(() => 0.5 - Math.random());
        const selectedMaterials = shuffledMaterials.slice(0, Math.min(numberOfMaterials, shuffledMaterials.length));
        
        selectedMaterials.forEach(material => {
          defaultRequirements.push({
            productId: product.id,
            materialId: material.id,
            quantityPerUnit: 0.1 + Math.random() * 0.9 // كمية عشوائية بين 0.1 و 1 لكل وحدة
          });
        });
      });
      
      setPackagingRequirements(defaultRequirements);
    }
  }, [packagingMaterials, finishedProducts]);
  
  // إضافة عنصر جديد للمحاكاة
  const addSimulationItem = () => {
    if (!selectedProductId || quantity <= 0) {
      toast.error('يرجى اختيار منتج وكمية صحيحة');
      return;
    }
    
    const selectedProduct = finishedProducts?.find(p => p.id === selectedProductId);
    
    if (!selectedProduct) {
      toast.error('لم يتم العثور على المنتج المحدد');
      return;
    }
    
    // العثور على متطلبات التعبئة للمنتج المحدد
    const productRequirements = packagingRequirements.filter(req => req.productId === selectedProductId);
    
    if (productRequirements.length === 0) {
      toast.warning('لا توجد متطلبات تعبئة محددة لهذا المنتج');
    }
    
    // إنشاء عنصر المحاكاة
    const materialsForProduct = productRequirements.map(req => {
      const material = packagingMaterials?.find(m => m.id === req.materialId);
      
      if (!material) return null;
      
      const requiredQuantity = req.quantityPerUnit * quantity;
      const isSufficient = material.quantity >= requiredQuantity;
      
      return {
        id: `${Date.now()}-${material.id}`,
        materialId: material.id,
        materialCode: material.code,
        materialName: material.name,
        requiredQuantity,
        availableQuantity: material.quantity,
        isSufficient,
        unitCost: material.unitCost,
        totalCost: requiredQuantity * material.unitCost
      };
    }).filter(Boolean) as NonNullable<typeof materialsForProduct[number]>[];
    
    const totalPackagingCost = materialsForProduct.reduce((sum, material) => sum + material.totalCost, 0);
    const isComplete = materialsForProduct.every(material => material.isSufficient);
    
    const newSimulationItem: PackagingSimulationItem = {
      id: `sim-${Date.now()}`,
      productId: selectedProduct.id,
      productCode: selectedProduct.code,
      productName: selectedProduct.name,
      quantity,
      unit: selectedProduct.unit,
      materials: materialsForProduct,
      isComplete,
      totalPackagingCost
    };
    
    setSimulationItems(prev => [...prev, newSimulationItem]);
    
    // إعادة تعيين حقول الإدخال
    setSelectedProductId('');
    setQuantity(100);
    
    toast.success('تمت إضافة عنصر للمحاكاة');
  };
  
  // حذف عنصر من المحاكاة
  const removeSimulationItem = (itemId: string) => {
    setSimulationItems(prev => prev.filter(item => item.id !== itemId));
    toast.success('تم حذف العنصر من المحاكاة');
  };
  
  // تعديل كمية المنتج وإعادة حساب متطلبات التعبئة
  const updateProductQuantity = (itemId: string, newQuantity: number) => {
    setSimulationItems(prev => {
      return prev.map(item => {
        if (item.id !== itemId) return item;
        
        const updatedMaterials = item.materials.map(material => {
          const requirement = packagingRequirements.find(
            req => req.productId === item.productId && req.materialId === material.materialId
          );
          
          if (!requirement) return material;
          
          const requiredQuantity = requirement.quantityPerUnit * newQuantity;
          const isSufficient = material.availableQuantity >= requiredQuantity;
          
          return {
            ...material,
            requiredQuantity,
            isSufficient,
            totalCost: requiredQuantity * material.unitCost
          };
        });
        
        const totalPackagingCost = updatedMaterials.reduce((sum, material) => sum + material.totalCost, 0);
        const isComplete = updatedMaterials.every(material => material.isSufficient);
        
        return {
          ...item,
          quantity: newQuantity,
          materials: updatedMaterials,
          isComplete,
          totalPackagingCost
        };
      });
    });
  };
  
  // إعادة تعيين المحاكاة
  const resetSimulation = () => {
    const confirm = window.confirm('هل أنت متأكد من إعادة تعيين المحاكاة؟ سيتم حذف جميع العناصر.');
    
    if (confirm) {
      setSimulationItems([]);
      setSelectedProductId('');
      setQuantity(100);
      setShowSummary(false);
      setActiveTab('setup');
      toast.info('تم إعادة تعيين المحاكاة');
    }
  };
  
  // بدء المحاكاة
  const startSimulation = () => {
    if (simulationItems.length === 0) {
      toast.error('يرجى إضافة عناصر للمحاكاة أولاً');
      return;
    }
    
    setIsSimulating(true);
    
    setTimeout(() => {
      setShowSummary(true);
      setActiveTab('results');
      setIsSimulating(false);
      toast.success('تمت المحاكاة بنجاح');
    }, 1500);
  };
  
  // حفظ المحاكاة (محاكاة فقط)
  const saveSimulation = () => {
    toast.success('تم حفظ نتائج المحاكاة');
  };
  
  // حساب إجمالي تكاليف التعبئة
  const getTotalPackagingCost = () => {
    return simulationItems.reduce((sum, item) => sum + item.totalPackagingCost, 0);
  };
  
  // التحقق من توفر جميع مواد التعبئة
  const areAllMaterialsAvailable = () => {
    return simulationItems.every(item => item.isComplete);
  };
  
  // الحصول على قائمة المواد غير المتوفرة بكميات كافية
  const getInsufficientMaterials = () => {
    const insufficientMaterials: { name: string, code: string, required: number, available: number, unit: string }[] = [];
    
    simulationItems.forEach(item => {
      item.materials.forEach(material => {
        if (!material.isSufficient) {
          const existingIndex = insufficientMaterials.findIndex(m => m.code === material.materialCode);
          
          if (existingIndex >= 0) {
            insufficientMaterials[existingIndex].required += material.requiredQuantity;
          } else {
            const materialData = packagingMaterials?.find(m => m.id === material.materialId);
            
            insufficientMaterials.push({
              name: material.materialName,
              code: material.materialCode,
              required: material.requiredQuantity,
              available: material.availableQuantity,
              unit: materialData?.unit || 'وحدة'
            });
          }
        }
      });
    });
    
    return insufficientMaterials;
  };
  
  // تجميع متطلبات مواد التعبئة من جميع العناصر
  const getAggregatedMaterialsRequirements = () => {
    const aggregatedMaterials: { [key: string]: { 
      id: string, 
      name: string, 
      code: string, 
      requiredQuantity: number, 
      availableQuantity: number,
      unit: string,
      unitCost: number,
      totalCost: number,
      isSufficient: boolean 
    } } = {};
    
    simulationItems.forEach(item => {
      item.materials.forEach(material => {
        if (aggregatedMaterials[material.materialId]) {
          aggregatedMaterials[material.materialId].requiredQuantity += material.requiredQuantity;
          aggregatedMaterials[material.materialId].totalCost += material.totalCost;
          aggregatedMaterials[material.materialId].isSufficient = 
            aggregatedMaterials[material.materialId].availableQuantity >= 
            aggregatedMaterials[material.materialId].requiredQuantity;
        } else {
          const materialData = packagingMaterials?.find(m => m.id === material.materialId);
          
          aggregatedMaterials[material.materialId] = {
            id: material.materialId,
            name: material.materialName,
            code: material.materialCode,
            requiredQuantity: material.requiredQuantity,
            availableQuantity: material.availableQuantity,
            unit: materialData?.unit || 'وحدة',
            unitCost: material.unitCost,
            totalCost: material.totalCost,
            isSufficient: material.isSufficient
          };
        }
      });
    });
    
    return Object.values(aggregatedMaterials);
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full sm:w-[400px]">
          <TabsTrigger value="setup" disabled={isSimulating}>إعداد المحاكاة</TabsTrigger>
          <TabsTrigger value="materials" disabled={isSimulating || simulationItems.length === 0}>المواد</TabsTrigger>
          <TabsTrigger value="results" disabled={isSimulating || !showSummary}>النتائج</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* نموذج إضافة منتج للتعبئة */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  إضافة منتج للتعبئة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">المنتج النهائي</Label>
                  {isLoadingProducts ? (
                    <div className="flex items-center justify-center h-10 bg-muted rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger id="product">
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {finishedProducts?.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantity">الكمية</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                
                <Button
                  onClick={addSimulationItem}
                  className="w-full"
                  disabled={isLoadingProducts || isLoadingMaterials}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة للمحاكاة
                </Button>
              </CardContent>
            </Card>
            
            {/* قائمة منتجات المحاكاة */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    منتجات المحاكاة
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetSimulation}
                      disabled={simulationItems.length === 0 || isSimulating}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      إعادة تعيين
                    </Button>
                    <Button
                      size="sm"
                      onClick={startSimulation}
                      disabled={simulationItems.length === 0 || isSimulating}
                    >
                      {isSimulating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          جاري المحاكاة...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4 mr-2" />
                          بدء المحاكاة
                        </>
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {simulationItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    قم بإضافة منتجات للمحاكاة
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {simulationItems.map(item => (
                        <div key={item.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h3 className="font-bold">{item.productName}</h3>
                              <div className="text-sm text-muted-foreground">
                                الكود: {item.productCode}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={item.isComplete ? "outline" : "destructive"}>
                                {item.isComplete ? 'مكتمل' : 'غير مكتمل'}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeSimulationItem(item.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                              <Label htmlFor={`quantity-${item.id}`}>الكمية</Label>
                              <div className="flex gap-2 items-center">
                                <Input
                                  id={`quantity-${item.id}`}
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateProductQuantity(item.id, Number(e.target.value))}
                                  className="w-28"
                                />
                                <span>{item.unit}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>تكلفة التعبئة</Label>
                              <div className="font-bold text-lg">{item.totalPackagingCost.toFixed(2)} ج.م</div>
                            </div>
                          </div>
                          
                          <div className="border-t pt-3">
                            <h4 className="font-medium mb-2">مواد التعبئة المطلوبة</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {item.materials.map(material => (
                                <div 
                                  key={material.id} 
                                  className={`p-2 border rounded-md ${!material.isSufficient ? 'border-red-200 bg-red-50' : ''}`}
                                >
                                  <div className="font-medium text-sm">{material.materialName}</div>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">المطلوب:</span>
                                    <span className="text-xs font-medium">{material.requiredQuantity.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">المتوفر:</span>
                                    <span className={`text-xs font-medium ${!material.isSufficient ? 'text-red-500' : ''}`}>
                                      {material.availableQuantity.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
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
        </TabsContent>
        
        <TabsContent value="materials" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Box className="h-5 w-5" />
                متطلبات مواد التعبئة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المادة</TableHead>
                      <TableHead>الكمية المطلوبة</TableHead>
                      <TableHead>الكمية المتوفرة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تكلفة الوحدة</TableHead>
                      <TableHead>التكلفة الإجمالية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAggregatedMaterialsRequirements().map(material => (
                      <TableRow key={material.id}>
                        <TableCell>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-xs text-muted-foreground">{material.code}</div>
                        </TableCell>
                        <TableCell>{material.requiredQuantity.toFixed(2)} {material.unit}</TableCell>
                        <TableCell>{material.availableQuantity.toFixed(2)} {material.unit}</TableCell>
                        <TableCell>
                          {material.isSufficient ? (
                            <Badge variant="outline" className="bg-green-50">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
                              متوفر
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                              غير كافي
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{material.unitCost.toFixed(2)} ج.م</TableCell>
                        <TableCell>{material.totalCost.toFixed(2)} ج.م</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-6 flex justify-between items-center p-4 bg-muted rounded-md">
                <div>
                  <span className="font-medium">إجمالي تكلفة مواد التعبئة:</span>
                  <span className="font-bold text-lg mr-2">{getTotalPackagingCost().toFixed(2)} ج.م</span>
                </div>
                <div>
                  <span className="font-medium">عدد المواد:</span>
                  <span className="font-bold mr-2">{getAggregatedMaterialsRequirements().length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  نتائج المحاكاة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">عدد المنتجات</div>
                    <div className="text-2xl font-bold mt-1">{simulationItems.length}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">إجمالي التكلفة</div>
                    <div className="text-2xl font-bold mt-1">{getTotalPackagingCost().toFixed(2)} ج.م</div>
                  </div>
                </div>
                
                {!areAllMaterialsAvailable() && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>تنبيه: نقص في المواد</AlertTitle>
                    <AlertDescription>
                      هناك نقص في بعض مواد التعبئة. تحقق من قائمة المواد غير المتوفرة أدناه.
                    </AlertDescription>
                  </Alert>
                )}
                
                {areAllMaterialsAvailable() && (
                  <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>جميع المواد متوفرة</AlertTitle>
                    <AlertDescription>
                      جميع مواد التعبئة المطلوبة متوفرة بالكميات الكافية.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-center">
                  <Button onClick={saveSimulation}>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ نتائج المحاكاة
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  {!areAllMaterialsAvailable() ? 'المواد غير المتوفرة' : 'تفاصيل مواد التعبئة'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!areAllMaterialsAvailable() ? (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>المادة</TableHead>
                            <TableHead>الكمية المطلوبة</TableHead>
                            <TableHead>الكمية المتوفرة</TableHead>
                            <TableHead>النقص</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getInsufficientMaterials().map((material, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">{material.name}</div>
                                <div className="text-xs text-muted-foreground">{material.code}</div>
                              </TableCell>
                              <TableCell>{material.required.toFixed(2)} {material.unit}</TableCell>
                              <TableCell>{material.available.toFixed(2)} {material.unit}</TableCell>
                              <TableCell className="text-red-500 font-medium">
                                {(material.required - material.available).toFixed(2)} {material.unit}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" className="gap-2">
                        <ArrowRight className="h-4 w-4" />
                        طلب المواد الناقصة
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                    <div className="text-lg font-medium">مواد التعبئة جاهزة</div>
                    <p className="text-muted-foreground">
                      يمكنك المتابعة بأمان، جميع مواد التعبئة متوفرة بالكميات المطلوبة.
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab('materials')}>
                      عرض تفاصيل المواد
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PackagingSimulation;
