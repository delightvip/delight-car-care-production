import { toast } from "sonner";
import InventoryService from "./InventoryService";
import ProductionDatabaseService from "./database/ProductionDatabaseService";
import InventoryMovementTrackingService from "./inventory/InventoryMovementTrackingService";
import { supabase } from "../integrations/supabase/client";

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
  private movementTrackingService: InventoryMovementTrackingService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.databaseService = ProductionDatabaseService.getInstance();
    this.movementTrackingService = InventoryMovementTrackingService.getInstance();
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
  public async createProductionOrder(
    productCode: string, 
    quantity: number,
    totalCost?: number
  ): Promise<ProductionOrder | null> {
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
      
      // تحديد التكلفة الإجمالية (استخدام القيمة المرسلة إذا تم توفيرها)
      let finalTotalCost = totalCost;
      
      // إذا لم يتم تمرير التكلفة، قم بحسابها
      if (finalTotalCost === undefined) {
        // حساب التكلفة الإجمالية بطريقة آمنة مع التحقق من وجود خاصية unit_cost
        let unitCost = 0;
        if (typeof product.unit_cost === 'number') {
          unitCost = product.unit_cost;
        } else if (typeof (product as any).unitCost === 'number') {
          // محاولة استخدام unitCost إذا كانت unit_cost غير موجودة
          unitCost = (product as any).unitCost;
        }
        
        finalTotalCost = unitCost * quantity;
      }
      
      console.log(`إنشاء أمر إنتاج: الكمية=${quantity}, التكلفة المستخدمة=${finalTotalCost}`);
      
      // إنشاء أمر الإنتاج في قاعدة البيانات
      const newOrder = await this.databaseService.createProductionOrder(
        productCode,
        product.name,
        quantity,
        product.unit,
        ingredients,
        finalTotalCost
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
      
      // التحقق من الحالة السابقة للأمر
      const prevStatus = order.status;
        // التعامل مع حالة التغيير من "مكتمل" إلى حالة أخرى (إلغاء تأثير الاكتمال)
      if (prevStatus === 'completed' && newStatus !== 'completed') {
        console.log(`[DEBUG] إلغاء تأثير اكتمال الأمر ${orderId}`);
        
        // استرجاع المواد الأولية المستهلكة
        const returnMaterials = order.ingredients.map(ingredient => ({
          code: ingredient.code,
          requiredQuantity: ingredient.requiredQuantity
        }));
        
        // إعادة المواد الأولية للمخزون
        await this.inventoryService.returnRawMaterials(returnMaterials);
        
        // إزالة المنتج النصف مصنع من المخزون
        await this.inventoryService.removeSemiFinishedFromInventory(order.productCode, order.quantity);
        
        // تسجيل حركات عكسية في المخزون (إلغاء الحركات السابقة)
        try {
          // 1. تسجيل حركة وارد للمواد الخام (إرجاع المواد المستهلكة)
          for (const ingredient of order.ingredients) {
            try {
              // التحقق من معرف المادة الخام في قاعدة البيانات
              const { data: rawMaterial } = await supabase
                .from('raw_materials')
                .select('id')
                .eq('code', ingredient.code)
                .single();
                
              if (rawMaterial && rawMaterial.id) {                // تسجيل حركة الوارد للمادة الخام
                await this.movementTrackingService.recordMovement({
                  item_id: rawMaterial.id.toString(),
                  item_type: 'raw',
                  movement_type: 'in',
                  quantity: ingredient.requiredQuantity,
                  reason: `إلغاء أمر إنتاج #${order.code}`,
                  updateBalance: false // منع تحديث الرصيد مرة أخرى
                });
                console.log(`[DEBUG] تم تسجيل حركة مخزون وارد للمادة الخام ${ingredient.name} (إلغاء)`);
              }
            } catch (err) {
              console.error(`[ERROR] خطأ في تسجيل حركة المخزون العكسية للمادة الخام ${ingredient.code}:`, err);
            }
          }
          
          // 2. تسجيل حركة صادر للمنتج النصف مصنع (إزالة المنتج)
          try {
            const { data: semiFinished } = await supabase
              .from('semi_finished_products')
              .select('id')
              .eq('code', order.productCode)
              .single();
              
            if (semiFinished && semiFinished.id) {              // تسجيل حركة الصادر للمنتج النصف مصنع
              await this.movementTrackingService.recordMovement({
                item_id: semiFinished.id.toString(),
                item_type: 'semi',
                movement_type: 'out',
                quantity: order.quantity,
                reason: `إلغاء أمر إنتاج #${order.code}`,
                updateBalance: false // منع تحديث الرصيد مرة أخرى
              });
              console.log(`[DEBUG] تم تسجيل حركة مخزون صادر للمنتج النصف مصنع ${order.productName} (إلغاء)`);
            }
          } catch (err) {
            console.error(`[ERROR] خطأ في تسجيل حركة المخزون العكسية للمنتج النصف مصنع ${order.productCode}:`, err);
          }
        } catch (error) {
          console.error("[ERROR] حدث خطأ أثناء تسجيل حركات المخزون العكسية:", error);
        }
        
        // تحديث حالة الأمر في قاعدة البيانات بعد نجاح العمليات السابقة
        const result = await this.databaseService.updateProductionOrderStatus(orderId, newStatus);
        if (result) {
          toast.success(`تم تحديث حالة أمر الإنتاج إلى ${this.getStatusTranslation(newStatus)}`);
        }
        return result;
      }

      // التحقق من توفر المكونات إذا كان التحديث إلى "مكتمل"
      if (newStatus === 'completed' && prevStatus !== 'completed') {
        console.log(`[DEBUG] بدء عملية اكتمال الأمر ${orderId}`);
        
        // تجهيز متطلبات المواد الأولية
        const requirements = order.ingredients.map(ingredient => ({
          code: ingredient.code,
          requiredQuantity: ingredient.requiredQuantity
        }));
        
        // التحقق من توفر جميع المواد الخام أولاً
        const allAvailable = await this.inventoryService.checkRawMaterialsAvailability(requirements);
        if (!allAvailable) {
          toast.error('بعض المواد الخام غير متوفرة بالكميات المطلوبة');
          return false;
        }
        
        // محاولة استهلاك المواد الأولية من المخزون
        const consumeSuccess = await this.inventoryService.consumeRawMaterials(requirements);
        if (!consumeSuccess) {
          toast.error('حدث خطأ أثناء استهلاك المواد الأولية');
          return false;
        }          console.log(`[DEBUG] تم استهلاك المواد الأولية بنجاح للأمر ${orderId}`);
        
        // حساب التكلفة الإجمالية بناءً على تكلفة المواد الأولية
        const totalCost = await this.calculateProductionCost(requirements);
        
        try {
          // محاولة إضافة المنتج النصف مصنع للمخزون
          const addSuccess = await this.inventoryService.addSemiFinishedToInventory(
            order.productCode, 
            order.quantity, 
            totalCost / order.quantity // تكلفة الوحدة
          );
          
          if (!addSuccess) {
            // استعادة المواد الأولية إذا فشلت عملية الإضافة
            console.error(`[ERROR] فشل في إضافة المنتج النصف مصنع للمخزون للأمر ${orderId}`);
            await this.inventoryService.returnRawMaterials(requirements);
            toast.error('حدث خطأ أثناء إضافة المنتج النصف مصنع للمخزون');
            return false;
          }
          
          console.log(`[DEBUG] تم إضافة المنتج النصف مصنع للمخزون بنجاح للأمر ${orderId}`);
          
          // تسجيل حركات المخزون للمواد الخام المستهلكة
          for (const ingredient of order.ingredients) {
            try {
              // التحقق من معرف المادة الخام في قاعدة البيانات
              const { data: rawMaterial } = await supabase
                .from('raw_materials')
                .select('id')
                .eq('code', ingredient.code)
                .single();
                
              if (rawMaterial && rawMaterial.id) {                // تسجيل حركة الصادر للمادة الخام
                await this.movementTrackingService.recordMovement({
                  item_id: rawMaterial.id.toString(),
                  item_type: 'raw',
                  movement_type: 'out',
                  quantity: ingredient.requiredQuantity,
                  reason: `أمر إنتاج #${order.code}`,
                  updateBalance: false // منع تحديث الرصيد مرة أخرى
                });
                console.log(`[DEBUG] تم تسجيل حركة مخزون صادر للمادة الخام ${ingredient.name}`);
              }
            } catch (err) {
              console.error(`[ERROR] خطأ في تسجيل حركة المخزون للمادة الخام ${ingredient.code}:`, err);
            }
          }
          
          // تسجيل حركة المخزون للمنتج النصف مصنع المنتج
          try {
            // التحقق من معرف المنتج النصف مصنع في قاعدة البيانات
            const { data: semiFinished } = await supabase
              .from('semi_finished_products')
              .select('id')
              .eq('code', order.productCode)
              .single();
              
            if (semiFinished && semiFinished.id) {              // تسجيل حركة الوارد للمنتج النصف مصنع
              await this.movementTrackingService.recordMovement({
                item_id: semiFinished.id.toString(),
                item_type: 'semi',
                movement_type: 'in',
                quantity: order.quantity,
                reason: `أمر إنتاج #${order.code}`,
                updateBalance: false // منع تحديث الرصيد مرة أخرى
              });
              console.log(`[DEBUG] تم تسجيل حركة مخزون وارد للمنتج النصف مصنع ${order.productName}`);
            }
          } catch (err) {
            console.error(`[ERROR] خطأ في تسجيل حركة المخزون للمنتج النصف مصنع ${order.productCode}:`, err);
          }
          
          // تحديث الأهمية للمواد الأولية المستخدمة
          await this.inventoryService.updateRawMaterialsImportance(
            requirements.map(req => req.code)
          );
          
          // تحديث حالة الأمر وتكلفته في قاعدة البيانات بعد نجاح العمليات السابقة
          const statusUpdateSuccess = await this.databaseService.updateProductionOrderStatus(orderId, newStatus);
          if (!statusUpdateSuccess) {
            // حاول إعادة المواد الخام واسترجاع المنتج النصف مصنع إذا فشل تحديث الحالة
            console.error(`[ERROR] فشل في تحديث حالة الأمر ${orderId}`);
            await this.inventoryService.returnRawMaterials(requirements);
            await this.inventoryService.removeSemiFinishedFromInventory(order.productCode, order.quantity);
            toast.error('حدث خطأ أثناء تحديث حالة أمر الإنتاج');
            return false;
          }
          
          // تحديث تكلفة الأمر في قاعدة البيانات
          await this.databaseService.updateProductionOrderCost(orderId, totalCost);
          
          toast.success(`تم تحديث حالة أمر الإنتاج إلى ${this.getStatusTranslation(newStatus)}`);
          return true;
        } catch (error) {
          console.error(`[ERROR] حدث خطأ أثناء معالجة أمر الإنتاج ${orderId}:`, error);
          // محاولة استعادة المواد الخام في حالة حدوث خطأ
          await this.inventoryService.returnRawMaterials(requirements);
          toast.error('حدث خطأ أثناء معالجة أمر الإنتاج');
          return false;
        }
      }
      
      // في حالة تغيير الحالة إلى "قيد التنفيذ" - لا نقوم بأي تأثير على المخزون
      if (newStatus === 'inProgress') {
        console.log(`[DEBUG] تغيير حالة الأمر ${orderId} إلى قيد التنفيذ بدون تأثير على المخزون`);
      }
      
      // في حالة تغيير الحالة إلى غير "مكتمل" (مثلاً: قيد الانتظار، قيد التنفيذ، ملغي)
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
  
  // إنشاء أمر تعبئة جديد
  public async createPackagingOrder(
    finishedProductCode: string,
    quantity: number,
    totalCost?: number
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
      
      // تحديد التكلفة الإجمالية (استخدام القيمة المرسلة إذا تم توفيرها)
      let finalTotalCost = totalCost;
      
      // إذا لم يتم تمرير التكلفة، قم بحسابها
      if (finalTotalCost === undefined) {
        // الحصول على تكلفة المنتج النصف مصنع
        const { data: semiFinishedProduct } = await supabase
          .from("semi_finished_products")
          .select("unit_cost")
          .eq("code", semiFinishedCode)
          .single();
          
        const semiFinishedUnitCost = Number(semiFinishedProduct?.unit_cost || 0);
        const semiFinishedTotalCost = semiFinishedUnitCost * semiFinishedQuantity;
        
        // حساب تكلفة مواد التعبئة
        let packagingTotalCost = 0;
        for (const pkg of product.packaging) {
          const pkgQuantity = pkg.quantity * quantity;
          const { data: packagingMaterial } = await supabase
            .from("packaging_materials")
            .select("unit_cost")
            .eq("code", pkg.code)
            .single();
            
          const pkgUnitCost = Number(packagingMaterial?.unit_cost || 0);
          packagingTotalCost += pkgUnitCost * pkgQuantity;
        }
        
        // التكلفة الإجمالية = تكلفة المنتج النصف مصنع + تكلفة مواد التعبئة
        finalTotalCost = semiFinishedTotalCost + packagingTotalCost;
        
        console.log(`تكلفة المنتج النصف مصنع: ${semiFinishedTotalCost}, تكلفة مواد التعبئة: ${packagingTotalCost}`);
      }
      
      console.log(`إنشاء أمر تعبئة: الكمية=${quantity}, التكلفة المستخدمة=${finalTotalCost}`);
      
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
        finalTotalCost
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
      
      // التحقق من الحالة السابقة للأمر
      const prevStatus = order.status;
      
      // التعامل مع حالة التغيير من "مكتمل" إلى حالة أخرى (إلغاء تأثير الاكتمال)
      if (prevStatus === 'completed' && newStatus !== 'completed') {
        // تحديث حالة الأمر في قاعدة البيانات أولاً
        const updateResult = await this.databaseService.updatePackagingOrderStatus(orderId, newStatus);
        if (!updateResult) {
          return false;
        }
        
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
        
        // تحديث حالة الأمر في قاعدة البيانات
        const updateResult = await this.databaseService.updatePackagingOrderStatus(orderId, newStatus);
        if (!updateResult) {
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
          // إعادة الحالة السابقة إذا فشلت العملية
          await this.databaseService.updatePackagingOrderStatus(orderId, prevStatus);
          return false;
        }
        
        toast.success(`تم تحديث حالة أمر التعبئة إلى ${this.getStatusTranslation(newStatus)}`);
        return true;
      }
      
      // في حالة تغيير الحالة إلى "قيد التنفيذ" - لا نقوم بأي تأثير على المخزون
      if (newStatus === 'inProgress') {
        console.log(`[DEBUG] تغيير حالة أمر التعبئة ${orderId} إلى قيد التنفيذ بدون تأثير على المخزون`);
      }
      
      // تحديث حالة الأمر في قاعدة البيانات فقط (للحالات الأخرى مثل "قيد التنفيذ" أو "ملغي")
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
      totalCost?: number;
    }
  ): Promise<boolean> {
    try {
      // الحصول على أمر الإنتاج الحالي للحفاظ على التكلفة الإجمالية
      const orders = await this.getProductionOrders();
      const currentOrder = orders.find(o => o.id === orderId);
      
      if (!currentOrder) {
        toast.error('أمر الإنتاج غير موجود');
        return false;
      }

      // حساب التكلفة الجديدة إذا تغيرت الكمية
      let totalCost = currentOrder.totalCost;
      if (orderData.totalCost !== undefined) {
        // استخدام التكلفة المرسلة إذا تم تحديدها
        totalCost = orderData.totalCost;
        console.log(`تحديث أمر إنتاج: استخدام التكلفة المحددة: ${totalCost}`);
      } else if (currentOrder.quantity !== orderData.quantity) {
        // حساب متوسط تكلفة الوحدة ثم حساب التكلفة الجديدة بناءً على الكمية الجديدة
        const unitCost = currentOrder.totalCost / currentOrder.quantity;
        totalCost = unitCost * orderData.quantity;
        console.log(`تحديث أمر إنتاج: حساب التكلفة الجديدة: ${totalCost} (سعر الوحدة: ${unitCost} × الكمية: ${orderData.quantity})`);
      } else {
        console.log(`تحديث أمر إنتاج: الاحتفاظ بالتكلفة الحالية: ${totalCost}`);
      }
      
      // طباعة البيانات قبل الإرسال لقاعدة البيانات
      console.log('بيانات تحديث أمر الإنتاج:', {
        id: orderId,
        ...orderData,
        totalCost
      });
      
      const result = await this.databaseService.updateProductionOrder(orderId, {
        ...orderData,
        totalCost
      });
      
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
      totalCost?: number; // إضافة معامل التكلفة الإجمالية الاختياري
    }
  ): Promise<boolean> {
    try {
      // الحصول على أمر التعبئة الحالي للحفاظ على التكلفة الإجمالية
      const orders = await this.getPackagingOrders();
      const currentOrder = orders.find(o => o.id === orderId);
      
      if (!currentOrder) {
        toast.error('أمر التعبئة غير موجود');
        return false;
      }

      // حساب التكلفة الجديدة إذا تغيرت الكمية
      let totalCost = currentOrder.totalCost;
      if (orderData.totalCost !== undefined) {
        // استخدام التكلفة المرسلة إذا تم تحديدها
        totalCost = orderData.totalCost;
        console.log(`تحديث أمر تعبئة: استخدام التكلفة المحددة: ${totalCost}`);
      } else if (currentOrder.quantity !== orderData.quantity) {
        // حساب متوسط تكلفة الوحدة ثم حساب التكلفة الجديدة بناءً على الكمية الجديدة
        const unitCost = currentOrder.totalCost / currentOrder.quantity;
        totalCost = unitCost * orderData.quantity;
        console.log(`تحديث أمر تعبئة: حساب التكلفة الجديدة: ${totalCost} (سعر الوحدة: ${unitCost} × الكمية: ${orderData.quantity})`);
      } else {
        console.log(`تحديث أمر تعبئة: الاحتفاظ بالتكلفة الحالية: ${totalCost}`);
      }
      
      // طباعة البيانات قبل الإرسال لقاعدة البيانات
      console.log('بيانات تحديث أمر التعبئة:', {
        id: orderId,
        ...orderData,
        totalCost
      });
      
      const result = await this.databaseService.updatePackagingOrder(orderId, {
        ...orderData,
        totalCost // تمرير التكلفة الإجمالية الحالية أو المحسوبة
      });
      
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
}

export default ProductionService;
