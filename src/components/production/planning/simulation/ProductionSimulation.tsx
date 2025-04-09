
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowDown, ArrowUp, Circle, Copy, PackagePlus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import InventoryService from '@/services/InventoryService';
import ProductionService from '@/services/ProductionService';
import { SemiFinishedProduct } from '@/services/InventoryService';
import { FinishedProduct } from '@/services/InventoryService';

const formSchema = z.object({
  product: z.string().min(2, {
    message: 'الرجاء اختيار منتج.',
  }),
  quantity: z.number().min(1, {
    message: 'الرجاء إدخال كمية صحيحة.',
  }),
});

const ProductionSimulation = () => {
  const [products, setProducts] = useState<SemiFinishedProduct[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SemiFinishedProduct | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [ingredients, setIngredients] = useState<{
    code: string;
    name: string;
    requiredQuantity: number;
    available: boolean;
    unit: string;
    cost: number;
  }[]>([]);
  const [packagingMaterials, setPackagingMaterials] = useState<{
    code: string;
    name: string;
    requiredQuantity: number;
    available: boolean;
    unit: string;
    cost: number;
  }[]>([]);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isIngredientCostManually, setIsIngredientCostManually] = useState<boolean>(false);
  const [isPackagingCostManually, setIsPackagingCostManually] = useState<boolean>(false);
  const [ingredientManualCost, setIngredientManualCost] = useState<number>(0);
  const [packagingManualCost, setPackagingManualCost] = useState<number>(0);
  const [isFinishedProduct, setIsFinishedProduct] = useState<boolean>(false);
  const [isSemiFinishedProduct, setIsSemiFinishedProduct] = useState<boolean>(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [isSimulationFinished, setIsSimulationFinished] = useState<boolean>(false);
  const [isSimulationFailed, setIsSimulationFailed] = useState<boolean>(false);
  const [simulationErrorMessage, setSimulationErrorMessage] = useState<string>('');
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  
  // Form setup with useForm
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: "",
      quantity: 1,
    },
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (debouncedSearchTerm) {
      const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
      // Filter products based on search term
    }
  }, [debouncedSearchTerm, products]);

  const fetchProducts = async () => {
    try {
      const inventoryService = InventoryService.getInstance();
      const semiFinishedProducts = await inventoryService.getSemiFinishedProducts();
      const finishedProducts = await inventoryService.getFinishedProducts();
      
      setProducts(semiFinishedProducts);
      setFinishedProducts(finishedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات');
    }
  };

  const handleProductSelect = async (productCode: string) => {
    const selectedProd = products.find(p => p.code === productCode);
    if (selectedProd) {
      setSelectedProduct(selectedProd);
      
      // Fetch ingredients for this product
      try {
        const inventoryService = InventoryService.getInstance();
        const ingredients = await inventoryService.getSemiFinishedIngredients(selectedProd.id);
        
        // Transform ingredients to required format
        const formattedIngredients = ingredients.map(ing => ({
          code: ing.code || '',
          name: ing.name || '',
          requiredQuantity: ing.percentage * quantity / 100,
          available: (ing.quantity || 0) >= (ing.percentage * quantity / 100),
          unit: ing.unit || '',
          cost: ing.unit_cost || 0
        }));
        
        setIngredients(formattedIngredients);
        
        // Calculate total ingredients cost
        const ingredientsCost = formattedIngredients.reduce(
          (sum, ing) => sum + (ing.cost * ing.requiredQuantity), 0
        );
        
        setTotalCost(ingredientsCost);
      } catch (error) {
        console.error('Error fetching ingredients:', error);
        toast.error('حدث خطأ أثناء جلب المكونات');
      }
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
    
    // Update required quantities and availability
    if (ingredients.length > 0) {
      const updatedIngredients = ingredients.map(ing => ({
        ...ing,
        requiredQuantity: ing.requiredQuantity * (newQuantity / quantity),
        available: ing.available // This should be recalculated based on actual inventory
      }));
      
      setIngredients(updatedIngredients);
      
      // Recalculate total cost
      const ingredientsCost = updatedIngredients.reduce(
        (sum, ing) => sum + (ing.cost * ing.requiredQuantity), 0
      );
      
      setTotalCost(ingredientsCost);
    }
  };

  const runSimulation = async () => {
    if (!selectedProduct) {
      toast.error('الرجاء اختيار منتج أولاً');
      return;
    }
    
    setIsSimulationRunning(true);
    
    try {
      // Check if all ingredients are available
      const allIngredientsAvailable = ingredients.every(ing => ing.available);
      
      if (!allIngredientsAvailable) {
        setIsSimulationFailed(true);
        setSimulationErrorMessage('بعض المكونات غير متوفرة بالكمية المطلوبة');
      } else {
        setIsSimulationFinished(true);
      }
    } catch (error) {
      console.error('Error running simulation:', error);
      setIsSimulationFailed(true);
      setSimulationErrorMessage('حدث خطأ أثناء تشغيل المحاكاة');
    } finally {
      setIsSimulationRunning(false);
    }
  };

  const createProductionOrder = async () => {
    if (!selectedProduct) return;
    
    setIsCreatingOrder(true);
    
    try {
      const productionService = ProductionService.getInstance();
      
      const result = await productionService.createProductionOrder(
        selectedProduct.code,
        quantity,
        totalCost
      );
      
      if (result) {
        toast.success('تم إنشاء أمر الإنتاج بنجاح');
        resetSimulation();
      }
    } catch (error) {
      console.error('Error creating production order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر الإنتاج');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const resetSimulation = () => {
    setIsResetting(true);
    setSelectedProduct(null);
    setQuantity(1);
    setIngredients([]);
    setPackagingMaterials([]);
    setTotalCost(0);
    setIsSimulationFinished(false);
    setIsSimulationFailed(false);
    setSimulationErrorMessage('');
    form.reset();
    setIsResetting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>محاكاة الإنتاج</CardTitle>
          <CardDescription>
            قم بمحاكاة عملية إنتاج للتأكد من توفر المكونات والموارد اللازمة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="product"
                    render={({ field }) => (
                      <FormItem>
                        <Label>المنتج</Label>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleProductSelect(value);
                          }}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر منتج" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.code}>
                                {product.name} - {product.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <Label>الكمية</Label>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            field.onChange(value);
                            handleQuantityChange(value);
                          }}
                          min={1}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedProduct && (
                    <div className="border rounded-md p-4 bg-muted/50">
                      <h3 className="font-medium mb-2">تفاصيل المنتج</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>الكود:</div>
                        <div>{selectedProduct.code}</div>
                        <div>الاسم:</div>
                        <div>{selectedProduct.name}</div>
                        <div>الوحدة:</div>
                        <div>{selectedProduct.unit}</div>
                        <div>المخزون الحالي:</div>
                        <div>{selectedProduct.quantity} {selectedProduct.unit}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium mb-2">المكونات المطلوبة</h3>
                  {ingredients.length > 0 ? (
                    <ScrollArea className="h-[240px] rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>المادة</TableHead>
                            <TableHead>الكمية المطلوبة</TableHead>
                            <TableHead>التوفر</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ingredients.map((ingredient, index) => (
                            <TableRow key={index}>
                              <TableCell>{ingredient.name}</TableCell>
                              <TableCell>
                                {ingredient.requiredQuantity} {ingredient.unit}
                              </TableCell>
                              <TableCell>
                                {ingredient.available ? (
                                  <Badge className="bg-green-100 text-green-800">متوفر</Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-800">غير متوفر</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-md">
                      <p>اختر منتج لعرض المكونات المطلوبة</p>
                    </div>
                  )}
                  
                  <div className="border rounded-md p-4 bg-muted/50">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">التكلفة الإجمالية</h3>
                      <span className="text-lg font-bold">{totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetSimulation}
                  disabled={isResetting || !selectedProduct}
                >
                  إعادة ضبط
                </Button>
                <Button
                  type="button"
                  onClick={runSimulation}
                  disabled={isSimulationRunning || !selectedProduct || ingredients.length === 0}
                >
                  {isSimulationRunning ? 'جاري التشغيل...' : 'تشغيل المحاكاة'}
                </Button>
                
                {isSimulationFinished && !isSimulationFailed && (
                  <Button
                    type="button"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={createProductionOrder}
                    disabled={isCreatingOrder}
                  >
                    {isCreatingOrder ? 'جاري الإنشاء...' : 'إنشاء أمر إنتاج'}
                  </Button>
                )}
              </div>
              
              {isSimulationFailed && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                  <h3 className="text-red-800 font-medium mb-2">فشلت المحاكاة</h3>
                  <p className="text-red-700">{simulationErrorMessage}</p>
                </div>
              )}
              
              {isSimulationFinished && !isSimulationFailed && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-4">
                  <h3 className="text-green-800 font-medium mb-2">نجحت المحاكاة</h3>
                  <p className="text-green-700">جميع المكونات متوفرة بالكميات المطلوبة. يمكنك إنشاء أمر إنتاج الآن.</p>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionSimulation;
