import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import ProductionSummaryCards from '@/components/production/ProductionSummaryCards';
import { DateRangePicker } from '@/components/ui/date-range-picker';

const statusTranslations = {
  pending: 'قيد الانتظار',
  inProgress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي'
};

const statusColors = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100',
  inProgress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-100',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-100'
};

const statusIcons = {
  pending: <Clock className="h-4 w-4 mr-1" />,
  inProgress: <AlertTriangle className="h-4 w-4 mr-1" />,
  completed: <CheckCircle2 className="h-4 w-4 mr-1" />
};

// ألوان صفوف جدول أوامر الإنتاج حسب الحالة
const rowBgColors = {
  pending: 'bg-amber-50/60 dark:bg-amber-950/60',
  inProgress: 'bg-blue-50/60 dark:bg-blue-950/60',
  completed: 'bg-green-50/60 dark:bg-green-950/60',
  cancelled: 'bg-red-50/60 dark:bg-red-950/60'
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
    quantity: 0,
    notes: ''
  });
  const [newStatus, setNewStatus] = useState('');
  const [editOrder, setEditOrder] = useState<{
    id: number;
    productCode: string;
    productName: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>({
    id: 0,
    productCode: '',
    productName: '',
    quantity: 0,
    unit: '',
    notes: ''
  });
  const [ingredients, setIngredients] = useState<{
    code: string;
    name: string;
    requiredQuantity: number;
    available: boolean;
  }[]>([]);
  const [errors, setErrors] = useState<{productCode?: string; quantity?: string;}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({ from: undefined, to: undefined });
  
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
  
  const isLoadingData = isOrdersLoading || isProductsLoading || isRawMaterialsLoading;
  
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
    {
      key: 'code',
      title: 'كود الأمر',
      render: (value: string, record: ProductionOrder) => (
        <span className={`font-bold px-2 py-1 rounded whitespace-nowrap tracking-wide text-base ${rowBgColors[record.status] || ''}`} title={value}>
          {value}
        </span>
      )
    },
    {
      key: 'productName',
      title: 'المنتج',
      render: (value: string, record: ProductionOrder) => (
        <span className="font-semibold text-zinc-800 dark:text-zinc-100" title={value}>
          {value.length > 28 ? value.slice(0, 28) + '…' : value}
        </span>
      )
    },
    {
      key: 'quantity',
      title: 'الكمية',
      render: (value: number, record: ProductionOrder) => (
        <span className="font-mono text-sm" title={`${value} ${record.unit}`}>
          {value} <span className="text-muted-foreground">{record.unit}</span>
        </span>
      )
    },
    {
      key: 'status',
      title: 'الحالة',
      render: (value: string, record: ProductionOrder) => (
        <Badge className={statusColors[value as keyof typeof statusColors]} title={statusTranslations[value as keyof typeof statusTranslations]}>
          {statusIcons[value as keyof typeof statusIcons]}
          {statusTranslations[value as keyof typeof statusTranslations]}
        </Badge>
      )
    },
    {
      key: 'date',
      title: 'التاريخ',
      render: (value: string, record: ProductionOrder) => (
        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300" title={value}>
          {value?.slice(0, 10) || '-'}
        </span>
      )
    },
    {
      key: 'totalCost',
      title: 'التكلفة الإجمالية',
      render: (value: number, record: ProductionOrder) => (
        <span className="font-mono text-sm text-emerald-700 dark:text-emerald-300" title={typeof value === 'number' ? value.toFixed(2) + ' ج.م' : '0 ج.م'}>
          {typeof value === 'number'
            ? value.toFixed(2)
            : 0} <span className="text-xs">ج.م</span>
        </span>
      )
    }
  ];
  
  const handleAddOrder = async () => {
    let newErrors: {productCode?: string; quantity?: string;} = {};
    if (!newOrder.productCode) newErrors.productCode = 'يرجى اختيار المنتج';
    if (!newOrder.quantity || newOrder.quantity <= 0) newErrors.quantity = 'يرجى إدخال كمية صحيحة';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setIsLoading(true);
    const calculatedTotalCost = calculateTotalCost(newOrder.productCode, newOrder.quantity);
    console.log(`إنشاء أمر إنتاج: الكمية=${newOrder.quantity}, التكلفة المحسوبة=${calculatedTotalCost}`);
    
    // عرض مؤشر تحميل
    toast.loading("جاري إنشاء أمر الإنتاج...");
    
    const createdOrder = await productionService.createProductionOrder(
      newOrder.productCode, 
      newOrder.quantity,
      calculatedTotalCost
    );
    setIsLoading(false);
    if (createdOrder) {
      // إغلاق مؤشر التحميل
      toast.dismiss();
      
      // تحديث البيانات بعد تأخير قصير
      setTimeout(() => {
        refetchOrders();
        setNewOrder({
          productCode: '',
          quantity: 0,
          notes: ''
        });
        setIngredients([]);
        setIsAddDialogOpen(false);
        toast.success(`تم إنشاء أمر إنتاج ${createdOrder.productName} بنجاح`, {
          action: {
            label: 'عرض الأوامر',
            onClick: () => window.location.reload(),
          },
          duration: 5000
        });
      }, 300);
    } else {
      toast.dismiss();
      toast.error("فشل إنشاء أمر الإنتاج");
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
  
  const handleUpdateOrder = async () => {
    if (!editOrder.productCode || editOrder.quantity <= 0) {
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
      
      // حساب التكلفة الإجمالية الجديدة
      const calculatedTotalCost = calculateTotalCost(editOrder.productCode, editOrder.quantity);
      console.log(`تحديث أمر إنتاج: الكمية=${editOrder.quantity}, التكلفة المحسوبة=${calculatedTotalCost}`);
      
      // عرض مؤشر تحميل
      toast.loading("جاري تحديث أمر الإنتاج...");
      
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
          })),
          totalCost: calculatedTotalCost // إضافة التكلفة المحسوبة
        }
      );
      
      if (success) {
        // إغلاق نافذة التعديل
        setIsEditDialogOpen(false);
        setIngredients([]);
        
        // انتظار قليلاً ثم تحديث البيانات
        toast.dismiss();
        setTimeout(() => {
          refetchOrders();
          toast.success("تم تحديث أمر الإنتاج بنجاح");
        }, 300); // تأخير لضمان اكتمال عملية التحديث في قاعدة البيانات
      } else {
        toast.dismiss();
        toast.error("فشل تحديث أمر الإنتاج");
      }
    } catch (error) {
      toast.dismiss();
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
      {/* عرض التفاصيل */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="عرض التفاصيل"
        title="عرض التفاصيل"
        onClick={() => {
          setCurrentOrder(record);
          setIsViewDialogOpen(true);
        }}
      >
        <Eye size={18} className="text-blue-600" />
      </Button>
      {/* تحديث الحالة */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="تحديث الحالة"
        title="تحديث الحالة"
        onClick={() => {
          setCurrentOrder(record);
          setNewStatus(record.status);
          setIsStatusDialogOpen(true);
        }}
      >
        <CheckCircle2 size={18} className="text-amber-600" />
      </Button>
      {/* تعديل الأمر */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="تعديل الأمر"
        title="تعديل الأمر"
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
        <Edit size={18} className="text-emerald-700" />
      </Button>
      {/* حذف الأمر */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="حذف الأمر"
        title="حذف الأمر"
        onClick={() => {
          setCurrentOrder(record);
          setIsDeleteDialogOpen(true);
        }}
        disabled={record.status !== 'pending'}
      >
        <Trash size={18} className="text-red-600" />
      </Button>
    </div>
  );
  
  useEffect(() => {
    if (!isAddDialogOpen) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAddDialogOpen(false);
      if (e.key === 'Enter') handleAddOrder();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [isAddDialogOpen, newOrder]);

  // --- البحث داخل قائمة المنتجات ---
  const [productSearch, setProductSearch] = useState('');
  const filteredProducts = semiFinishedProducts.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  // --- حساب ملخصات أوامر الإنتاج ---
  const filteredOrders = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return orders;
    return orders.filter(order => {
      const orderDate = new Date(order.date);
      if (dateRange.from && orderDate < dateRange.from) return false;
      if (dateRange.to && orderDate > dateRange.to) return false;
      return true;
    });
  }, [orders, dateRange]);

  const summary = useMemo(() => {
    let total = filteredOrders.length;
    let pending = 0, inProgress = 0, completed = 0, cancelled = 0, totalCost = 0;
    filteredOrders.forEach((order: any) => {
      switch (order.status) {
        case 'pending': pending++; break;
        case 'inProgress': inProgress++; break;
        case 'completed': completed++; break;
        case 'cancelled': cancelled++; break;
      }
      if (typeof order.totalCost === 'number') totalCost += order.totalCost;
    });
    return { total, pending, inProgress, completed, cancelled, totalCost };
  }, [filteredOrders]);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* رأس الصفحة: العنوان والوصف في الأعلى أقصى اليمين */}
        <div className="w-full flex items-end mb-2">
          <div className="ml-auto text-end w-fit" style={{direction: 'rtl', textAlign: 'right'}}>
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 leading-tight mb-0" style={{marginBottom: 0, lineHeight: 1.2}}>أوامر الإنتاج</h1>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 mt-0">إدارة عمليات إنتاج المنتجات النصف مصنعة</span>
          </div>
        </div>

        {/* ملخصات أوامر الإنتاج + الفلترة الزمنية */}
        <div className="flex flex-col gap-2 mb-2">
          <ProductionSummaryCards
            total={filteredOrders.length}
            pending={filteredOrders.filter(o => o.status === 'pending').length}
            inProgress={filteredOrders.filter(o => o.status === 'inProgress').length}
            completed={filteredOrders.filter(o => o.status === 'completed').length}
            cancelled={filteredOrders.filter(o => o.status === 'cancelled').length}
            totalCost={filteredOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0)}
            isLoading={isOrdersLoading}
          />
          <DateRangePicker
            onUpdate={({ range }) => setDateRange(range)}
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
          />
        </div>

        {/* أزرار أعلى الجدول: إنشاء وتحديث */}
        <div className="flex justify-end items-center gap-2 mb-2">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-green-100 hover:bg-green-200 text-green-800 border border-green-200 font-semibold gap-1 flex items-center shadow-none"
            style={{ minWidth: 150 }}
          >
            <Plus size={16} /> أمر إنتاج جديد
          </Button>
          <Button
            onClick={() => refetchOrders()}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 font-semibold gap-1 flex items-center shadow-none"
            style={{ minWidth: 100 }}
          >
            <RefreshCw size={16} /> تحديث
          </Button>
        </div>

        <DataTableWithLoading
          columns={columns}
          data={filteredOrders}
          isLoading={isLoadingData}
          actions={renderActions}
        />
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl">
            <DialogHeader>
              <DialogTitle>إضافة أمر إنتاج جديد</DialogTitle>
              <DialogDescription>
                اختر المنتج النصف مصنع وحدد الكمية المطلوب إنتاجها.
              </DialogDescription>
            </DialogHeader>
            {/* ملخص مختصر أعلى النموذج */}
            {newOrder.productCode && newOrder.quantity > 0 && (
              <div className="mb-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-center gap-2">
                <span>ستنتج</span>
                <span className="font-bold">{newOrder.quantity}</span>
                <span>{semiFinishedProducts.find(p => p.code === newOrder.productCode)?.unit || ''}</span>
                <span>من</span>
                <span className="font-bold">{semiFinishedProducts.find(p => p.code === newOrder.productCode)?.name || ''}</span>
              </div>
            )}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="product">المنتج <span className='text-red-500'>*</span></Label>
                  {/* مربع البحث */}
                  <Input
                    id="product-search"
                    className="h-9 text-sm mb-1"
                    placeholder="ابحث باسم المنتج أو الكود..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                  />
                  <Select 
                    value={newOrder.productCode} 
                    onValueChange={value => setNewOrder({...newOrder, productCode: value})}
                  >
                    <SelectTrigger id="product" className={`h-10 text-sm ${errors.productCode ? 'border-red-500' : ''}`}> 
                      <SelectValue placeholder="اختر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map(product => (
                        <SelectItem key={product.code} value={product.code} className="text-sm">
                          {product.name} [{product.unit}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-400">حدد المنتج النصف مصنع المراد إنتاجه</span>
                  {errors.productCode && <span className="text-xs text-red-500">{errors.productCode}</span>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">الكمية <span className='text-red-500'>*</span></Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    className={`h-10 text-sm ${errors.quantity ? 'border-red-500' : ''}`}
                    value={newOrder.quantity}
                    onChange={e => setNewOrder({...newOrder, quantity: Number(e.target.value)})}
                    placeholder="أدخل الكمية المطلوبة"
                  />
                  <span className="text-xs text-gray-400">الكمية المراد إنتاجها</span>
                  {errors.quantity && <span className="text-xs text-red-500">{errors.quantity}</span>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">الوحدة</Label>
                  <Input
                    id="unit"
                    className="h-10 text-sm"
                    value={semiFinishedProducts.find(p => p.code === newOrder.productCode)?.unit || ''}
                    disabled
                    placeholder="الوحدة"
                  />
                  <span className="text-xs text-gray-400">الوحدة الافتراضية للمنتج</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                <textarea
                  id="notes"
                  className="h-20 text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="يمكنك إضافة أي ملاحظات متعلقة بأمر الإنتاج"
                  value={newOrder.notes || ''}
                  onChange={e => setNewOrder({...newOrder, notes: e.target.value})}
                />
              </div>
              {newOrder.productCode && newOrder.quantity > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">المكونات المطلوبة:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border rounded-md">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-zinc-800">
                          <th className="p-2 border">المادة الخام</th>
                          <th className="p-2 border">الكمية المطلوبة</th>
                          <th className="p-2 border">الكمية المتوفرة</th>
                          <th className="p-2 border">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map(ingredient => {
                          const availableQty = rawMaterials.find(r => r.code === ingredient.code)?.quantity || 0;
                          const rowClass = ingredient.available ? 'bg-green-50 dark:bg-green-900/60' : 'bg-red-50 dark:bg-red-900/60';
                          return (
                            <tr key={ingredient.code} className={rowClass}>
                              <td className="p-2 border font-medium">{ingredient.name}</td>
                              <td className="p-2 border">{ingredient.requiredQuantity.toFixed(2)}</td>
                              <td className="p-2 border">{availableQty.toFixed(2)}</td>
                              <td className="p-2 border flex items-center gap-1">
                                {ingredient.available ? (
                                  <>
                                    <span className="inline-block w-4 h-4 text-green-600">✓</span>
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-100">متوفر</Badge>
                                  </>
                                ) : (
                                  <>
                                    <span className="inline-block w-4 h-4 text-red-600">✗</span>
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-100">غير متوفر</Badge>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!ingredients.every(i => i.available) && (
                    <div className="mt-2 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700 rounded-md p-2 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      بعض المكونات غير متوفرة بالكميات المطلوبة. يمكنك المتابعة ولكن سيتم حفظ الأمر كمسودة.
                    </div>
                  )}
                  <div className="mt-4 p-2 border rounded-md bg-muted/50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 flex justify-between">
                    <span className="font-medium">التكلفة الإجمالية:</span>
                    <span>{calculateTotalCost(newOrder.productCode, newOrder.quantity).toFixed(2)} ج.م</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddOrder} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 flex items-center justify-center" disabled={isLoading}>
                {isLoading && <span className="loader mr-2"></span>}
                إضافة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl">
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
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-100">متوفر</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-100">غير متوفر</Badge>
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
                {/* ملخص سريع للأمر */}
                <div className="bg-gray-50 dark:bg-zinc-800 rounded-md p-3 flex flex-col md:flex-row md:items-center md:space-x-6 rtl:space-x-reverse border mb-2">
                  <span className="font-semibold">{currentOrder.productName}</span>
                  <span className="text-sm text-muted-foreground">رقم الأمر: {currentOrder.code}</span>
                  <span className="text-sm text-muted-foreground">الكمية: {currentOrder.quantity} {currentOrder.unit}</span>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">الحالة</Label>
                  <div className="flex flex-row gap-3 mt-1">
                    {[
                      { value: 'pending', label: 'قيد الانتظار', color: 'bg-amber-400', icon: <span className='w-2 h-2 rounded-full bg-amber-400 mr-2 inline-block' /> },
                      { value: 'inProgress', label: 'قيد التنفيذ', color: 'bg-blue-400', icon: <span className='w-2 h-2 rounded-full bg-blue-400 mr-2 inline-block' /> },
                      { value: 'completed', label: 'مكتمل', color: 'bg-green-500', icon: <span className='w-2 h-2 rounded-full bg-green-500 mr-2 inline-block' /> },
                      { value: 'cancelled', label: 'ملغي', color: 'bg-red-500', icon: <span className='w-2 h-2 rounded-full bg-red-500 mr-2 inline-block' /> },
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`flex items-center px-4 py-2 rounded-md border transition-colors focus:outline-none text-sm font-medium shadow-sm ${
                          newStatus === option.value
                            ? `${option.color} text-white border-2 border-emerald-600`
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:border-emerald-400'
                        }`}
                        onClick={() => setNewStatus(option.value)}
                        aria-pressed={newStatus === option.value}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* حقل ملاحظات عند الإلغاء أو الاكتمال */}
                {(newStatus === 'completed' || newStatus === 'cancelled') && (
                  <div className="grid gap-2">
                    <Label htmlFor="status-notes">ملاحظات (اختياري)</Label>
                    <Input
                      id="status-notes"
                      type="text"
                      placeholder={newStatus === 'completed' ? 'مثال: تم الإنتاج بنجاح' : 'سبب الإلغاء'}
                      value={currentOrder.notes || ''}
                      onChange={e => setCurrentOrder({...currentOrder, notes: e.target.value})}
                    />
                  </div>
                )}
                {/* تحذير عند الاكتمال */}
                {newStatus === 'completed' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/40 p-4 rounded-md text-yellow-800 dark:text-yellow-100">
                    <h4 className="font-medium mb-1">تنبيه</h4>
                    <p className="text-sm">
                      عند تحديث الحالة إلى "مكتمل"، سيتم خصم المواد الأولية من المخزون وإضافة المنتج النصف مصنع.
                    </p>
                  </div>
                )}
                {/* تحذير عند الإلغاء */}
                {newStatus === 'cancelled' && (
                  <div className="bg-red-50 dark:bg-red-900/40 p-4 rounded-md text-red-800 dark:text-red-100">
                    <h4 className="font-medium mb-1">تنبيه</h4>
                    <p className="text-sm">
                      عند إلغاء الأمر، لن يتم خصم أي مواد ولن يتم إضافة منتجات جديدة.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleUpdateStatus} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                تحديث الحالة
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
          <DialogContent className="max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl">
            <DialogHeader>
              <DialogTitle>تعديل أمر إنتاج</DialogTitle>
              <DialogDescription>
                قم بتعديل بيانات أمر الإنتاج ثم اضغط على تحديث للحفظ.
              </DialogDescription>
            </DialogHeader>
            {/* ملخص مختصر */}
            {editOrder.productCode && editOrder.quantity > 0 && (
              <div className="mb-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-center gap-2">
                <span>ستعدل أمر إنتاج لـ</span>
                <span className="font-bold">{editOrder.quantity}</span>
                <span>{semiFinishedProducts.find(p => p.code === editOrder.productCode)?.unit || ''}</span>
                <span>من</span>
                <span className="font-bold">{semiFinishedProducts.find(p => p.code === editOrder.productCode)?.name || ''}</span>
              </div>
            )}
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-product">المنتج <span className='text-red-500'>*</span></Label>
                  <Select
                    value={editOrder.productCode}
                    onValueChange={value => setEditOrder({...editOrder, productCode: value, unit: semiFinishedProducts.find(p => p.code === value)?.unit || '' })}
                  >
                    <SelectTrigger id="edit-product" className="h-10 text-sm">
                      <SelectValue placeholder="اختر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      {semiFinishedProducts.map(product => (
                        <SelectItem key={product.code} value={product.code} className="text-sm">
                          {product.name} [{product.unit}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-400">حدد المنتج النصف مصنع</span>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-quantity">الكمية <span className='text-red-500'>*</span></Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    min={1}
                    className="h-10 text-sm"
                    value={editOrder.quantity}
                    onChange={e => setEditOrder({...editOrder, quantity: Number(e.target.value)})}
                    placeholder="أدخل الكمية المطلوبة"
                  />
                  <span className="text-xs text-gray-400">الكمية المراد إنتاجها</span>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit">الوحدة</Label>
                  <Input
                    id="edit-unit"
                    className="h-10 text-sm"
                    value={semiFinishedProducts.find(p => p.code === editOrder.productCode)?.unit || ''}
                    disabled
                    placeholder="الوحدة"
                  />
                  <span className="text-xs text-gray-400">الوحدة الافتراضية للمنتج</span>
                </div>
              </div>
              {/* ملاحظات إضافية */}
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">ملاحظات إضافية (اختياري)</Label>
                <textarea
                  id="edit-notes"
                  className="h-20 text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="يمكنك إضافة أي ملاحظات متعلقة بأمر الإنتاج"
                  value={editOrder.notes || ''}
                  onChange={e => setEditOrder({...editOrder, notes: e.target.value})}
                />
              </div>
              {/* المكونات المطلوبة */}
              {editOrder.productCode && editOrder.quantity > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">المكونات المطلوبة:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border rounded-md">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-zinc-800">
                          <th className="p-2 border">المادة الخام</th>
                          <th className="p-2 border">الكمية المطلوبة</th>
                          <th className="p-2 border">الكمية المتوفرة</th>
                          <th className="p-2 border">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map(ingredient => {
                          const availableQty = rawMaterials.find(r => r.code === ingredient.code)?.quantity || 0;
                          const rowClass = ingredient.available ? 'bg-green-50 dark:bg-green-900/60' : 'bg-red-50 dark:bg-red-900/60';
                          return (
                            <tr key={ingredient.code} className={rowClass}>
                              <td className="p-2 border font-medium">{ingredient.name}</td>
                              <td className="p-2 border">{ingredient.requiredQuantity.toFixed(2)}</td>
                              <td className="p-2 border">{availableQty.toFixed(2)}</td>
                              <td className="p-2 border flex items-center gap-1">
                                {ingredient.available ? (
                                  <>
                                    <span className="inline-block w-4 h-4 text-green-600">✓</span>
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-100">متوفر</Badge>
                                  </>
                                ) : (
                                  <>
                                    <span className="inline-block w-4 h-4 text-red-600">✗</span>
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-100">غير متوفر</Badge>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!ingredients.every(i => i.available) && (
                    <div className="mt-2 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700 rounded-md p-2 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      بعض المكونات غير متوفرة بالكميات المطلوبة. يمكنك المتابعة ولكن سيتم حفظ الأمر كمسودة.
                    </div>
                  )}
                  <div className="mt-4 p-2 border rounded-md bg-muted/50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 flex justify-between">
                    <span className="font-medium">التكلفة الإجمالية:</span>
                    <span>{calculateTotalCost(editOrder.productCode, editOrder.quantity).toFixed(2)} ج.م</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                <span className="flex items-center gap-1"><Trash size={16} /> إلغاء</span>
              </Button>
              <Button onClick={handleUpdateOrder} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 flex items-center justify-center">
                <span className="flex items-center gap-1"><CheckCircle2 size={16} /> تحديث</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default ProductionOrders;
