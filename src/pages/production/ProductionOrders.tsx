
import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, Edit, Eye, Plus, Trash, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import ProductionService from '@/services/ProductionService';
import InventoryService from '@/services/InventoryService';
import { ProductionOrder } from '@/services/ProductionService';
import { SemiFinishedProduct, RawMaterial } from '@/services/InventoryService';
import { useQuery } from '@tanstack/react-query';

const statusTranslations = {
  pending: 'قيد الانتظار',
  inProgress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي'
};

const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  inProgress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusIcons = {
  pending: <Clock className="h-4 w-4 mr-1" />,
  inProgress: <AlertTriangle className="h-4 w-4 mr-1" />,
  completed: <CheckCircle2 className="h-4 w-4 mr-1" />
};

const ProductionOrders = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<ProductionOrder | null>(null);
  const [newOrder, setNewOrder] = useState({
    productCode: '',
    quantity: 0
  });
  const [newStatus, setNewStatus] = useState('');
  const [editOrder, setEditOrder] = useState({
    id: 0,
    productCode: '',
    productName: '',
    quantity: 0,
    unit: ''
  });
  const [ingredients, setIngredients] = useState<{
    code: string;
    name: string;
    requiredQuantity: number;
    available: boolean;
  }[]>([]);
  
  const productionService = ProductionService.getInstance();
  const inventoryService = InventoryService.getInstance();
  
  const { 
    data: orders = [], 
    isLoading: isOrdersLoading,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ['productionOrders'],
    queryFn: async () => {
      try {
        return await productionService.getProductionOrders();
      } catch (error) {
        console.error("Error loading production orders:", error);
        toast.error("حدث خطأ أثناء تحميل أوامر الإنتاج");
        return [];
      }
    }
  });
  
  const { 
    data: semiFinishedProducts = [], 
    isLoading: isProductsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      try {
        return await inventoryService.getSemiFinishedProducts();
      } catch (error) {
        console.error("Error loading semi-finished products:", error);
        toast.error("حدث خطأ أثناء تحميل المنتجات النصف مصنعة");
        return [];
      }
    }
  });
  
  const {
    data: rawMaterials = [],
    isLoading: isRawMaterialsLoading
  } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: async () => {
      try {
        return await inventoryService.getRawMaterials();
      } catch (error) {
        console.error("Error loading raw materials:", error);
        toast.error("حدث خطأ أثناء تحميل المواد الأولية");
        return [];
      }
    }
  });
  
  const isLoading = isOrdersLoading || isProductsLoading || isRawMaterialsLoading;
  
  const refreshData = useCallback(() => {
    refetchOrders();
    refetchProducts();
    toast.info("جاري تحديث البيانات...");
  }, [refetchOrders, refetchProducts]);
  
  // دالة لفحص توافر المكونات في الوقت الفعلي
  const checkRealTimeAvailability = useCallback(async (productCode: string, quantity: number) => {
    if (!productCode || quantity <= 0) {
      setIngredients([]);
      return;
    }
    
    try {
      const product = semiFinishedProducts.find(p => p.code === productCode);
      
      if (!product) {
        setIngredients([]);
        return;
      }
      
      // حساب الكميات المطلوبة من المواد الأولية وفحص توافرها
      const calculatedIngredients = await Promise.all(product.ingredients.map(async (ingredient) => {
        const requiredQuantity = (ingredient.percentage / 100) * quantity;
        const inventoryItem = rawMaterials.find(item => item.code === ingredient.code);
        const available = inventoryItem ? inventoryItem.quantity >= requiredQuantity : false;
        
        return {
          code: ingredient.code,
          name: ingredient.name,
          requiredQuantity,
          available
        };
      }));
      
      setIngredients(calculatedIngredients);
    } catch (error) {
      console.error("Error checking ingredients availability:", error);
      setIngredients([]);
    }
  }, [semiFinishedProducts, rawMaterials]);
  
  // مراقبة التغييرات في المنتج المحدد أو الكمية لتحديث توفر المكونات
  useEffect(() => {
    if (newOrder.productCode && newOrder.quantity > 0) {
      checkRealTimeAvailability(newOrder.productCode, newOrder.quantity);
    }
  }, [newOrder.productCode, newOrder.quantity, checkRealTimeAvailability]);
  
  // نفس الشيء لنموذج التعديل
  useEffect(() => {
    if (editOrder.productCode && editOrder.quantity > 0) {
      checkRealTimeAvailability(editOrder.productCode, editOrder.quantity);
    }
  }, [editOrder.productCode, editOrder.quantity, checkRealTimeAvailability]);
  
  const columns = [
    { key: 'code', title: 'كود الأمر' },
    { key: 'productName', title: 'المنتج' },
    { 
      key: 'quantity', 
      title: 'الكمية',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { 
      key: 'status', 
      title: 'الحالة',
      render: (value: string) => (
        <Badge className={statusColors[value as keyof typeof statusColors]}>
          {statusIcons[value as keyof typeof statusIcons]}
          {statusTranslations[value as keyof typeof statusTranslations]}
        </Badge>
      )
    },
    { key: 'date', title: 'التاريخ' },
    { 
      key: 'totalCost', 
      title: 'التكلفة الإجمالية',
      render: (value: number) => `${typeof value === 'number' ? value.toFixed(2) : 0} ج.م`
    }
  ];
  
  const handleAddOrder = async () => {
    if (!newOrder.productCode || newOrder.quantity <= 0) {
      toast.error("يجب اختيار منتج وتحديد كمية صحيحة");
      return;
    }
    
    try {
      // التحقق من توفر جميع المكونات
      const allAvailable = ingredients.every(i => i.available);
      if (!allAvailable) {
        const confirmation = window.confirm("بعض المكونات غير متوفرة بالكمية المطلوبة. هل ترغب في المتابعة على أي حال؟");
        if (!confirmation) {
          return;
        }
      }
      
      const createdOrder = await productionService.createProductionOrder(newOrder.productCode, newOrder.quantity);
      if (createdOrder) {
        refetchOrders();
        setNewOrder({
          productCode: '',
          quantity: 0
        });
        setIngredients([]);
        setIsAddDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("حدث خطأ أثناء إنشاء أمر الإنتاج");
    }
  };
  
  const handleUpdateStatus = async () => {
    if (!currentOrder || !newStatus) return;
    
    try {
      const success = await productionService.updateProductionOrderStatus(
        currentOrder.id, 
        newStatus as 'pending' | 'inProgress' | 'completed' | 'cancelled'
      );
      if (success) {
        refetchOrders();
        setIsStatusDialogOpen(false);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة أمر الإنتاج");
    }
  };
  
  const handleDeleteOrder = async () => {
    if (!currentOrder) return;
    
    try {
      const success = await productionService.deleteProductionOrder(currentOrder.id);
      if (success) {
        refetchOrders();
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("حدث خطأ أثناء حذف أمر الإنتاج");
    }
  };
  
  const handleEditOrder = async () => {
    if (!editOrder.id || !editOrder.productCode || editOrder.quantity <= 0) {
      toast.error("يجب اختيار منتج وتحديد كمية صحيحة");
      return;
    }
    
    try {
      // التحقق من توفر جميع المكونات
      const allAvailable = ingredients.every(i => i.available);
      if (!allAvailable) {
        const confirmation = window.confirm("بعض المكونات غير متوفرة بالكمية المطلوبة. هل ترغب في المتابعة على أي حال؟");
        if (!confirmation) {
          return;
        }
      }
      
      const success = await productionService.updateProductionOrder(
        editOrder.id,
        {
          productCode: editOrder.productCode,
          productName: semiFinishedProducts.find(p => p.code === editOrder.productCode)?.name || '',
          quantity: editOrder.quantity,
          unit: editOrder.unit,
          ingredients: ingredients.map(ing => ({
            code: ing.code,
            name: ing.name,
            requiredQuantity: ing.requiredQuantity
          }))
        }
      );
      
      if (success) {
        refetchOrders();
        setIngredients([]);
        setIsEditDialogOpen(false);
        toast.success("تم تحديث أمر الإنتاج بنجاح");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("حدث خطأ أثناء تحديث أمر الإنتاج");
    }
  };
  
  const calculateTotalCost = (productCode: string, quantity: number) => {
    const product = semiFinishedProducts.find(p => p.code === productCode);
    if (!product) return 0;
    
    return product.unit_cost * quantity;
  };
  
  const renderActions = (record: ProductionOrder) => (
    <div className="flex space-x-2 rtl:space-x-reverse">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentOrder(record);
          setIsViewDialogOpen(true);
        }}
      >
        <Eye size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentOrder(record);
          setNewStatus(record.status);
          setIsStatusDialogOpen(true);
        }}
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setEditOrder({
            id: record.id,
            productCode: record.productCode,
            productName: record.productName,
            quantity: record.quantity,
            unit: record.unit
          });
          // تحديث توافر المكونات
          checkRealTimeAvailability(record.productCode, record.quantity);
          setIsEditDialogOpen(true);
        }}
        disabled={record.status !== 'pending'}
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentOrder(record);
          setIsDeleteDialogOpen(true);
        }}
        disabled={record.status !== 'pending'}
      >
        <Trash size={16} />
      </Button>
    </div>
  );
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">أوامر الإنتاج</h1>
            <p className="text-muted-foreground mt-1">إدارة عمليات إنتاج المنتجات النصف مصنعة</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshData}>
              <RefreshCw size={16} className="ml-2" />
              تحديث
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus size={18} className="mr-2" />
                  أمر إنتاج جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>إضافة أمر إنتاج جديد</DialogTitle>
                  <DialogDescription>
                    اختر المنتج النصف مصنع وحدد الكمية المطلوب إنتاجها.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="product">المنتج</Label>
                      <Select 
                        value={newOrder.productCode} 
                        onValueChange={value => setNewOrder({...newOrder, productCode: value})}
                      >
                        <SelectTrigger id="product">
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
                    <div className="grid gap-2">
                      <Label htmlFor="quantity">الكمية</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={newOrder.quantity}
                        onChange={e => setNewOrder({...newOrder, quantity: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  {newOrder.productCode && newOrder.quantity > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2">المكونات المطلوبة:</h4>
                      <div className="space-y-2">
                        {ingredients.map(ingredient => (
                          <div key={ingredient.code} className="flex justify-between p-2 border rounded-md">
                            <div>
                              <span className="font-medium">{ingredient.name}</span>
                              <span className="text-sm text-muted-foreground mr-2">
                                ({ingredient.requiredQuantity.toFixed(2)})
                              </span>
                            </div>
                            {ingredient.available ? (
                              <Badge className="bg-green-100 text-green-800">متوفر</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">غير متوفر</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-2 border rounded-md bg-muted/50">
                        <div className="flex justify-between">
                          <span className="font-medium">التكلفة الإجمالية:</span>
                          <span>{calculateTotalCost(newOrder.productCode, newOrder.quantity).toFixed(2)} ج.م</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleAddOrder}>
                    إضافة
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <DataTableWithLoading
          columns={columns}
          data={orders}
          searchable
          searchKeys={['code', 'productName']}
          actions={renderActions}
          isLoading={isLoading}
        />
        
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل أمر الإنتاج</DialogTitle>
            </DialogHeader>
            {currentOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">كود الأمر</h4>
                    <p className="font-medium">{currentOrder.code}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">التاريخ</h4>
                    <p className="font-medium">{currentOrder.date}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">المنتج</h4>
                    <p className="font-medium">{currentOrder.productName}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">الكمية</h4>
                    <p className="font-medium">{currentOrder.quantity} {currentOrder.unit}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">الحالة</h4>
                    <Badge className={statusColors[currentOrder.status as keyof typeof statusColors]}>
                      {statusIcons[currentOrder.status as keyof typeof statusIcons]}
                      {statusTranslations[currentOrder.status as keyof typeof statusTranslations]}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">التكلفة الإجمالية</h4>
                    <p className="font-medium">
                      {typeof currentOrder.totalCost === 'number' 
                        ? `${currentOrder.totalCost.toFixed(2)} ج.م` 
                        : '0 ج.م'}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">المكونات المطلوبة:</h4>
                  <div className="space-y-2">
                    {currentOrder.ingredients.map((ingredient) => (
                      <div key={ingredient.code} className="flex justify-between p-2 border rounded-md">
                        <div>
                          <span className="font-medium">{ingredient.name}</span>
                          <span className="text-sm text-muted-foreground mr-2">
                            ({ingredient.requiredQuantity.toFixed(2)})
                          </span>
                        </div>
                        {ingredient.available ? (
                          <Badge className="bg-green-100 text-green-800">متوفر</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">غير متوفر</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsViewDialogOpen(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تحديث حالة أمر الإنتاج</DialogTitle>
              <DialogDescription>
                تحديث حالة أمر الإنتاج {currentOrder?.code}
              </DialogDescription>
            </DialogHeader>
            {currentOrder && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">الحالة</Label>
                  <Select 
                    value={newStatus} 
                    onValueChange={setNewStatus}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="inProgress">قيد التنفيذ</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="cancelled">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {newStatus === 'completed' && (
                  <div className="bg-yellow-50 p-4 rounded-md text-yellow-800">
                    <h4 className="font-medium mb-1">تنبيه</h4>
                    <p className="text-sm">
                      عند تحديث الحالة إلى "مكتمل"، سيتم خصم المواد الأولية من المخزون وإضافة المنتج النصف مصنع.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleUpdateStatus}>
                تحديث
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف أمر إنتاج</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف أمر الإنتاج؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            {currentOrder && (
              <div className="py-4">
                <p className="font-medium">{currentOrder.code} - {currentOrder.productName}</p>
                <p className="text-sm text-muted-foreground">الكمية: {currentOrder.quantity} {currentOrder.unit}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button variant="destructive" onClick={handleDeleteOrder}>
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>تعديل أمر إنتاج</DialogTitle>
              <DialogDescription>
                تعديل بيانات أمر الإنتاج
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-product">المنتج</Label>
                  <Select 
                    value={editOrder.productCode} 
                    onValueChange={value => setEditOrder({...editOrder, productCode: value})}
                  >
                    <SelectTrigger id="edit-product">
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
                <div className="grid gap-2">
                  <Label htmlFor="edit-quantity">الكمية</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={editOrder.quantity}
                    onChange={e => setEditOrder({...editOrder, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit">الوحدة</Label>
                  <Input
                    id="edit-unit"
                    value={editOrder.unit}
                    onChange={e => setEditOrder({...editOrder, unit: e.target.value})}
                  />
                </div>
              </div>
              
              {editOrder.productCode && editOrder.quantity > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">المكونات المطلوبة:</h4>
                  <div className="space-y-2">
                    {ingredients.map(ingredient => (
                      <div key={ingredient.code} className="flex justify-between p-2 border rounded-md">
                        <div>
                          <span className="font-medium">{ingredient.name}</span>
                          <span className="text-sm text-muted-foreground mr-2">
                            ({ingredient.requiredQuantity.toFixed(2)})
                          </span>
                        </div>
                        {ingredient.available ? (
                          <Badge className="bg-green-100 text-green-800">متوفر</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">غير متوفر</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-2 border rounded-md bg-muted/50">
                    <div className="flex justify-between">
                      <span className="font-medium">التكلفة الإجمالية:</span>
                      <span>{calculateTotalCost(editOrder.productCode, editOrder.quantity).toFixed(2)} ج.م</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEditOrder}>
                تحديث
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default ProductionOrders;
