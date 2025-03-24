
import { toast } from "sonner";
import InventoryService from "./InventoryService";
import ProductionDatabaseService from "./database/ProductionDatabaseService";

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
  private databaseService: ProductionDatabaseService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.databaseService = ProductionDatabaseService.getInstance();
  }
  
  // الحصول على كائن وحيد من الخدمة (نمط Singleton)
  public static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }
  
  // الحصول على جميع أوامر الإنتاج
  public async getProductionOrders(): Promise<ProductionOrder[]> {
    return await this.databaseService.getProductionOrders();
  }
  
  // الحصول على جميع أوامر التعبئة
  public async getPackagingOrders(): Promise<PackagingOrder[]> {
    return await this.databaseService.getPackagingOrders();
  }
  
  // إنشاء أمر إنتاج جديد
  public async createProductionOrder(productCode: string, quantity: number): Promise<ProductionOrder | null> {
    try {
      const semiFinishedProducts = await this.inventoryService.getSemiFinishedProducts();
      const product = semiFinishedProducts.find(p => p.code === productCode);
      
      if (!product) {
        toast.error('المنتج النصف مصنع غير موجود');
        return null;
      }
      
      // حساب الكميات المطلوبة من المواد الأولية
      const rawMaterials = await this.inventoryService.getRawMaterials();
      const ingredients = product.ingredients.map(ingredient => {
        const requiredQuantity = (ingredient.percentage / 100) * quantity;
        const inventoryItem = rawMaterials.find(item => item.code === ingredient.code);
        const available = inventoryItem ? inventoryItem.quantity >= requiredQuantity : false;
        
        return {
          code: ingredient.code,
          name: ingredient.name,
          requiredQuantity,
          available
        };
      });
      
      // حساب التكلفة الإجمالية
      const totalCost = product.unitCost * quantity;
      
      // إنشاء أمر الإنتاج في قاعدة البيانات
      const newOrder = await this.databaseService.createProductionOrder(
        productCode,
        product.name,
        quantity,
        product.unit,
        ingredients,
        totalCost
      );
      
      if (!newOrder) return null;
      
      // التحقق من توفر جميع المكونات
      const allAvailable = ingredients.every(i => i.available);
      if (!allAvailable) {
        toast.warning('بعض المكونات غير متوفرة بالكمية المطلوبة. تم حفظ الأمر كمسودة.');
      } else {
        toast.success(`تم إنشاء أمر إنتاج ${newOrder.productName} بنجاح`);
      }
      
      return newOrder;
    } catch (error) {
      console.error('Error creating production order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر الإنتاج');
      return null;
    }
  }
  
  // تحديث حالة أمر إنتاج
  public async updateProductionOrderStatus(orderId: number, newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'): Promise<boolean> {
    try {
      const orders = await this.getProductionOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر الإنتاج غير موجود');
        return false;
      }
      
      // التحقق من توفر المكونات إذا كان التحديث إلى "مكتمل"
      if (newStatus === 'completed') {
        // تجهيز متطلبات المواد الأولية
        const requirements = order.ingredients.map(ingredient => ({
          code: ingredient.code,
          requiredQuantity: ingredient.requiredQuantity
        }));
        
        // استهلاك المواد الأولية من المخزون
        const consumeSuccess = await this.inventoryService.consumeRawMaterials(requirements);
        if (!consumeSuccess) {
          return false;
        }
        
        // إضافة المنتج النصف مصنع للمخزون
        const addSuccess = await this.inventoryService.addSemiFinishedToInventory(order.productCode, order.quantity);
        if (!addSuccess) {
          return false;
        }
      }
      
      // تحديث حالة الأمر في قاعدة البيانات
      const result = await this.databaseService.updateProductionOrderStatus(orderId, newStatus);
      
      if (result) {
        toast.success(`تم تحديث حالة أمر الإنتاج إلى ${this.getStatusTranslation(newStatus)}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating production order status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة أمر الإنتاج');
      return false;
    }
  }
  
  // إنشاء أمر تعبئة جديد
  public async createPackagingOrder(
    finishedProductCode: string,
    quantity: number
  ): Promise<PackagingOrder | null> {
    try {
      const finishedProducts = await this.inventoryService.getFinishedProducts();
      const product = finishedProducts.find(p => p.code === finishedProductCode);
      
      if (!product) {
        toast.error('المنتج النهائي غير موجود');
        return null;
      }
      
      // التحقق من توفر المنتج النصف مصنع
      const semiFinishedCode = product.semiFinished.code;
      const semiFinishedQuantity = product.semiFinished.quantity * quantity;
      const semiAvailable = await this.inventoryService.checkSemiFinishedAvailability(semiFinishedCode, semiFinishedQuantity);
      
      // التحقق من توفر مواد التعبئة
      const packagingMaterials = await Promise.all(product.packaging.map(async pkg => {
        const pkgQuantity = pkg.quantity * quantity;
        const available = await this.inventoryService.checkPackagingAvailability([{
          code: pkg.code,
          requiredQuantity: pkgQuantity
        }]);
        
        return {
          code: pkg.code,
          name: pkg.name,
          quantity: pkgQuantity,
          available
        };
      }));
      
      // حساب التكلفة الإجمالية
      const totalCost = product.unitCost * quantity;
      
      // إنشاء أمر التعبئة في قاعدة البيانات
      const newOrder = await this.databaseService.createPackagingOrder(
        finishedProductCode,
        product.name,
        quantity,
        product.unit,
        {
          code: semiFinishedCode,
          name: product.semiFinished.name,
          quantity: semiFinishedQuantity
        },
        packagingMaterials,
        totalCost
      );
      
      if (!newOrder) return null;
      
      toast.success(`تم إنشاء أمر تعبئة ${newOrder.productName} بنجاح`);
      
      return newOrder;
    } catch (error) {
      console.error('Error creating packaging order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر التعبئة');
      return null;
    }
  }
  
  // تحديث حالة أمر تعبئة
  public async updatePackagingOrderStatus(orderId: number, newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'): Promise<boolean> {
    try {
      const orders = await this.getPackagingOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر التعبئة غير موجود');
        return false;
      }
      
      // التحقق من توفر المكونات إذا كان التحديث إلى "مكتمل"
      if (newStatus === 'completed') {
        // التحقق من توفر المنتج النصف مصنع
        const semiFinishedAvailable = await this.inventoryService.checkSemiFinishedAvailability(
          order.semiFinished.code, 
          order.semiFinished.quantity
        );
        
        if (!semiFinishedAvailable) {
          toast.error('المنتج النصف مصنع غير متوفر بالكمية المطلوبة');
          return false;
        }
        
        // التحقق من توفر مواد التعبئة
        const packagingReqs = order.packagingMaterials.map(material => ({
          code: material.code,
          requiredQuantity: material.quantity
        }));
        
        const packagingAvailable = await this.inventoryService.checkPackagingAvailability(packagingReqs);
        if (!packagingAvailable) {
          toast.error('مواد التعبئة غير متوفرة بالكميات المطلوبة');
          return false;
        }
        
        // تنفيذ عملية إنتاج المنتج النهائي
        const produceSuccess = await this.inventoryService.produceFinishedProduct(
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
      
      // تحديث حالة الأمر في قاعدة البيانات
      const result = await this.databaseService.updatePackagingOrderStatus(orderId, newStatus);
      
      if (result) {
        toast.success(`تم تحديث حالة أمر التعبئة إلى ${this.getStatusTranslation(newStatus)}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating packaging order status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة أمر التعبئة');
      return false;
    }
  }
  
  // حذف أمر إنتاج
  public async deleteProductionOrder(orderId: number): Promise<boolean> {
    try {
      const orders = await this.getProductionOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر الإنتاج غير موجود');
        return false;
      }
      
      // فقط أوامر الإنتاج في حالة "قيد الانتظار" يمكن حذفها
      if (order.status !== 'pending') {
        toast.error('لا يمكن حذف أمر إنتاج قيد التنفيذ أو مكتمل');
        return false;
      }
      
      // حذف الأمر من قاعدة البيانات
      const result = await this.databaseService.deleteProductionOrder(orderId);
      
      if (result) {
        toast.success(`تم حذف أمر الإنتاج ${order.code} بنجاح`);
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting production order:', error);
      toast.error('حدث خطأ أثناء حذف أمر الإنتاج');
      return false;
    }
  }
  
  // حذف أمر تعبئة
  public async deletePackagingOrder(orderId: number): Promise<boolean> {
    try {
      const orders = await this.getPackagingOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر التعبئة غير موجود');
        return false;
      }
      
      // فقط أوامر التعبئة في حالة "قيد الانتظار" يمكن حذفها
      if (order.status !== 'pending') {
        toast.error('لا يمكن حذف أمر تعبئة قيد التنفيذ أو مكتمل');
        return false;
      }
      
      // حذف الأمر من قاعدة البيانات
      const result = await this.databaseService.deletePackagingOrder(orderId);
      
      if (result) {
        toast.success(`تم حذف أمر التعبئة ${order.code} بنجاح`);
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting packaging order:', error);
      toast.error('حدث خطأ أثناء حذف أمر التعبئة');
      return false;
    }
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
  public async getProductionStats() {
    return await this.databaseService.getProductionStats();
  }
  
  // الحصول على بيانات الإنتاج للرسوم البيانية
  public async getProductionChartData() {
    return await this.databaseService.getMonthlyProductionStats();
  }
}

export default ProductionService;
