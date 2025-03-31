
import { toast } from "sonner";
import { PackagingOrder } from "../types/ProductionTypes";
import InventoryService from "../../InventoryService";
import ProductionDatabaseService from "../../database/ProductionDatabaseService";

export class PackagingOrdersService {
  constructor(
    private inventoryService: InventoryService,
    private databaseService: ProductionDatabaseService
  ) {}
  
  // الحصول على جميع أوامر التعبئة
  public async getPackagingOrders(): Promise<PackagingOrder[]> {
    return await this.databaseService.getPackagingOrders();
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
      const totalCost = product.unit_cost * quantity;
      
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
  public async updatePackagingOrderStatus(
    orderId: number, 
    newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    try {
      const orders = await this.getPackagingOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر التعبئة غير موجود');
        return false;
      }
      
      // التحقق من الحالة السابقة للأمر
      const prevStatus = order.status;
      
      // تحديث حالة الأمر في قاعدة البيانات
      const result = await this.databaseService.updatePackagingOrderStatus(orderId, newStatus);
      
      if (!result) {
        return false;
      }
      
      // التعامل مع حالة التغيير من "مكتمل" إلى حالة أخرى (إلغاء تأثير الاكتمال)
      if (prevStatus === 'completed' && newStatus !== 'completed') {
        // إعادة المنتج النصف مصنع للمخزون
        await this.inventoryService.addSemiFinishedToInventory(
          order.semiFinished.code,
          order.semiFinished.quantity
        );
        
        // إعادة مواد التعبئة للمخزون
        const packagingReqs = order.packagingMaterials.map(material => ({
          code: material.code,
          requiredQuantity: material.quantity
        }));
        
        await this.inventoryService.returnPackagingMaterials(packagingReqs);
        
        // إزالة المنتج النهائي من المخزون
        await this.inventoryService.removeFinishedFromInventory(order.productCode, order.quantity);
        
        toast.success(`تم تحديث حالة أمر التعبئة إلى ${this.getStatusTranslation(newStatus)}`);
        return true;
      }

      // التحقق من توفر المكونات إذا كان التحديث إلى "مكتمل"
      if (newStatus === 'completed' && prevStatus !== 'completed') {
        // التحقق من توفر المنتج النصف مصنع
        const semiFinishedAvailable = await this.inventoryService.checkSemiFinishedAvailability(
          order.semiFinished.code, 
          order.semiFinished.quantity
        );
        
        if (!semiFinishedAvailable) {
          toast.error('المنتج النصف مصنع غير متوفر بالكمية المطلوبة');
          await this.databaseService.updatePackagingOrderStatus(orderId, prevStatus);
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
          await this.databaseService.updatePackagingOrderStatus(orderId, prevStatus);
          return false;
        }
        
        // تنفيذ عملية إنتاج المنتج النهائي
        const produceSuccess = await this.inventoryService.produceFinishedProduct(
          order.productCode,
          order.quantity,
          order.semiFinished.code,
          order.semiFinished.quantity,
          packagingReqs
        );
        
        if (!produceSuccess) {
          await this.databaseService.updatePackagingOrderStatus(orderId, prevStatus);
          return false;
        }
      }
      
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
  
  // تحديث أمر تعبئة
  public async updatePackagingOrder(
    orderId: number,
    orderData: {
      productCode: string;
      productName: string;
      quantity: number;
      unit: string;
      semiFinished: {
        code: string;
        name: string;
        quantity: number;
      };
      packagingMaterials: {
        code: string;
        name: string;
        quantity: number;
      }[];
    }
  ): Promise<boolean> {
    try {
      const result = await this.databaseService.updatePackagingOrder(orderId, orderData);
      
      if (result) {
        toast.success(`تم تحديث أمر التعبئة بنجاح`);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating packaging order:', error);
      toast.error('حدث خطأ أثناء تحديث أمر التعبئة');
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
}
