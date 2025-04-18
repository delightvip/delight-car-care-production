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
import { toast } from 'sonner';
import ProductionService from '@/services/ProductionService';
import InventoryService from '@/services/InventoryService';
import { PackagingOrder } from '@/services/ProductionService';
import { FinishedProduct } from '@/services/InventoryService';
import { useQuery } from '@tanstack/react-query';
import PackagingSummaryCards from '@/components/inventory/packaging/PackagingSummaryCards';
import { DateRangePicker } from '@/components/ui/date-range-picker';

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

const PackagingOrders = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PackagingOrder | null>(null);
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
  const [componentsAvailability, setComponentsAvailability] = useState<{
    code: string;
    name: string;
    requiredQuantity: number;
    available: boolean;
    unit: string;
    type: string;
  }[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({ from: undefined, to: undefined });

  const productionService = ProductionService.getInstance();
  const inventoryService = InventoryService.getInstance();

  const { 
    data: orders = [], 
    isLoading: isOrdersLoading,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ['packagingOrders'],
    queryFn: async () => {
      try {
        return await productionService.getPackagingOrders();
      } catch (error) {
        console.error("Error loading packaging orders:", error);
        toast.error("حدث خطأ أثناء تحميل أوامر التعبئة");
        return [];
      }
    }
  });

  const { 
    data: finishedProducts = [], 
    isLoading: isProductsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: async () => {
      try {
        const products = await inventoryService.getFinishedProducts();
        console.log("Fetched finished products:", products);
        return products;
      } catch (error) {
        console.error("Error loading finished products:", error);
        toast.error("حدث خطأ أثناء تحميل المنتجات النهائية");
        return [];
      }
    }
  });

  const isLoading = isOrdersLoading || isProductsLoading;

  const filteredOrders = dateRange.from && dateRange.to
    ? orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= dateRange.from && orderDate <= dateRange.to;
      })
    : orders;

  const summary = {
    total: filteredOrders.length,
    pending: filteredOrders.filter(o => o.status === 'pending').length,
    inProgress: filteredOrders.filter(o => o.status === 'inProgress').length,
    completed: filteredOrders.filter(o => o.status === 'completed').length,
    cancelled: filteredOrders.filter(o => o.status === 'cancelled').length,
    totalCost: filteredOrders.reduce((sum, o) => sum + (typeof o.totalCost === 'number' ? o.totalCost : 0), 0),
    isLoading,
    dateRange
  };

  const refreshData = useCallback(() => {
    refetchOrders();
    refetchProducts();
    toast.info("جاري تحديث البيانات...");
  }, [refetchOrders, refetchProducts]);

  // دالة لفحص توافر المكونات في الوقت الفعلي
  const checkRealTimeAvailability = useCallback(async (productCode: string, quantity: number) => {
    if (!productCode || quantity <= 0) {
      setComponentsAvailability([]);
      return;
    }
    
    const product = finishedProducts.find(p => p.code === productCode);
    if (!product) {
      setComponentsAvailability([]);
      return;
    }
    
    // التحقق من توفر المنتج النصف مصنع
    const semiFinishedCode = product.semiFinished.code;
    const semiFinishedQuantity = product.semiFinished.quantity * quantity;
    const semiAvailable = await inventoryService.checkSemiFinishedAvailability(semiFinishedCode, semiFinishedQuantity);
    
    // التحقق من توفر مواد التعبئة
    const packagingRequirements = product.packaging.map(pkg => ({
      code: pkg.code,
      requiredQuantity: pkg.quantity * quantity
    }));
    
    const packagingAvailabilityResults = await Promise.all(
      product.packaging.map(async (pkg) => {
        const pkgQuantity = pkg.quantity * quantity;
        const available = await inventoryService.checkPackagingAvailability([{
          code: pkg.code,
          requiredQuantity: pkgQuantity
        }]);
        
        return {
          code: pkg.code,
          name: pkg.name,
          requiredQuantity: pkgQuantity,
          available,
          unit: 'وحدة',
          type: 'packaging'
        };
      })
    );
    
    // تجميع نتائج التوافر
    const availabilityResults = [
      {
        code: product.semiFinished.code,
        name: product.semiFinished.name,
        requiredQuantity: semiFinishedQuantity,
        available: semiAvailable,
        unit: 'وحدة',
        type: 'semi'
      },
      ...packagingAvailabilityResults
    ];
    
    setComponentsAvailability(availabilityResults);
  }, [finishedProducts, inventoryService]);

  // مراقبة التغييرات في المنتج المحدد أو الكمية لتحديث توفر المكونات
  useEffect(() => {
    if (newOrder.productCode && newOrder.quantity > 0) {
      checkRealTimeAvailability(newOrder.productCode, newOrder.quantity);
    }
  }, [newOrder.productCode, newOrder.quantity, checkRealTimeAvailability]);

  // نفس الشيء للنموذج التعديل
  useEffect(() => {
    if (editOrder.productCode && editOrder.quantity > 0) {
      checkRealTimeAvailability(editOrder.productCode, editOrder.quantity);
    }
  }, [editOrder.productCode, editOrder.quantity, checkRealTimeAvailability]);

  // تطوير جدول أوامر التعبئة ليطابق جدول أوامر الإنتاج
  const columns = [
    {
      key: 'code',
      title: 'كود الأمر',
      render: (value: string, record: PackagingOrder) => (
        <span className={`font-bold px-2 py-1 rounded whitespace-nowrap tracking-wide text-base ${statusColors[record.status as keyof typeof statusColors] || ''}`} title={value}>
          {value}
        </span>
      )
    },
    {
      key: 'productName',
      title: 'المنتج',
      render: (value: string, record: PackagingOrder) => (
        <span className="font-semibold text-zinc-800 dark:text-zinc-100" title={value}>
          {value.length > 28 ? value.slice(0, 28) + '…' : value}
        </span>
      )
    },
    {
      key: 'quantity',
      title: 'الكمية',
      render: (value: number, record: PackagingOrder) => (
        <span className="font-mono text-sm" title={`${value} ${record.unit}`}>
          {value} <span className="text-muted-foreground">{record.unit}</span>
        </span>
      )
    },
    {
      key: 'status',
      title: 'الحالة',
      render: (value: string, record: PackagingOrder) => (
        <Badge className={statusColors[value as keyof typeof statusColors]} title={statusTranslations[value as keyof typeof statusTranslations]}>
          {statusIcons[value as keyof typeof statusIcons]}
          {statusTranslations[value as keyof typeof statusTranslations]}
        </Badge>
      )
    },
    {
      key: 'date',
      title: 'التاريخ',
      render: (value: string, record: PackagingOrder) => (
        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300" title={value}>
          {value?.slice(0, 10) || '-'}
        </span>
      )
    },
    {
      key: 'totalCost',
      title: 'التكلفة الإجمالية',
      render: (value: number, record: PackagingOrder) => (
        <span className="font-mono text-sm text-emerald-700 dark:text-emerald-300" title={typeof value === 'number' ? value.toFixed(2) + ' ج.م' : '0 ج.م'}>
          {typeof value === 'number'
            ? value.toFixed(2)
            : 0} <span className="text-xs">ج.م</span>
        </span>
      )
    }
  ];

  const handleAddOrder = async () => {
    if (!newOrder.productCode || newOrder.quantity <= 0) {
      toast.error("يجب اختيار منتج وتحديد كمية صحيحة");
      return;
    }
    
    try {
      // التحقق من توفر جميع المكونات
      const allAvailable = componentsAvailability.every(item => item.available);
      if (!allAvailable) {
        const confirmation = window.confirm("بعض المكونات غير متوفرة. هل ترغب في المتابعة على أي حال؟");
        if (!confirmation) {
          return;
        }
      }
      
      // حساب التكلفة الإجمالية للأمر الجديد
      const calculatedTotalCost = calculateTotalCost(newOrder.productCode, newOrder.quantity);
      console.log(`إنشاء أمر تعبئة: الكمية=${newOrder.quantity}, التكلفة المحسوبة=${calculatedTotalCost}`);
      
      // إظهار مؤشر تحميل
      toast.loading("جاري إنشاء أمر التعبئة...");
      
      // إضافة جلسة محاولة لضمان نجاح العملية
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;
      let errorMsg = "";
      
      while (attempts < maxAttempts && !success) {
        try {
          const createdOrder = await productionService.createPackagingOrder(
            newOrder.productCode, 
            newOrder.quantity,
            calculatedTotalCost // إضافة التكلفة المحسوبة
          );
          
          if (createdOrder) {
            success = true;
            // تجنب استدعاء مباشر لـ refetchOrders قبل إغلاق نافذة الحوار
            toast.dismiss();
            setTimeout(() => {
              refetchOrders();
              setNewOrder({
                productCode: '',
                quantity: 0
              });
              setComponentsAvailability([]);
              toast.success(`تم إنشاء أمر تعبئة ${createdOrder.productName} بنجاح`);
              setIsAddDialogOpen(false);
            }, 300);
          }
        } catch (innerError: any) {
          attempts++;
          errorMsg = innerError?.message || "حدث خطأ أثناء إنشاء أمر التعبئة";
          if (attempts < maxAttempts) {
            console.log(`محاولة إنشاء أمر التعبئة: ${attempts}/${maxAttempts}`);
            // انتظر قليلاً قبل المحاولة مرة أخرى
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!success) {
        toast.dismiss();
        toast.error(errorMsg || "حدث خطأ أثناء إنشاء أمر التعبئة");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error creating order:", error);
      toast.error("حدث خطأ أثناء إنشاء أمر التعبئة");
    }
  };

  const handleUpdateStatus = async () => {
    if (!currentOrder || !newStatus) return;
    
    try {
      const success = await productionService.updatePackagingOrderStatus(
        currentOrder.id, 
        newStatus as 'pending' | 'inProgress' | 'completed' | 'cancelled'
      );
      if (success) {
        refetchOrders();
        setIsStatusDialogOpen(false);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة أمر التعبئة");
    }
  };

  const handleDeleteOrder = async () => {
    if (!currentOrder) return;
    
    try {
      const success = await productionService.deletePackagingOrder(currentOrder.id);
      if (success) {
        refetchOrders();
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("حدث خطأ أثناء حذف أمر التعبئة");
    }
  };

  const handleEditOrder = async () => {
    if (!editOrder.id || !editOrder.productCode || editOrder.quantity <= 0) {
      toast.error("يجب اختيار منتج وتحديد كمية صحيحة");
      return;
    }
    
    try {
      // التحقق من توفر جميع المكونات
      const allAvailable = componentsAvailability.every(item => item.available);
      if (!allAvailable) {
        const confirmation = window.confirm("بعض المكونات غير متوفرة. هل ترغب في المتابعة على أي حال؟");
        if (!confirmation) {
          return;
        }
      }
      
      const product = finishedProducts.find(p => p.code === editOrder.productCode);
      if (!product) {
        toast.error("المنتج غير موجود");
        return;
      }
      
      const semiFinished = {
        code: product.semiFinished.code,
        name: product.semiFinished.name,
        quantity: product.semiFinished.quantity * editOrder.quantity
      };
      
      const packagingMaterials = componentsAvailability
        .filter(comp => comp.type === 'packaging')
        .map(material => ({
          code: material.code,
          name: material.name,
          quantity: material.requiredQuantity
        }));

      // حساب التكلفة الإجمالية الجديدة
      const calculatedTotalCost = calculateTotalCost(editOrder.productCode, editOrder.quantity);
      console.log(`تحديث أمر تعبئة: الكمية=${editOrder.quantity}, التكلفة المحسوبة=${calculatedTotalCost}`);
      
      // عرض مؤشر تحميل
      toast.loading("جاري تحديث أمر التعبئة...");
      
      const success = await productionService.updatePackagingOrder(
        editOrder.id,
        {
          productCode: editOrder.productCode,
          productName: product.name,
          quantity: editOrder.quantity,
          unit: editOrder.unit,
          semiFinished,
          packagingMaterials,
          totalCost: calculatedTotalCost // إضافة قيمة التكلفة المحسوبة
        }
      );
      
      if (success) {
        // إغلاق نافذة التعديل وإلغاء مؤشر التحميل
        setIsEditDialogOpen(false);
        setComponentsAvailability([]);
        toast.dismiss();
        
        // انتظار قليلاً ثم تحديث البيانات للتأكد من جلبها مجدداً من قاعدة البيانات
        setTimeout(() => {
          refetchOrders();
          toast.success("تم تحديث أمر التعبئة بنجاح");
        }, 300); // تأخير لضمان اكتمال عملية التحديث في قاعدة البيانات
      } else {
        toast.dismiss();
        toast.error("فشل تحديث أمر التعبئة");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error updating packaging order:", error);
      toast.error("حدث خطأ أثناء تحديث أمر التعبئة");
    }
  };

  const calculateTotalCost = (productCode: string, quantity: number) => {
    const product = finishedProducts.find(p => p.code === productCode);
    if (!product) return 0;
    
    return product.unit_cost * quantity;
  };

  const renderActions = (record: PackagingOrder) => (
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
        {/* رأس الصفحة: العنوان والوصف في الأعلى أقصى اليمين */}
        <div className="w-full flex items-end mb-2">
          <div className="ml-auto text-end w-fit" style={{direction: 'rtl', textAlign: 'right'}}>
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 leading-tight mb-0" style={{marginBottom: 0, lineHeight: 1.2}}>أوامر التعبئة</h1>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 mt-0">إدارة عمليات تعبئة المنتجات النهائية</span>
          </div>
        </div>
        {/* بطاقات الملخص (مؤقتاً سنضعها هنا، ويمكنك تخصيصها لاحقاً) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 rtl:text-right">
          <PackagingSummaryCards {...summary} />
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm text-zinc-500 mb-1">تحديد الفترة الزمنية</span>
            <DateRangePicker
              initialDateFrom={dateRange.from}
              initialDateTo={dateRange.to}
              onUpdate={({ range }) => setDateRange(range)}
              align="end"
            />
          </div>
        </div>
        {/* أزرار الإجراءات أعلى الجدول */}
        <div className="flex flex-row-reverse gap-2 items-center mb-2">
          <Button className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-200 font-bold gap-1 flex items-center justify-center shadow-sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus size={18} /> أمر تعبئة جديد
          </Button>
          <Button variant="outline" onClick={refreshData} className="gap-1 flex items-center justify-center">
            <RefreshCw size={18} /> تحديث
          </Button>
        </div>
        
        <DataTableWithLoading
          columns={columns}
          data={filteredOrders}
          searchable
          searchKeys={['code', 'productName']}
          actions={renderActions}
          isLoading={isLoading}
        />
        
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl rtl:text-right">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-amber-700 mb-2">تفاصيل أمر التعبئة</DialogTitle>
            </DialogHeader>
            {currentOrder && (
              <div className="space-y-8">
                {/* ملخص سريع */}
                <div className="bg-amber-50 dark:bg-zinc-800 rounded-lg p-4 border border-amber-100 dark:border-zinc-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">كود الأمر</span>
                    <span className="font-semibold text-base">{currentOrder.code}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">التاريخ</span>
                    <span className="font-semibold text-base">{currentOrder.date ? new Date(currentOrder.date).toLocaleString('ar-EG') : '-'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">المنتج</span>
                    <span className="font-semibold text-base">{currentOrder.productName}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">الكمية</span>
                    <span className="font-semibold text-base">{currentOrder.quantity} {currentOrder.unit}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">الحالة</span>
                    <Badge className={statusColors[currentOrder.status as keyof typeof statusColors]}>
                      {statusIcons[currentOrder.status as keyof typeof statusIcons]}
                      {statusTranslations[currentOrder.status as keyof typeof statusTranslations]}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">التكلفة الإجمالية</span>
                    <span className="font-semibold text-base">
                      {typeof currentOrder.totalCost === 'number' 
                        ? `${currentOrder.totalCost.toFixed(2)} ج.م` 
                        : '0 ج.م'}
                    </span>
                  </div>
                </div>
                {/* تفاصيل المنتج النصف مصنع */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold mb-2 text-amber-700 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                    المنتج النصف مصنع المستخدم
                  </h4>
                  {currentOrder.semiFinished ? (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-md bg-zinc-50 dark:bg-zinc-800 mb-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{currentOrder.semiFinished.name}</span>
                        <span className="text-xs text-muted-foreground">الكمية: {currentOrder.semiFinished.quantity} وحدة</span>
                      </div>
                      <Badge className={currentOrder.semiFinished.available ? 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-100'}>
                        {currentOrder.semiFinished.available ? 'متوفر' : 'غير متوفر'}
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">لا يوجد منتج نصف مصنع</div>
                  )}
                </div>
                {/* تفاصيل مواد التغليف */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-bold mb-2 text-amber-700 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                    المواد التغليف المستخدمة
                  </h4>
                  <div className="space-y-2">
                    {Array.isArray(currentOrder.packagingMaterials) && currentOrder.packagingMaterials.length > 0 ? (
                      currentOrder.packagingMaterials.map((mat, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-md bg-zinc-50 dark:bg-zinc-800">
                          <div className="flex flex-col">
                            <span className="font-medium">{mat.name}</span>
                            <span className="text-xs text-muted-foreground">الكمية: {mat.quantity} وحدة</span>
                          </div>
                          <Badge className={mat.available ? 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-100'}>
                            {mat.available ? 'متوفر' : 'غير متوفر'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">لا توجد بيانات للمواد</div>
                    )}
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

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-4xl rtl:text-right">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-emerald-700">إنشاء أمر تعبئة جديد</DialogTitle>
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
                      {finishedProducts.map(product => (
                        <SelectItem key={product.code} value={product.code} className="text-right">
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
                    {componentsAvailability.map((component, index) => (
                      <div key={`${component.code}-${index}`} className="flex justify-between p-2 border rounded-md">
                        <div>
                          <span className="font-medium">{component.name}</span>
                          <span className="text-sm text-muted-foreground mr-2">
                            ({component.requiredQuantity.toFixed(2)} {component.unit})
                          </span>
                          <Badge 
                            variant="outline" 
                            className="mr-2"
                          >
                            {component.type === 'semi' ? 'سائل' : 'تعبئة'}
                          </Badge>
                        </div>
                        {component.available ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-100">
                            متوفر
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-100">
                            غير متوفر
                          </Badge>
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
              <Button
                onClick={handleAddOrder}
                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-200 font-bold gap-1 flex items-center justify-center shadow-sm"
                disabled={isLoading}
              >
                {isLoading && <span className="loader mr-2"></span>}
                إضافة أمر التعبئة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl rtl:text-right">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-blue-700">تعديل أمر تعبئة</DialogTitle>
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
                      {finishedProducts.map(product => (
                        <SelectItem key={product.code} value={product.code} className="text-right">
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
                    {componentsAvailability.map((component, index) => (
                      <div key={`${component.code}-${index}`} className="flex justify-between p-2 border rounded-md">
                        <div>
                          <span className="font-medium">{component.name}</span>
                          <span className="text-sm text-muted-foreground mr-2">
                            ({component.requiredQuantity.toFixed(2)} {component.unit})
                          </span>
                          <Badge 
                            variant="outline" 
                            className="mr-2"
                          >
                            {component.type === 'semi' ? 'سائل' : 'تعبئة'}
                          </Badge>
                        </div>
                        {component.available ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-100">
                            متوفر
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-100">
                            غير متوفر
                          </Badge>
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
              <Button onClick={handleEditOrder} className="bg-blue-600 hover:bg-blue-700 text-white gap-1 flex items-center justify-center">
                <CheckCircle2 size={16} /> تحديث
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="max-w-md rtl:text-right">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-amber-700">تحديث حالة أمر التعبئة</DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-300 text-base">
                قم بتغيير حالة أمر التعبئة حسب تقدم العمل.
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
                  <Label htmlFor="status">الحالة الجديدة</Label>
                  <div className="flex flex-row gap-3 mt-1">
                    {[
                      { value: 'pending', label: 'قيد الانتظار', color: 'bg-amber-400', icon: <span className='w-2 h-2 rounded-full bg-amber-400 mr-2 inline-block' /> },
                      { value: 'inProgress', label: 'قيد التنفيذ', color: 'bg-blue-400', icon: <span className='w-2 h-2 rounded-full bg-blue-400 mr-2 inline-block' /> },
                      { value: 'completed', label: 'مكتمل', color: 'bg-green-400', icon: <span className='w-2 h-2 rounded-full bg-green-400 mr-2 inline-block' /> },
                      { value: 'cancelled', label: 'ملغي', color: 'bg-red-400', icon: <span className='w-2 h-2 rounded-full bg-red-400 mr-2 inline-block' /> },
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`flex items-center px-3 py-1 rounded border text-sm font-medium transition-colors focus:outline-none ${
                          newStatus === option.value
                            ? `${option.color} text-white border-transparent`
                            : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200'
                        }`}
                        onClick={() => setNewStatus(option.value)}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleUpdateStatus} className="bg-amber-600 hover:bg-amber-700 text-white gap-1 flex items-center justify-center">
                تحديث الحالة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md rtl:text-right">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-red-700">حذف أمر تعبئة</DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-300 text-base">
                هل أنت متأكد من حذف أمر التعبئة؟ لا يمكن التراجع عن هذا الإجراء.
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
              <Button variant="destructive" onClick={handleDeleteOrder} className="bg-red-600 hover:bg-red-700 text-white gap-1 flex items-center justify-center">
                <Trash size={16} /> حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default PackagingOrders;
