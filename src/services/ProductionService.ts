import { toast } from "sonner";
import InventoryService from "./InventoryService";
import ProductionDatabaseService from "./database/ProductionDatabaseService";

// أنواع البيانات لأوامر الإنتاج
export interface ProductionOrder {
  id: number;
  code: string;
  product_code: string;
  productCode?: string; // Alias for flexibility
  product_name: string;
  productName?: string; // Alias for flexibility
  quantity: number;
  unit: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  date: string;
  ingredients?: {
    id: number;
    code: string;
    name: string;
    requiredQuantity: number;
    available: boolean;
  }[];
  total_cost: number;
  totalCost?: number; // Alias for flexibility
}

// أنواع البيانات لأوامر التعبئة
export interface PackagingOrder {
  id: number;
  code: string;
  product_code: string;
  productCode?: string; // Alias for flexibility
  product_name: string;
  productName?: string; // Alias for flexibility
  quantity: number;
  unit: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  date: string;
  semi_finished_code: string;
  semi_finished_name: string;
  semi_finished_quantity: number;
  semiFinished?: {
    code: string;
    name: string;
    quantity: number;
    available: boolean;
  };
  packagingMaterials?: {
    code: string;
    name: string;
    quantity: number;
    available: boolean;
  }[];
  total_cost: number;
  totalCost?: number; // Alias for flexibility
}

class ProductionService {
  private static instance: ProductionService;
  private inventoryService: InventoryService;
  private databaseService: ProductionDatabaseService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.databaseService = ProductionDatabaseService.getInstance();
  }
  
  public static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }
  
  public async getProductionOrders(): Promise<ProductionOrder[]> {
    try {
      const orders = await this.databaseService.getProductionOrders();
      
      return orders.map(order => ({
        ...order,
        productCode: order.product_code,
        productName: order.product_name,
        totalCost: order.total_cost
      }));
    } catch (error) {
      console.error('Error fetching production orders:', error);
      toast.error('حدث خطأ أثناء جلب أوامر الإنتاج');
      return [];
    }
  }
  
  public async getPackagingOrders(): Promise<PackagingOrder[]> {
    try {
      const orders = await this.databaseService.getPackagingOrders();
      
      return orders.map(order => ({
        ...order,
        productCode: order.product_code,
        productName: order.product_name,
        totalCost: order.total_cost,
        semiFinished: {
          code: order.semi_finished_code,
          name: order.semi_finished_name,
          quantity: order.semi_finished_quantity,
          available: true
        }
      }));
    } catch (error) {
      console.error('Error fetching packaging orders:', error);
      toast.error('حدث خطأ أثناء جلب أوامر التعبئة');
      return [];
    }
  }
  
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
      
      let finalTotalCost = totalCost;
      
      if (finalTotalCost === undefined) {
        let unitCost = 0;
        if (typeof product.unit_cost === 'number') {
          unitCost = product.unit_cost;
        } else if (typeof (product as any).unitCost === 'number') {
          unitCost = (product as any).unitCost;
        }
        
        finalTotalCost = unitCost * quantity;
      }
      
      console.log(`إنشاء أمر إنتاج: الكمية=${quantity}, التكلفة المستخدمة=${finalTotalCost}`);
      
      const newOrder = await this.databaseService.createProductionOrder(
        productCode,
        product.name,
        quantity,
        product.unit,
        ingredients,
        finalTotalCost
      );
      
      if (!newOrder) return null;
      
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
  
  public async updateProductionOrderStatus(orderId: number, newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'): Promise<boolean> {
    try {
      const orders = await this.getProductionOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر الإنتاج غير موجود');
        return false;
      }
      
      const prevStatus = order.status;
      
      if (prevStatus === 'completed' && newStatus !== 'completed') {
        console.log(`[DEBUG] إلغاء تأثير اكتمال الأمر ${orderId}`);
        
        const returnMaterials = order.ingredients.map(ingredient => ({
          code: ingredient.code,
          requiredQuantity: ingredient.requiredQuantity
        }));
        
        await this.inventoryService.returnRawMaterials(returnMaterials);
        
        await this.inventoryService.removeSemiFinishedFromInventory(order.productCode, order.quantity);
        
        const result = await this.databaseService.updateProductionOrderStatus(orderId, newStatus);
        if (result) {
          toast.success(`تم تحديث حالة أمر الإنتاج إلى ${this.getStatusTranslation(newStatus)}`);
        }
        return result;
      }

      if (newStatus === 'completed' && prevStatus !== 'completed') {
        console.log(`[DEBUG] بدء عملية اكتمال الأمر ${orderId}`);
        
        const requirements = order.ingredients.map(ingredient => ({
          code: ingredient.code,
          requiredQuantity: ingredient.requiredQuantity
        }));
        
        const allAvailable = await this.inventoryService.checkRawMaterialsAvailability(requirements);
        if (!allAvailable) {
          toast.error('بعض المواد الخام غير متوفرة بالكميات المطلوبة');
          return false;
        }
        
        const consumeSuccess = await this.inventoryService.consumeRawMaterials(requirements);
        if (!consumeSuccess) {
          toast.error('حدث خطأ أثناء استهلاك المواد الأولية');
          return false;
        }
        console.log(`[DEBUG] تم استهلاك المواد الأولية بنجاح للأمر ${orderId}`);
        
        const totalCost = await this.calculateProductionCost(requirements);
        
        try {
          const addSuccess = await this.inventoryService.addSemiFinishedToInventory(
            order.productCode, 
            order.quantity, 
            totalCost / order.quantity
          );
          
          if (!addSuccess) {
            await this.inventoryService.returnRawMaterials(requirements);
            toast.error('حدث خطأ أثناء إضافة المنتج النصف مصنع للمخزون');
            return false;
          }
          
          console.log(`[DEBUG] تم إضافة المنتج النصف مصنع للمخزون بنجاح للأمر ${orderId}`);
          
          await this.inventoryService.updateRawMaterialsImportance(
            requirements.map(req => req.code)
          );
          
          const statusUpdateSuccess = await this.databaseService.updateProductionOrderStatus(orderId, newStatus);
          if (!statusUpdateSuccess) {
            await this.inventoryService.returnRawMaterials(requirements);
            await this.inventoryService.removeSemiFinishedFromInventory(order.productCode, order.quantity);
            toast.error('حدث خطأ أثناء تحديث حالة أمر الإنتاج');
            return false;
          }
          
          await this.databaseService.updateProductionOrderCost(orderId, totalCost);
          
          toast.success(`تم تحديث حالة أمر الإنتاج إلى ${this.getStatusTranslation(newStatus)}`);
          return true;
        } catch (error) {
          console.error(`[ERROR] حدث خطأ أثناء معالجة أمر الإنتاج ${orderId}:`, error);
          await this.inventoryService.returnRawMaterials(requirements);
          toast.error('حدث خطأ أثناء معالجة أمر الإنتاج');
          return false;
        }
      }
      
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
      
      const semiFinishedCode = product.semiFinished.code;
      const semiFinishedQuantity = product.semiFinished.quantity * quantity;
      const semiAvailable = await this.inventoryService.checkSemiFinishedAvailability(semiFinishedCode, semiFinishedQuantity);
      
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
      
      let finalTotalCost = totalCost;
      
      if (finalTotalCost === undefined) {
        let unitCost = 0;
        if (typeof product.unit_cost === 'number') {
          unitCost = product.unit_cost;
        } else if (typeof (product as any).unitCost === 'number') {
          unitCost = (product as any).unitCost;
        }
        
        finalTotalCost = unitCost * quantity;
      }
      
      console.log(`إنشاء أمر تعبئة: الكمية=${quantity}, التكلفة المستخدمة=${finalTotalCost}`);
      
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
  
  public async updatePackagingOrderStatus(orderId: number, newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'): Promise<boolean> {
    try {
      const orders = await this.getPackagingOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر التعبئة غير موجود');
        return false;
      }
      
      const prevStatus = order.status;
      
      const result = await this.databaseService.updatePackagingOrderStatus(orderId, newStatus);
      
      if (!result) {
        return false;
      }
      
      if (prevStatus === 'completed' && newStatus !== 'completed') {
        await this.inventoryService.addSemiFinishedToInventory(
          order.semiFinished.code,
          order.semiFinished.quantity
        );
        
        const packagingReqs = order.packagingMaterials.map(material => ({
          code: material.code,
          requiredQuantity: material.quantity
        }));
        
        await this.inventoryService.returnPackagingMaterials(packagingReqs);
        
        await this.inventoryService.removeFinishedFromInventory(order.productCode, order.quantity);
        
        toast.success(`تم تحديث حالة أمر التعبئة إلى ${this.getStatusTranslation(newStatus)}`);
        return true;
      }

      if (newStatus === 'completed' && prevStatus !== 'completed') {
        const semiFinishedAvailable = await this.inventoryService.checkSemiFinishedAvailability(
          order.semiFinished.code, 
          order.semiFinished.quantity
        );
        
        if (!semiFinishedAvailable) {
          toast.error('المنتج النصف مصنع غير متوفر بالكمية المطلوبة');
          await this.databaseService.updatePackagingOrderStatus(orderId, prevStatus);
          return false;
        }
        
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
  
  public async deleteProductionOrder(orderId: number): Promise<boolean> {
    try {
      const orders = await this.getProductionOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر الإنتاج غير موجود');
        return false;
      }
      
      if (order.status !== 'pending') {
        toast.error('لا يمكن حذف أمر إنتاج قيد التنفيذ أو مكتمل');
        return false;
      }
      
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
  
  public async deletePackagingOrder(orderId: number): Promise<boolean> {
    try {
      const orders = await this.getPackagingOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        toast.error('أمر التعبئة غير موجود');
        return false;
      }
      
      if (order.status !== 'pending') {
        toast.error('لا يمكن حذف أمر تعبئة قيد التنفيذ أو مكتمل');
        return false;
      }
      
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
  
  private getStatusTranslation(status: string): string {
    const translations: Record<string, string> = {
      pending: 'قيد الانتظار',
      inProgress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };
    
    return translations[status] || status;
  }
  
  public async getProductionStats() {
    return await this.databaseService.getProductionStats();
  }
  
  public async getProductionChartData() {
    return await this.databaseService.getMonthlyProductionStats();
  }

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
      const orders = await this.getProductionOrders();
      const currentOrder = orders.find(o => o.id === orderId);
      
      if (!currentOrder) {
        toast.error('أمر الإنتاج غير موجود');
        return false;
      }

      let totalCost = currentOrder.totalCost;
      if (orderData.totalCost !== undefined) {
        totalCost = orderData.totalCost;
        console.log(`تحديث أمر إنتاج: استخدام التكلفة المحددة: ${totalCost}`);
      } else if (currentOrder.quantity !== orderData.quantity) {
        const unitCost = currentOrder.totalCost / currentOrder.quantity;
        totalCost = unitCost * orderData.quantity;
        console.log(`تحديث أمر إنتاج: حساب التكلفة الجديدة: ${totalCost} (سعر الوحدة: ${unitCost} × الكمية: ${orderData.quantity})`);
      } else {
        console.log(`تحديث أمر إنتاج: الاحتفاظ بالتكلفة الحالية: ${totalCost}`);
      }
      
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
      totalCost?: number;
    }
  ): Promise<boolean> {
    try {
      const orders = await this.getPackagingOrders();
      const currentOrder = orders.find(o => o.id === orderId);
      
      if (!currentOrder) {
        toast.error('أمر التعبئة غير موجود');
        return false;
      }

      let totalCost = currentOrder.totalCost;
      if (orderData.totalCost !== undefined) {
        totalCost = orderData.totalCost;
        console.log(`تحديث أمر تعبئة: استخدام التكلفة المحددة: ${totalCost}`);
      } else if (currentOrder.quantity !== orderData.quantity) {
        const unitCost = currentOrder.totalCost / currentOrder.quantity;
        totalCost = unitCost * orderData.quantity;
        console.log(`تحديث أمر تعبئة: حساب التكلفة الجديدة: ${totalCost} (سعر الوحدة: ${unitCost} × الكمية: ${orderData.quantity})`);
      } else {
        console.log(`تحديث أمر تعبئة: الاحتفاظ بالتكلفة الحالية: ${totalCost}`);
      }
      
      const result = await this.databaseService.updatePackagingOrder(orderId, {
        ...orderData,
        totalCost
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
