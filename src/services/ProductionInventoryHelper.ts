
import InventoryService from './InventoryService';
import { toast } from 'sonner';
import ProductionDatabaseService from './database/ProductionDatabaseService';

/**
 * مساعد لإدارة العلاقة بين أوامر الإنتاج والمخزون
 */
class ProductionInventoryHelper {
  private static instance: ProductionInventoryHelper;
  private inventoryService: InventoryService;
  private productionDatabaseService: ProductionDatabaseService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.productionDatabaseService = ProductionDatabaseService.getInstance();
  }
  
  public static getInstance(): ProductionInventoryHelper {
    if (!ProductionInventoryHelper.instance) {
      ProductionInventoryHelper.instance = new ProductionInventoryHelper();
    }
    return ProductionInventoryHelper.instance;
  }

  /**
   * تحديث حالة أمر الإنتاج مع التأثير المناسب على المخزون
   */
  public async handleProductionOrderStatusChange(
    orderId: number, 
    newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled',
    previousStatus: string
  ): Promise<boolean> {
    try {
      console.log(`[ProductionInventoryHelper] تغيير حالة أمر الإنتاج ${orderId} من ${previousStatus} إلى ${newStatus}`);
      
      // إذا تم إلغاء أمر كان قيد التنفيذ، نعيد المواد المستهلكة إلى المخزون
      if (newStatus === 'cancelled' && previousStatus === 'inProgress') {
        const order = await this.getProductionOrderDetails(orderId);
        if (!order) return false;
        
        // استرجاع المواد الخام إلى المخزون
        if (order.ingredients && order.ingredients.length > 0) {
          const materials = order.ingredients.map(ingredient => ({
            code: ingredient.code,
            requiredQuantity: ingredient.requiredQuantity
          }));
          
          await this.inventoryService.returnRawMaterials(materials);
          console.log(`[ProductionInventoryHelper] تم إعادة المواد الخام للأمر ${orderId} إلى المخزون`);
        }
      }
      
      // إذا تغيرت الحالة إلى قيد التنفيذ، نخصم المواد من المخزون
      if (newStatus === 'inProgress' && previousStatus === 'pending') {
        const order = await this.getProductionOrderDetails(orderId);
        if (!order) return false;
        
        // التحقق من توفر جميع المواد المطلوبة
        if (order.ingredients && order.ingredients.length > 0) {
          const materials = order.ingredients.map(ingredient => ({
            code: ingredient.code,
            requiredQuantity: ingredient.requiredQuantity
          }));
          
          const materialsAvailable = await this.inventoryService.checkRawMaterialsAvailability(materials);
          if (!materialsAvailable) {
            toast.error('لا يمكن بدء التنفيذ: بعض المواد الخام غير متوفرة بالكميات المطلوبة');
            return false;
          }
          
          // خصم المواد من المخزون
          const consumed = await this.inventoryService.consumeRawMaterials(materials);
          if (!consumed) {
            toast.error('حدث خطأ أثناء خصم المواد من المخزون');
            return false;
          }
          
          console.log(`[ProductionInventoryHelper] تم خصم المواد الخام للأمر ${orderId} من المخزون`);
        }
      }
      
      // إذا تم الانتهاء من الأمر، نضيف المنتج النصف مصنع إلى المخزون
      if (newStatus === 'completed' && (previousStatus === 'inProgress' || previousStatus === 'pending')) {
        const order = await this.getProductionOrderDetails(orderId);
        if (!order) return false;
        
        // تحديث أهمية المواد الخام
        if (order.ingredients && order.ingredients.length > 0) {
          const materialCodes = order.ingredients.map(ingredient => ingredient.code);
          await this.inventoryService.updateRawMaterialsImportance(materialCodes);
        }
        
        // إضافة المنتج نصف المصنع إلى المخزون
        // نفترض أن كود المنتج نصف المصنع هو نفس كود المنتج في أمر الإنتاج
        await this.inventoryService.addSemiFinishedToInventory(
          order.productCode,
          order.quantity,
          order.totalCost / order.quantity // وحدة التكلفة
        );
        
        console.log(`[ProductionInventoryHelper] تم إضافة المنتج نصف المصنع ${order.productCode} للمخزون بكمية ${order.quantity}`);
      }
      
      // تحديث حالة الأمر في قاعدة البيانات
      const updated = await this.productionDatabaseService.updateProductionOrderStatus(orderId, newStatus);
      if (!updated) {
        toast.error('حدث خطأ أثناء تحديث حالة أمر الإنتاج');
        return false;
      }
      
      console.log(`[ProductionInventoryHelper] تم تحديث حالة أمر الإنتاج ${orderId} بنجاح إلى ${newStatus}`);
      return true;
    } catch (error) {
      console.error('[ProductionInventoryHelper] خطأ في تحديث حالة أمر الإنتاج:', error);
      toast.error('حدث خطأ أثناء تحديث حالة أمر الإنتاج');
      return false;
    }
  }

  /**
   * تحديث حالة أمر التعبئة مع التأثير المناسب على المخزون
   */
  public async handlePackagingOrderStatusChange(
    orderId: number, 
    newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled',
    previousStatus: string
  ): Promise<boolean> {
    try {
      console.log(`[ProductionInventoryHelper] تغيير حالة أمر التعبئة ${orderId} من ${previousStatus} إلى ${newStatus}`);
      
      // إذا تم إلغاء أمر كان قيد التنفيذ، نعيد المواد المستهلكة إلى المخزون
      if (newStatus === 'cancelled' && previousStatus === 'inProgress') {
        const order = await this.getPackagingOrderDetails(orderId);
        if (!order) return false;
        
        // إعادة المنتج نصف المصنع للمخزون
        if (order.semiFinished) {
          await this.inventoryService.addSemiFinishedToInventory(
            order.semiFinished.code,
            order.semiFinished.quantity
          );
        }
        
        // إعادة مواد التعبئة للمخزون
        if (order.packagingMaterials && order.packagingMaterials.length > 0) {
          const materials = order.packagingMaterials.map(material => ({
            code: material.code,
            requiredQuantity: material.quantity
          }));
          
          await this.inventoryService.returnPackagingMaterials(materials);
        }
        
        console.log(`[ProductionInventoryHelper] تم إعادة المواد المستخدمة في أمر التعبئة ${orderId} إلى المخزون`);
      }
      
      // إذا تغيرت الحالة إلى قيد التنفيذ، نخصم المواد من المخزون
      if (newStatus === 'inProgress' && previousStatus === 'pending') {
        const order = await this.getPackagingOrderDetails(orderId);
        if (!order) return false;
        
        // التحقق من توفر المنتج نصف المصنع
        if (order.semiFinished) {
          const semiFinishedAvailable = await this.inventoryService.checkSemiFinishedAvailability(
            order.semiFinished.code,
            order.semiFinished.quantity
          );
          
          if (!semiFinishedAvailable) {
            toast.error(`المنتج النصف مصنع ${order.semiFinished.name} غير متوفر بالكمية المطلوبة`);
            return false;
          }
          
          // خصم المنتج نصف المصنع من المخزون
          await this.inventoryService.removeSemiFinishedFromInventory(
            order.semiFinished.code,
            order.semiFinished.quantity
          );
        }
        
        // التحقق من توفر مواد التعبئة
        if (order.packagingMaterials && order.packagingMaterials.length > 0) {
          const materials = order.packagingMaterials.map(material => ({
            code: material.code,
            requiredQuantity: material.quantity
          }));
          
          const materialsAvailable = await this.inventoryService.checkPackagingAvailability(materials);
          if (!materialsAvailable) {
            // إعادة المنتج نصف المصنع للمخزون في حالة عدم توفر مواد التعبئة
            if (order.semiFinished) {
              await this.inventoryService.addSemiFinishedToInventory(
                order.semiFinished.code,
                order.semiFinished.quantity
              );
            }
            
            toast.error('بعض مواد التعبئة غير متوفرة بالكميات المطلوبة');
            return false;
          }
          
          // خصم مواد التعبئة من المخزون
          const materialsConsumed = await this.consumePackagingMaterials(materials);
          if (!materialsConsumed) {
            // إعادة المنتج نصف المصنع للمخزون في حالة فشل خصم مواد التعبئة
            if (order.semiFinished) {
              await this.inventoryService.addSemiFinishedToInventory(
                order.semiFinished.code,
                order.semiFinished.quantity
              );
            }
            
            toast.error('حدث خطأ أثناء خصم مواد التعبئة من المخزون');
            return false;
          }
        }
        
        console.log(`[ProductionInventoryHelper] تم خصم المواد المستخدمة في أمر التعبئة ${orderId} من المخزون`);
      }
      
      // إذا تم الانتهاء من الأمر، نضيف المنتج النهائي إلى المخزون
      if (newStatus === 'completed' && (previousStatus === 'inProgress' || previousStatus === 'pending')) {
        const order = await this.getPackagingOrderDetails(orderId);
        if (!order) return false;
        
        // إنتاج المنتج النهائي
        const produced = await this.inventoryService.produceFinishedProduct(
          order.productCode,
          order.quantity,
          order.semiFinished.code,
          order.semiFinished.quantity,
          order.packagingMaterials.map(material => ({
            code: material.code,
            requiredQuantity: material.quantity
          }))
        );
        
        if (!produced) {
          toast.error('حدث خطأ أثناء إنتاج المنتج النهائي');
          return false;
        }
        
        console.log(`[ProductionInventoryHelper] تم إضافة المنتج النهائي ${order.productCode} للمخزون بكمية ${order.quantity}`);
      }
      
      // تحديث حالة الأمر في قاعدة البيانات
      const updated = await this.productionDatabaseService.updatePackagingOrderStatus(orderId, newStatus);
      if (!updated) {
        toast.error('حدث خطأ أثناء تحديث حالة أمر التعبئة');
        return false;
      }
      
      console.log(`[ProductionInventoryHelper] تم تحديث حالة أمر التعبئة ${orderId} بنجاح إلى ${newStatus}`);
      return true;
    } catch (error) {
      console.error('[ProductionInventoryHelper] خطأ في تحديث حالة أمر التعبئة:', error);
      toast.error('حدث خطأ أثناء تحديث حالة أمر التعبئة');
      return false;
    }
  }

  /**
   * الحصول على تفاصيل أمر الإنتاج
   */
  private async getProductionOrderDetails(orderId: number) {
    const orders = await this.productionDatabaseService.getProductionOrders();
    return orders.find(order => order.id === orderId);
  }

  /**
   * الحصول على تفاصيل أمر التعبئة
   */
  private async getPackagingOrderDetails(orderId: number) {
    const orders = await this.productionDatabaseService.getPackagingOrders();
    return orders.find(order => order.id === orderId);
  }

  /**
   * استهلاك مواد التعبئة من المخزون
   */
  private async consumePackagingMaterials(materials: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data: packagingMaterial } = await this.inventoryService.getPackagingMaterialByCode(material.code);
        if (!packagingMaterial) {
          console.error(`[ProductionInventoryHelper] مادة التعبئة ${material.code} غير موجودة`);
          return false;
        }
        
        if (packagingMaterial.quantity < material.requiredQuantity) {
          console.error(`[ProductionInventoryHelper] مادة التعبئة ${material.code} غير متوفرة بالكمية المطلوبة`);
          return false;
        }
        
        await this.inventoryService.updatePackagingMaterial(packagingMaterial.id, {
          quantity: packagingMaterial.quantity - material.requiredQuantity
        });
      }
      
      return true;
    } catch (error) {
      console.error('[ProductionInventoryHelper] خطأ في استهلاك مواد التعبئة:', error);
      return false;
    }
  }
}

export default ProductionInventoryHelper;
