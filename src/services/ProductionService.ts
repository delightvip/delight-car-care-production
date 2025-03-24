
import { toast } from "sonner";
import InventoryService from "./InventoryService";
import { generateOrderCode } from "@/utils/generateCode";

// أنواع البيانات لأوامر الإنتاج
export interface ProductionOrder {
  id: number;
  code: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  date: string;
  ingredients: {
    id: number;
    code: string;
    name: string;
    requiredQuantity: number;
    available: boolean;
  }[];
  totalCost: number;
}

// أنواع البيانات لأوامر التعبئة
export interface PackagingOrder {
  id: number;
  code: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  date: string;
  semiFinished: {
    code: string;
    name: string;
    quantity: number;
    available: boolean;
  };
  packagingMaterials: {
    code: string;
    name: string;
    quantity: number;
    available: boolean;
  }[];
  totalCost: number;
}

class ProductionService {
  private static instance: ProductionService;
  private inventoryService: InventoryService;
  
  // بيانات موقتة لأوامر الإنتاج (في الإنتاج الحقيقي ستأتي من قاعدة البيانات)
  private productionOrders: ProductionOrder[] = [
    {
      id: 1,
      code: 'PROD-230801-00001',
      productCode: 'SEMI-00001',
      productName: 'ملمع تابلوه سائل',
      quantity: 200,
      unit: 'لتر',
      status: 'completed',
      date: '2023-08-15',
      ingredients: [
        { id: 1, code: 'RAW-00005', name: 'زيت سيليكون', requiredQuantity: 60, available: true },
        { id: 2, code: 'RAW-00002', name: 'عطر ليمون', requiredQuantity: 10, available: true },
        { id: 3, code: 'RAW-00001', name: 'كحول إيثيلي', requiredQuantity: 30, available: true }
      ],
      totalCost: 8000
    },
    {
      id: 2,
      code: 'PROD-230801-00002',
      productCode: 'SEMI-00002',
      productName: 'منظف زجاج سائل',
      quantity: 300,
      unit: 'لتر',
      status: 'inProgress',
      date: '2023-08-16',
      ingredients: [
        { id: 1, code: 'RAW-00001', name: 'كحول إيثيلي', requiredQuantity: 60, available: true },
        { id: 2, code: 'RAW-00004', name: 'صبغة زرقاء', requiredQuantity: 3, available: true }
      ],
      totalCost: 9000
    },
    {
      id: 3,
      code: 'PROD-230801-00003',
      productCode: 'SEMI-00001',
      productName: 'ملمع تابلوه سائل',
      quantity: 100,
      unit: 'لتر',
      status: 'pending',
      date: '2023-08-17',
      ingredients: [
        { id: 1, code: 'RAW-00005', name: 'زيت سيليكون', requiredQuantity: 30, available: true },
        { id: 2, code: 'RAW-00002', name: 'عطر ليمون', requiredQuantity: 5, available: false },
        { id: 3, code: 'RAW-00001', name: 'كحول إيثيلي', requiredQuantity: 15, available: true }
      ],
      totalCost: 4000
    }
  ];
  
  // بيانات موقتة لأوامر التعبئة
  private packagingOrders: PackagingOrder[] = [
    {
      id: 1,
      code: 'PCK-230801-00001',
      productCode: 'FIN-00001',
      productName: 'ملمع تابلوه 1 لتر',
      quantity: 50,
      unit: 'قطعة',
      status: 'completed',
      date: '2023-08-20',
      semiFinished: {
        code: 'SEMI-00001',
        name: 'ملمع تابلوه سائل',
        quantity: 50,
        available: true
      },
      packagingMaterials: [
        { code: 'PKG-00001', name: 'عبوة بلاستيك 1 لتر', quantity: 50, available: true },
        { code: 'PKG-00003', name: 'غطاء بلاستيك', quantity: 50, available: true },
        { code: 'PKG-00004', name: 'ملصق منتج', quantity: 50, available: true }
      ],
      totalCost: 2500
    }
  ];
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
  }
  
  // الحصول على كائن وحيد من الخدمة (نمط Singleton)
  public static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }
  
  // الحصول على جميع أوامر الإنتاج
  public getProductionOrders(): ProductionOrder[] {
    return [...this.productionOrders];
  }
  
  // الحصول على جميع أوامر التعبئة
  public getPackagingOrders(): PackagingOrder[] {
    return [...this.packagingOrders];
  }
  
  // إنشاء أمر إنتاج جديد
  public createProductionOrder(productCode: string, quantity: number): ProductionOrder | null {
    const semiFinishedProducts = this.inventoryService.getSemiFinishedProducts();
    const product = semiFinishedProducts.find(p => p.code === productCode);
    
    if (!product) {
      toast.error('المنتج النصف مصنع غير موجود');
      return null;
    }
    
    // حساب الكميات المطلوبة من المواد الأولية
    const ingredients = product.ingredients.map(ingredient => {
      const requiredQuantity = (ingredient.percentage / 100) * quantity;
      const rawMaterials = this.inventoryService.getRawMaterials();
      const inventoryItem = rawMaterials.find(item => item.code === ingredient.code);
      const available = inventoryItem ? inventoryItem.quantity >= requiredQuantity : false;
      
      return {
        id: ingredient.id,
        code: ingredient.code,
        name: ingredient.name,
        requiredQuantity,
        available
      };
    });
    
    // حساب التكلفة الإجمالية
    const totalCost = product.unitCost * quantity;
    
    // إنشاء أمر الإنتاج
    const newOrder: ProductionOrder = {
      id: this.productionOrders.length > 0 ? Math.max(...this.productionOrders.map(order => order.id)) + 1 : 1,
      code: generateOrderCode('production', this.productionOrders.length),
      productCode,
      productName: product.name,
      quantity,
      unit: product.unit,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      ingredients,
      totalCost
    };
    
    this.productionOrders.push(newOrder);
    
    // التحقق من توفر جميع المكونات
    const allAvailable = ingredients.every(i => i.available);
    if (!allAvailable) {
      toast.warning('بعض المكونات غير متوفرة بالكمية المطلوبة. تم حفظ الأمر كمسودة.');
    } else {
      toast.success(`تم إنشاء أمر إنتاج ${newOrder.productName} بنجاح`);
    }
    
    return newOrder;
  }
  
  // تحديث حالة أمر إنتاج
  public updateProductionOrderStatus(orderId: number, newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'): boolean {
    const orderIndex = this.productionOrders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) {
      toast.error('أمر الإنتاج غير موجود');
      return false;
    }
    
    const order = this.productionOrders[orderIndex];
    
    // التحقق من توفر المكونات إذا كان التحديث إلى "مكتمل"
    if (newStatus === 'completed') {
      // تجهيز متطلبات المواد الأولية
      const requirements = order.ingredients.map(ingredient => ({
        code: ingredient.code,
        requiredQuantity: ingredient.requiredQuantity
      }));
      
      // استهلاك المواد الأولية من المخزون
      const consumeSuccess = this.inventoryService.consumeRawMaterials(requirements);
      if (!consumeSuccess) {
        return false;
      }
      
      // إضافة المنتج النصف مصنع للمخزون
      const addSuccess = this.inventoryService.addSemiFinishedToInventory(order.productCode, order.quantity);
      if (!addSuccess) {
        return false;
      }
    }
    
    // تحديث حالة الأمر
    this.productionOrders[orderIndex] = {
      ...order,
      status: newStatus
    };
    
    toast.success(`تم تحديث حالة أمر الإنتاج إلى ${this.getStatusTranslation(newStatus)}`);
    return true;
  }
  
  // إنشاء أمر تعبئة جديد
  public createPackagingOrder(
    finishedProductCode: string,
    quantity: number
  ): PackagingOrder | null {
    const finishedProducts = this.inventoryService.getFinishedProducts();
    const product = finishedProducts.find(p => p.code === finishedProductCode);
    
    if (!product) {
      toast.error('المنتج النهائي غير موجود');
      return null;
    }
    
    // التحقق من توفر المنتج النصف مصنع
    const semiFinishedCode = product.semiFinished.code;
    const semiFinishedQuantity = product.semiFinished.quantity * quantity;
    const semiAvailable = this.inventoryService.checkSemiFinishedAvailability(semiFinishedCode, semiFinishedQuantity);
    
    // التحقق من توفر مواد التعبئة
    const packagingMaterials = product.packaging.map(pkg => {
      const pkgQuantity = pkg.quantity * quantity;
      const available = this.inventoryService.checkPackagingAvailability([{ code: pkg.code, requiredQuantity: pkgQuantity }]);
      
      return {
        code: pkg.code,
        name: pkg.name,
        quantity: pkgQuantity,
        available
      };
    });
    
    // حساب التكلفة الإجمالية
    const totalCost = product.unitCost * quantity;
    
    // إنشاء أمر التعبئة
    const newOrder: PackagingOrder = {
      id: this.packagingOrders.length > 0 ? Math.max(...this.packagingOrders.map(order => order.id)) + 1 : 1,
      code: generateOrderCode('packaging', this.packagingOrders.length),
      productCode: finishedProductCode,
      productName: product.name,
      quantity,
      unit: product.unit,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      semiFinished: {
        code: semiFinishedCode,
        name: product.semiFinished.name,
        quantity: semiFinishedQuantity,
        available: semiAvailable
      },
      packagingMaterials,
      totalCost
    };
    
    this.packagingOrders.push(newOrder);
    
    // التحقق من توفر جميع المتطلبات
    const allAvailable = semiAvailable && packagingMaterials.every(m => m.available);
    if (!allAvailable) {
      toast.warning('بعض المكونات غير متوفرة بالكمية المطلوبة. تم حفظ الأمر كمسودة.');
    } else {
      toast.success(`تم إنشاء أمر تعبئة ${newOrder.productName} بنجاح`);
    }
    
    return newOrder;
  }
  
  // تحديث حالة أمر تعبئة
  public updatePackagingOrderStatus(orderId: number, newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'): boolean {
    const orderIndex = this.packagingOrders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) {
      toast.error('أمر التعبئة غير موجود');
      return false;
    }
    
    const order = this.packagingOrders[orderIndex];
    
    // التحقق من توفر المكونات إذا كان التحديث إلى "مكتمل"
    if (newStatus === 'completed') {
      // التحقق من توفر المنتج النصف مصنع
      if (!this.inventoryService.checkSemiFinishedAvailability(order.semiFinished.code, order.semiFinished.quantity)) {
        toast.error('المنتج النصف مصنع غير متوفر بالكمية المطلوبة');
        return false;
      }
      
      // التحقق من توفر مواد التعبئة
      const packagingReqs = order.packagingMaterials.map(material => ({
        code: material.code,
        requiredQuantity: material.quantity
      }));
      
      if (!this.inventoryService.checkPackagingAvailability(packagingReqs)) {
        toast.error('مواد التعبئة غير متوفرة بالكميات المطلوبة');
        return false;
      }
      
      // تنفيذ عملية إنتاج المنتج النهائي
      const produceSuccess = this.inventoryService.produceFinishedProduct(
        order.productCode,
        order.quantity,
        order.semiFinished.code,
        order.semiFinished.quantity / order.quantity,
        packagingReqs
      );
      
      if (!produceSuccess) {
        return false;
      }
    }
    
    // تحديث حالة الأمر
    this.packagingOrders[orderIndex] = {
      ...order,
      status: newStatus
    };
    
    toast.success(`تم تحديث حالة أمر التعبئة إلى ${this.getStatusTranslation(newStatus)}`);
    return true;
  }
  
  // ترجمة حالة الأمر
  private getStatusTranslation(status: string): string {
    const translations: Record<string, string> = {
      pending: 'قيد الانتظار',
      inProgress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };
    
    return translations[status] || status;
  }
  
  // الحصول على بيانات إحصائية للإنتاج
  public getProductionStats() {
    const totalOrders = this.productionOrders.length;
    const pendingOrders = this.productionOrders.filter(order => order.status === 'pending').length;
    const inProgressOrders = this.productionOrders.filter(order => order.status === 'inProgress').length;
    const completedOrders = this.productionOrders.filter(order => order.status === 'completed').length;
    
    const totalPackagingOrders = this.packagingOrders.length;
    const pendingPackagingOrders = this.packagingOrders.filter(order => order.status === 'pending').length;
    const inProgressPackagingOrders = this.packagingOrders.filter(order => order.status === 'inProgress').length;
    const completedPackagingOrders = this.packagingOrders.filter(order => order.status === 'completed').length;
    
    return {
      production: {
        total: totalOrders,
        pending: pendingOrders,
        inProgress: inProgressOrders,
        completed: completedOrders
      },
      packaging: {
        total: totalPackagingOrders,
        pending: pendingPackagingOrders,
        inProgress: inProgressPackagingOrders,
        completed: completedPackagingOrders
      }
    };
  }
  
  // الحصول على بيانات الإنتاج للرسوم البيانية
  public getProductionChartData() {
    // بيانات إنتاج آخر 6 أشهر (بيانات موقتة)
    return [
      { name: 'يناير', الإنتاج: 400, التعبئة: 340 },
      { name: 'فبراير', الإنتاج: 300, التعبئة: 290 },
      { name: 'مارس', الإنتاج: 500, التعبئة: 480 },
      { name: 'أبريل', الإنتاج: 280, التعبئة: 230 },
      { name: 'مايو', الإنتاج: 450, التعبئة: 410 },
      { name: 'يونيو', الإنتاج: 600, التعبئة: 580 }
    ];
  }
}

export default ProductionService;
