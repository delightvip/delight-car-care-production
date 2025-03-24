
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import DataTable from '@/components/ui/DataTable';
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
import { AlertTriangle, CheckCircle2, Clock, Edit, Eye, Plus, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateOrderCode } from '@/utils/generateCode';

// Mock data for packaging orders
const initialPackagingOrders = [
  {
    id: 1,
    code: 'PACK-230801-00001',
    productCode: 'FIN-00001',
    productName: 'ملمع تابلوه 250مل',
    quantity: 200,
    unit: 'قطعة',
    status: 'completed',
    date: '2023-08-15',
    components: [
      { type: 'semi', code: 'SEMI-00001', name: 'ملمع تابلوه سائل', requiredQuantity: 50, available: true, unit: 'لتر' },
      { type: 'packaging', code: 'PKG-00001', name: 'عبوة بلاستيكية 250مل', requiredQuantity: 200, available: true, unit: 'قطعة' },
      { type: 'packaging', code: 'PKG-00003', name: 'ملصق منتج ملمع تابلوه', requiredQuantity: 200, available: true, unit: 'قطعة' }
    ],
    totalCost: 4000
  },
  {
    id: 2,
    code: 'PACK-230801-00002',
    productCode: 'FIN-00002',
    productName: 'منظف زجاج 500مل',
    quantity: 150,
    unit: 'قطعة',
    status: 'inProgress',
    date: '2023-08-16',
    components: [
      { type: 'semi', code: 'SEMI-00002', name: 'منظف زجاج سائل', requiredQuantity: 75, available: true, unit: 'لتر' },
      { type: 'packaging', code: 'PKG-00002', name: 'عبوة بلاستيكية 500مل', requiredQuantity: 150, available: true, unit: 'قطعة' },
      { type: 'packaging', code: 'PKG-00004', name: 'ملصق منتج منظف زجاج', requiredQuantity: 150, available: true, unit: 'قطعة' }
    ],
    totalCost: 3750
  },
  {
    id: 3,
    code: 'PACK-230801-00003',
    productCode: 'FIN-00001',
    productName: 'ملمع تابلوه 250مل',
    quantity: 100,
    unit: 'قطعة',
    status: 'pending',
    date: '2023-08-17',
    components: [
      { type: 'semi', code: 'SEMI-00001', name: 'ملمع تابلوه سائل', requiredQuantity: 25, available: true, unit: 'لتر' },
      { type: 'packaging', code: 'PKG-00001', name: 'عبوة بلاستيكية 250مل', requiredQuantity: 100, available: false, unit: 'قطعة' },
      { type: 'packaging', code: 'PKG-00003', name: 'ملصق منتج ملمع تابلوه', requiredQuantity: 100, available: true, unit: 'قطعة' }
    ],
    totalCost: 2000
  }
];

// Mock data for finished products
const finishedProducts = [
  {
    id: 1,
    code: 'FIN-00001',
    name: 'ملمع تابلوه 250مل',
    unit: 'قطعة',
    components: [
      { type: 'semi', code: 'SEMI-00001', name: 'ملمع تابلوه سائل', quantity: 0.25, unit: 'لتر' },
      { type: 'packaging', code: 'PKG-00001', name: 'عبوة بلاستيكية 250مل', quantity: 1, unit: 'قطعة' },
      { type: 'packaging', code: 'PKG-00003', name: 'ملصق منتج ملمع تابلوه', quantity: 1, unit: 'قطعة' }
    ],
    unitCost: 20
  },
  {
    id: 2,
    code: 'FIN-00002',
    name: 'منظف زجاج 500مل',
    unit: 'قطعة',
    components: [
      { type: 'semi', code: 'SEMI-00002', name: 'منظف زجاج سائل', quantity: 0.5, unit: 'لتر' },
      { type: 'packaging', code: 'PKG-00002', name: 'عبوة بلاستيكية 500مل', quantity: 1, unit: 'قطعة' },
      { type: 'packaging', code: 'PKG-00004', name: 'ملصق منتج منظف زجاج', quantity: 1, unit: 'قطعة' }
    ],
    unitCost: 25
  }
];

// Mock data for inventory
const inventory = {
  semi: [
    { code: 'SEMI-00001', name: 'ملمع تابلوه سائل', quantity: 35, minStock: 50, unit: 'لتر' },
    { code: 'SEMI-00002', name: 'منظف زجاج سائل', quantity: 100, minStock: 50, unit: 'لتر' }
  ],
  packaging: [
    { code: 'PKG-00001', name: 'عبوة بلاستيكية 250مل', quantity: 120, minStock: 200, unit: 'قطعة' },
    { code: 'PKG-00002', name: 'عبوة بلاستيكية 500مل', quantity: 400, minStock: 150, unit: 'قطعة' },
    { code: 'PKG-00003', name: 'ملصق منتج ملمع تابلوه', quantity: 1000, minStock: 300, unit: 'قطعة' },
    { code: 'PKG-00004', name: 'ملصق منتج منظف زجاج', quantity: 1000, minStock: 300, unit: 'قطعة' },
    { code: 'PKG-00005', name: 'كرتونة تعبئة (24 قطعة)', quantity: 40, minStock: 50, unit: 'قطعة' }
  ]
};

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
  const [orders, setOrders] = useState(initialPackagingOrders);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [newOrder, setNewOrder] = useState({
    productCode: '',
    quantity: 0
  });
  const [newStatus, setNewStatus] = useState('');
  
  const { toast } = useToast();
  
  // Columns for the data table
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
      render: (value: number) => `${value} ج.م`
    }
  ];
  
  // Check if all components are available
  const checkComponentsAvailability = (productCode: string, quantity: number) => {
    const product = finishedProducts.find(p => p.code === productCode);
    if (!product) return [];
    
    return product.components.map(component => {
      const requiredQuantity = component.quantity * quantity;
      let inventoryItem;
      
      if (component.type === 'semi') {
        inventoryItem = inventory.semi.find(item => item.code === component.code);
      } else {
        inventoryItem = inventory.packaging.find(item => item.code === component.code);
      }
      
      const available = inventoryItem && inventoryItem.quantity >= requiredQuantity;
      
      return {
        ...component,
        requiredQuantity,
        available
      };
    });
  };
  
  // Calculate total cost of packaging
  const calculateTotalCost = (productCode: string, quantity: number) => {
    const product = finishedProducts.find(p => p.code === productCode);
    if (!product) return 0;
    
    return product.unitCost * quantity;
  };
  
  // Handle adding a new order
  const handleAddOrder = () => {
    if (!newOrder.productCode || newOrder.quantity <= 0) {
      toast({
        title: "خطأ",
        description: "يجب اختيار منتج وتحديد كمية صحيحة",
        variant: "destructive"
      });
      return;
    }
    
    const product = finishedProducts.find(p => p.code === newOrder.productCode);
    if (!product) {
      toast({
        title: "خطأ",
        description: "المنتج غير موجود",
        variant: "destructive"
      });
      return;
    }
    
    const components = checkComponentsAvailability(newOrder.productCode, newOrder.quantity);
    const allAvailable = components.every(i => i.available);
    const totalCost = calculateTotalCost(newOrder.productCode, newOrder.quantity);
    
    const newItem = {
      id: orders.length + 1,
      code: generateOrderCode('packaging', orders.length),
      productCode: newOrder.productCode,
      productName: product.name,
      quantity: newOrder.quantity,
      unit: product.unit,
      status: allAvailable ? 'pending' : 'pending',
      date: new Date().toISOString().split('T')[0],
      components,
      totalCost
    };
    
    setOrders([...orders, newItem]);
    setNewOrder({
      productCode: '',
      quantity: 0
    });
    setIsAddDialogOpen(false);
    
    toast({
      title: "تمت الإضافة",
      description: `تم إضافة أمر تعبئة ${newItem.productName} بنجاح`
    });
    
    if (!allAvailable) {
      toast({
        title: "تنبيه",
        description: "بعض المكونات غير متوفرة بالكمية المطلوبة. تم حفظ الأمر كمسودة.",
        variant: "destructive"
      });
    }
  };
  
  // Handle updating order status
  const handleUpdateStatus = () => {
    if (!currentOrder || !newStatus) return;
    
    // If changing to completed, verify components availability
    if (newStatus === 'completed') {
      const components = checkComponentsAvailability(currentOrder.productCode, currentOrder.quantity);
      const allAvailable = components.every(i => i.available);
      
      if (!allAvailable) {
        toast({
          title: "خطأ",
          description: "لا يمكن إكمال الأمر لعدم توفر جميع المكونات",
          variant: "destructive"
        });
        return;
      }
    }
    
    const updatedOrders = orders.map(order => 
      order.id === currentOrder.id ? 
        { ...order, status: newStatus } : 
        order
    );
    
    setOrders(updatedOrders);
    setIsStatusDialogOpen(false);
    
    toast({
      title: "تم التحديث",
      description: `تم تحديث حالة أمر التعبئة إلى ${statusTranslations[newStatus as keyof typeof statusTranslations]}`
    });
  };
  
  // Handle deleting an order
  const handleDeleteOrder = () => {
    if (!currentOrder) return;
    
    // Only allow deleting pending orders
    if (currentOrder.status !== 'pending') {
      toast({
        title: "خطأ",
        description: "لا يمكن حذف أمر تعبئة قيد التنفيذ أو مكتمل",
        variant: "destructive"
      });
      return;
    }
    
    const updatedOrders = orders.filter(order => order.id !== currentOrder.id);
    
    setOrders(updatedOrders);
    setIsDeleteDialogOpen(false);
    
    toast({
      title: "تم الحذف",
      description: `تم حذف أمر التعبئة ${currentOrder.code} بنجاح`
    });
  };
  
  // Render actions column
  const renderActions = (record: any) => (
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
            <h1 className="text-3xl font-bold tracking-tight">أوامر التعبئة</h1>
            <p className="text-muted-foreground mt-1">إدارة عمليات تعبئة المنتجات النهائية</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                أمر تعبئة جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة أمر تعبئة جديد</DialogTitle>
                <DialogDescription>
                  اختر المنتج النهائي وحدد الكمية المطلوب تعبئتها.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                
                {newOrder.productCode && newOrder.quantity > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">المكونات المطلوبة:</h4>
                    <div className="space-y-2">
                      {checkComponentsAvailability(newOrder.productCode, newOrder.quantity).map(component => {
                        return (
                          <div key={component.code} className="flex justify-between p-2 border rounded-md">
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
                              <Badge className="bg-green-100 text-green-800">متوفر</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">غير متوفر</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4 p-2 border rounded-md bg-muted/50">
                      <div className="flex justify-between">
                        <span className="font-medium">التكلفة الإجمالية:</span>
                        <span>{calculateTotalCost(newOrder.productCode, newOrder.quantity)} ج.م</span>
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
        
        <DataTable
          columns={columns}
          data={orders}
          searchable
          searchKeys={['code', 'productName']}
          actions={renderActions}
        />
        
        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل أمر التعبئة</DialogTitle>
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
                    <p className="font-medium">{currentOrder.totalCost} ج.م</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">المكونات المطلوبة:</h4>
                  <div className="space-y-2">
                    {currentOrder.components.map((component: any) => (
                      <div key={component.code} className="flex justify-between p-2 border rounded-md">
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
        
        {/* Update Status Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تحديث حالة أمر التعبئة</DialogTitle>
              <DialogDescription>
                تحديث حالة أمر التعبئة {currentOrder?.code}
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
                      عند تحديث الحالة إلى "مكتمل"، سيتم خصم المكونات من المخزون وإضافة المنتج النهائي.
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
        
        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف أمر تعبئة</DialogTitle>
              <DialogDescription>
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
              <Button variant="destructive" onClick={handleDeleteOrder}>
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default PackagingOrders;
