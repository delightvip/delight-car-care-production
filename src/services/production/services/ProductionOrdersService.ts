
import { toast } from "sonner";
import { ProductionOrder } from "../types/ProductionTypes";
import InventoryService from "../../InventoryService";
import ProductionDatabaseService from "../../database/ProductionDatabaseService";

export class ProductionOrdersService {
  constructor(
    private inventoryService: InventoryService,
    private databaseService: ProductionDatabaseService
  ) {}
  
  // الحصول على جميع أوامر الإنتاج
  public async getProductionOrders(): Promise<ProductionOrder[]> {
    return await this.databaseService.getProductionOrders();
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
      const totalCost = product.unit_cost * quantity;
      
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
  public async updateProductionOrderStatus(
    orderId: number, 
    newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    try {
      const orders = await this.getProductionOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر الإنتاج غير موجود');
        return false;
      }
      
      // التحقق من الحالة السابقة للأمر
      const prevStatus = order.status;
      
      // تحديث حالة الأمر في قاعدة البيانات
      const result = await this.databaseService.updateProductionOrderStatus(orderId, newStatus);
      
      if (!result) {
        return false;
      }

      // التعامل مع حالة التغيير من "مكتمل" إلى حالة أخرى (إلغاء تأثير الاكتمال)
      if (prevStatus === 'completed' && newStatus !== 'completed') {
        // استرجاع المواد الأولية المستهلكة
        const returnMaterials = order.ingredients.map(ingredient => ({
          code: ingredient.code,
          requiredQuantity: ingredient.requiredQuantity
        }));
        
        // إعادة المواد الأولية للمخزون
        await this.inventoryService.returnRawMaterials(returnMaterials);
        
        // إزالة المنتج النصف مصنع من المخزون
        await this.inventoryService.removeSemiFinishedFromInventory(order.productCode, order.quantity);
        
        toast.success(`تم تحديث حالة أمر الإنتاج إلى ${this.getStatusTranslation(newStatus)}`);
        return true;
      }

      // التحقق من توفر المكونات إذا كان التحديث إلى "مكتمل"
      if (newStatus === 'completed' && prevStatus !== 'completed') {
        // تجهيز متطلبات المواد الأولية
        const requirements = order.ingredients.map(ingredient => ({
          code: ingredient.code,
          requiredQuantity: ingredient.requiredQuantity
        }));
        
        // استهلاك المواد الأولية من المخزون
        const consumeSuccess = await this.inventoryService.consumeRawMaterials(requirements);
        if (!consumeSuccess) {
          // إعادة الحالة السابقة إذا فشلت العملية
          await this.databaseService.updateProductionOrderStatus(orderId, prevStatus);
          return false;
        }
        
        // تحديث الأهمية للمواد الأولية المستخدمة
        await this.inventoryService.updateRawMaterialsImportance(
          requirements.map(req => req.code)
        );
        
        // حساب التكلفة الإجمالية بناءً على تكلفة المواد الأولية
        const totalCost = await this.calculateProductionCost(requirements);
        
        // إضافة المنتج النصف مصنع للمخزون مع تحديث التكلفة
        const addSuccess = await this.inventoryService.addSemiFinishedToInventory(
          order.productCode, 
          order.quantity, 
          totalCost / order.quantity // تكلفة الوحدة
        );
        
        if (!addSuccess) {
          // استعادة المواد الأولية إذا فشلت العملية
          await this.inventoryService.returnRawMaterials(requirements);
          await this.databaseService.updateProductionOrderStatus(orderId, prevStatus);
          return false;
        }
        
        // تحديث تكلفة الأمر في قاعدة البيانات
        await this.databaseService.updateProductionOrderCost(orderId, totalCost);
      }
      
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
  
  // حساب تكلفة الإنتاج بناءً على المواد المستخدمة
  private async calculateProductionCost(requirements: { code: string, requiredQuantity: number }[]): Promise<number> {
    try {
      let totalCost = 0;
      
      for (const req of requirements) {
        const { data: rawMaterial } = await this.inventoryService.getRawMaterialByCode(req.code);
        if (rawMaterial) {
          totalCost += rawMaterial.unit_cost * req.requiredQuantity;
        }
      }
      
      return totalCost;
    } catch (error) {
      console.error('Error calculating production cost:', error);
      return 0;
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
  
  // تحديث أمر إنتاج
  public async updateProductionOrder(
    orderId: number,
    orderData: {
      productCode: string;
      productName: string;
      quantity: number;
      unit: string;
      ingredients: {
        code: string;
        name: string;
        requiredQuantity: number;
      }[];
    }
  ): Promise<boolean> {
    try {
      const result = await this.databaseService.updateProductionOrder(orderId, orderData);
      
      if (result) {
        toast.success(`تم تحديث أمر الإنتاج بنجاح`);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating production order:', error);
      toast.error('حدث خطأ أثناء تحديث أمر الإنتاج');
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
