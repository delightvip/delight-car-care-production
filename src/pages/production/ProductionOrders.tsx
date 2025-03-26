import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Search, FileDown, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/ui/PageTransition';
import ProductionService from '@/services/ProductionService';
import InventoryService from '@/services/InventoryService';

// Fix the import for SemiFinishedProduct types
interface SemiFinishedProduct {
  id: number;
  name: string;
  code: string;
  unit: string;
  min_stock: number;
  quantity: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
}

interface RawMaterial {
  id: number;
  name: string;
  code: string;
  unit: string;
  min_stock: number;
  quantity: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
}

interface ProductionOrder {
  id: string;
  date: string;
  semi_finished_id: number;
  semi_finished_name: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  materials: ProductionOrderMaterial[];
}

interface ProductionOrderMaterial {
  id: string;
  production_order_id: string;
  raw_material_id: number;
  raw_material_name: string;
  quantity: number;
  created_at: string;
}

interface ProductionFormValues {
  semi_finished_id: number;
  quantity: number;
  date: string;
  notes?: string;
  materials: {
    raw_material_id: number;
    raw_material_name: string;
    quantity: number;
    selected: boolean;
  }[];
}

const ProductionOrders = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formValues, setFormValues] = useState<ProductionFormValues>({
    semi_finished_id: 0,
    quantity: 1,
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    materials: []
  });

  const queryClient = useQueryClient();
  const productionService = ProductionService.getInstance();

  const { data: productionOrders, isLoading, error, refetch } = useQuery({
    queryKey: ['production_orders'],
    queryFn: () => productionService.getProductionOrders(),
  });

  const { data: semiFinishedProducts } = useQuery({
    queryKey: ['semi_finished_products'],
    queryFn: () => InventoryService.getInstance().getSemiFinishedProducts(),
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ['raw_materials'],
    queryFn: () => InventoryService.getInstance().getRawMaterials(),
  });

  const filteredOrders = React.useMemo(() => {
    if (!productionOrders) return [];
    
    let filtered = productionOrders;
    
    if (activeTab !== 'all') {
      filtered = productionOrders.filter(order => order.status === activeTab);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.semi_finished_name.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [productionOrders, activeTab, searchQuery]);

  const handleSemiFinishedChange = (value: string) => {
    const semiFinishedId = parseInt(value, 10);
    setFormValues(prev => ({
      ...prev,
      semi_finished_id: semiFinishedId,
      materials: []
    }));
    
    // Fetch recipe for this semi-finished product
    productionService.getRecipeForSemiFinished(semiFinishedId)
      .then(recipe => {
        if (recipe && recipe.length > 0) {
          const materials = recipe.map(item => ({
            raw_material_id: item.raw_material_id,
            raw_material_name: item.raw_material_name,
            quantity: item.quantity * formValues.quantity,
            selected: true
          }));
          
          setFormValues(prev => ({
            ...prev,
            materials
          }));
          
          toast({
            title: "تم تحميل الوصفة",
            description: `تم تحميل ${materials.length} مواد خام للوصفة`,
            variant: "default"
          });
        } else {
          // If no recipe, add all raw materials as options
          if (rawMaterials && rawMaterials.length > 0) {
            const materials = rawMaterials.map(material => ({
              raw_material_id: material.id,
              raw_material_name: material.name,
              quantity: 0,
              selected: false
            }));
            
            setFormValues(prev => ({
              ...prev,
              materials
            }));
            
            toast({
              title: "لا توجد وصفة",
              description: "لم يتم العثور على وصفة لهذا المنتج. يمكنك إضافة المواد الخام يدويًا.",
              variant: "default"
            });
          }
        }
      })
      .catch(error => {
        console.error('Error fetching recipe:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحميل الوصفة",
          variant: "destructive"
        });
      });
  };

  const handleQuantityChange = (value: string) => {
    const quantity = parseInt(value, 10) || 1;
    
    setFormValues(prev => {
      // Update quantities of materials proportionally
      const updatedMaterials = prev.materials.map(material => ({
        ...material,
        quantity: material.quantity * (quantity / prev.quantity)
      }));
      
      return {
        ...prev,
        quantity,
        materials: updatedMaterials
      };
    });
  };

  const handleMaterialQuantityChange = (index: number, value: string) => {
    const quantity = parseFloat(value) || 0;
    
    setFormValues(prev => {
      const updatedMaterials = [...prev.materials];
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        quantity
      };
      
      return {
        ...prev,
        materials: updatedMaterials
      };
    });
  };

  const handleMaterialSelectionChange = (index: number, checked: boolean) => {
    setFormValues(prev => {
      const updatedMaterials = [...prev.materials];
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        selected: checked
      };
      
      return {
        ...prev,
        materials: updatedMaterials
      };
    });
  };

  const handleAddMaterial = () => {
    if (!rawMaterials || rawMaterials.length === 0) {
      toast({
        title: "خطأ",
        description: "لا توجد مواد خام متاحة",
        variant: "destructive"
      });
      return;
    }
    
    // Find materials that are not already in the list
    const existingIds = new Set(formValues.materials.map(m => m.raw_material_id));
    const availableMaterials = rawMaterials.filter(m => !existingIds.has(m.id));
    
    if (availableMaterials.length === 0) {
      toast({
        title: "تنبيه",
        description: "تم إضافة جميع المواد الخام المتاحة بالفعل",
        variant: "default"
      });
      return;
    }
    
    // Add the first available material
    const materialToAdd = availableMaterials[0];
    
    setFormValues(prev => ({
      ...prev,
      materials: [
        ...prev.materials,
        {
          raw_material_id: materialToAdd.id,
          raw_material_name: materialToAdd.name,
          quantity: 1,
          selected: true
        }
      ]
    }));
  };

  const handleRemoveMaterial = (index: number) => {
    setFormValues(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const handleCreateOrder = async () => {
    try {
      setIsProcessing(true);
      
      if (!formValues.semi_finished_id) {
        toast({
          title: "خطأ",
          description: "يرجى اختيار منتج نصف مصنع",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      if (formValues.quantity <= 0) {
        toast({
          title: "خطأ",
          description: "يجب أن تكون الكمية أكبر من صفر",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      const selectedMaterials = formValues.materials.filter(m => m.selected && m.quantity > 0);
      
      if (selectedMaterials.length === 0) {
        toast({
          title: "خطأ",
          description: "يرجى اختيار مادة خام واحدة على الأقل وتحديد كمية لها",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      // Check if we have enough raw materials in stock
      for (const material of selectedMaterials) {
        const rawMaterial = rawMaterials?.find(rm => rm.id === material.raw_material_id);
        
        if (rawMaterial && rawMaterial.quantity < material.quantity) {
          toast({
            title: "خطأ",
            description: `لا توجد كمية كافية من ${material.raw_material_name} في المخزون (المتاح: ${rawMaterial.quantity})`,
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
      }
      
      const semiFinishedProduct = semiFinishedProducts?.find(p => p.id === formValues.semi_finished_id);
      
      if (!semiFinishedProduct) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على المنتج النصف مصنع المحدد",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      const orderData = {
        semi_finished_id: formValues.semi_finished_id,
        semi_finished_name: semiFinishedProduct.name,
        quantity: formValues.quantity,
        date: formValues.date,
        notes: formValues.notes,
        status: 'pending' as const,
        materials: selectedMaterials.map(m => ({
          raw_material_id: m.raw_material_id,
          raw_material_name: m.raw_material_name,
          quantity: m.quantity
        }))
      };
      
      const result = await productionService.createProductionOrder(orderData);
      
      if (result) {
        toast({
          title: "نجاح",
          description: "تم إنشاء أمر الإنتاج بنجاح",
          variant: "default"
        });
        
        // Reset form and refresh data
        setFormValues({
          semi_finished_id: 0,
          quantity: 1,
          date: format(new Date(), 'yyyy-MM-dd'),
          notes: '',
          materials: []
        });
        
        setIsAddDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['production_orders'] });
      } else {
        toast({
          title: "خطأ",
          description: "فشل إنشاء أمر الإنتاج",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating production order:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء أمر الإنتاج",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedOrderId) return;
    
    try {
      setIsProcessing(true);
      
      const success = await productionService.startProductionOrder(selectedOrderId);
      
      if (success) {
        toast({
          title: "نجاح",
          description: "تم بدء أمر الإنتاج بنجاح",
          variant: "default"
        });
        
        queryClient.invalidateQueries({ queryKey: ['production_orders'] });
        queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      } else {
        toast({
          title: "خطأ",
          description: "فشل بدء أمر الإنتاج",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error starting production order:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء بدء أمر الإنتاج",
        variant: "destructive"
      });
    } finally {
      setIsConfirmDialogOpen(false);
      setSelectedOrderId(null);
      setIsProcessing(false);
    }
  };

  const handleCompleteOrder = async (id: string) => {
    try {
      setIsProcessing(true);
      
      const success = await productionService.completeProductionOrder(id);
      
      if (success) {
        toast({
          title: "نجاح",
          description: "تم إكمال أمر الإنتاج بنجاح",
          variant: "default"
        });
        
        queryClient.invalidateQueries({ queryKey: ['production_orders'] });
        queryClient.invalidateQueries({ queryKey: ['semi_finished_products'] });
      } else {
        toast({
          title: "خطأ",
          description: "فشل إكمال أمر الإنتاج",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error completing production order:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إكمال أمر الإنتاج",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrderId) return;
    
    try {
      setIsProcessing(true);
      
      const success = await productionService.cancelProductionOrder(selectedOrderId);
      
      if (success) {
        toast({
          title: "نجاح",
          description: "تم إلغاء أمر الإنتاج بنجاح",
          variant: "default"
        });
        
        queryClient.invalidateQueries({ queryKey: ['production_orders'] });
        queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      } else {
        toast({
          title: "خطأ",
          description: "فشل إلغاء أمر الإنتاج",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error cancelling production order:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء أمر الإنتاج",
        variant: "destructive"
      });
    } finally {
      setIsCancelDialogOpen(false);
      setSelectedOrderId(null);
      setIsProcessing(false);
    }
  };

  const handleConfirmClick = (id: string) => {
    setSelectedOrderId(id);
    setIsConfirmDialogOpen(true);
  };

  const handleCancelClick = (id: string) => {
    setSelectedOrderId(id);
    setIsCancelDialogOpen(true);
  };

  const exportToCsv = () => {
    if (!filteredOrders.length) {
      toast({
        title: "خطأ",
        description: "لا توجد بيانات للتصدير",
        variant: "destructive"
      });
      return;
    }
    
    const csvContent = 'ID,المنتج,الكمية,التاريخ,الحالة,ملاحظات\n' +
      filteredOrders.map(order => `"${order.id}","${order.semi_finished_name}","${order.quantity}","${order.date}","${order.status}","${order.notes || ''}"`).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `أوامر-الإنتاج-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "نجاح",
        description: "تم تحديث البيانات بنجاح",
        variant: "default"
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث البيانات",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">أوامر الإنتاج</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">أوامر الإنتاج</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-10">
                <p className="text-red-500 text-lg mb-2">حدث خطأ أثناء جلب البيانات</p>
                <Button onClick={() => refetch()}>إعادة المحاولة</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">أوامر الإنتاج</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
            <Button variant="outline" onClick={exportToCsv}>
              <FileDown className="w-4 h-4 ml-2" />
              تصدير
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="w-4 h-4 ml-2" />
              إضافة أمر إنتاج
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Tabs 
                defaultValue="all" 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="w-full max-w-md"
              >
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="all">الكل</TabsTrigger>
                  <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
                  <TabsTrigger value="in_progress">قيد التنفيذ</TabsTrigger>
                  <TabsTrigger value="completed">مكتمل</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full max-w-xs">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="بحث..." 
                  className="w-full pr-10" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-24">التاريخ</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="text-right">
                        {format(new Date(order.date), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {order.semi_finished_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.status === 'pending' && <span className="text-yellow-500">قيد الانتظار</span>}
                        {order.status === 'in_progress' && <span className="text-blue-500">قيد التنفيذ</span>}
                        {order.status === 'completed' && <span className="text-green-500">مكتمل</span>}
                        {order.status === 'cancelled' && <span className="text-red-500">ملغي</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConfirmClick(order.id)}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="h-4 w-4 ml-1" />
                              بدء التنفيذ
                            </Button>
                          )}
                          {order.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteOrder(order.id)}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="h-4 w-4 ml-1" />
                              إكمال
                            </Button>
                          )}
                          {(order.status === 'pending' || order.status === 'in_progress') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleCancelClick(order.id)}
                              disabled={isProcessing}
                            >
                              <XCircle className="h-4 w-4 ml-1" />
                              إلغاء
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      لا توجد أوامر إنتاج مسجلة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog for adding new production order */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => !isProcessing && setIsAddDialogOpen(open)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>إضافة أمر إنتاج جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="semi_finished_id">المنتج النصف مصنع</Label>
                <Select 
                  onValueChange={handleSemiFinishedChange}
                  value={formValues.semi_finished_id ? formValues.semi_finished_id.toString() : ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المنتج النصف مصنع" />
                  </SelectTrigger>
                  <SelectContent>
                    {semiFinishedProducts && semiFinishedProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} - المتاح: {product.quantity} {product.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">الكمية</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  min="1"
                  value={formValues.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date">التاريخ</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={formValues.date}
                  onChange={(e) => setFormValues(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Input 
                  id="notes" 
                  value={formValues.notes || ''}
                  onChange={(e) => setFormValues(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>المواد الخام المطلوبة</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddMaterial}
                >
                  <PlusCircle className="h-4 w-4 ml-1" />
                  إضافة مادة خام
                </Button>
              </div>
              
              <div className="border rounded-md p-4">
                {formValues.materials.length > 0 ? (
                  <div className="space-y-4">
                    {formValues.materials.map((material, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <Checkbox 
                          checked={material.selected}
                          onCheckedChange={(checked) => handleMaterialSelectionChange(index, !!checked)}
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <Label>المادة الخام</Label>
                            <Select 
                              value={material.raw_material_id.toString()}
                              onValueChange={(value) => {
                                const rawMaterial = rawMaterials?.find(rm => rm.id === parseInt(value));
                                if (rawMaterial) {
                                  setFormValues(prev => {
                                    const updatedMaterials = [...prev.materials];
                                    updatedMaterials[index] = {
                                      ...updatedMaterials[index],
                                      raw_material_id: rawMaterial.id,
                                      raw_material_name: rawMaterial.name
                                    };
                                    return { ...prev, materials: updatedMaterials };
                                  });
                                }
                              }}
                              disabled={!material.selected}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر المادة الخام" />
                              </SelectTrigger>
                              <SelectContent>
                                {rawMaterials && rawMaterials.map((rm) => (
                                  <SelectItem key={rm.id} value={rm.id.toString()}>
                                    {rm.name} - المتاح: {rm.quantity} {rm.unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>الكمية</Label>
                            <Input 
                              type="number" 
                              min="0.1" 
                              step="0.1"
                              value={material.quantity}
                              onChange={(e) => handleMaterialQuantityChange(index, e.target.value)}
                              disabled={!material.selected}
                            />
                          </div>
                          <div className="flex items-end">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveMaterial(index)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    لا توجد مواد خام محددة. يرجى اختيار منتج نصف مصنع أولاً.
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="button" 
                onClick={handleCreateOrder}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>إنشاء أمر الإنتاج</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for confirming production order */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={(open) => !isProcessing && setIsConfirmDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>بدء أمر الإنتاج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في بدء تنفيذ أمر الإنتاج؟ سيتم خصم المواد الخام من المخزون.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOrder} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  جاري البدء...
                </>
              ) : (
                <>بدء التنفيذ</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for cancelling production order */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={(open) => !isProcessing && setIsCancelDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء أمر الإنتاج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في إلغاء أمر الإنتاج؟ إذا كان الأمر قيد التنفيذ، سيتم إعادة المواد الخام إلى المخزون.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>تراجع</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={handleCancelOrder}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                <>تأكيد الإلغاء</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default ProductionOrders;
