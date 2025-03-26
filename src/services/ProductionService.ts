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
  private inventoryService: ReturnType<typeof InventoryService.getInstance>;
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
    return await this.databaseService.getProductionOrders();
  }
  
  public async getPackagingOrders(): Promise<PackagingOrder[]> {
    return await this.databaseService.getPackagingOrders();
  }
  
  public async createProductionOrder(productCode: string, quantity: number): Promise<ProductionOrder | null> {
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
      
      const totalCost = product.unit_cost * quantity;
      
      const newOrder = await this.databaseService.createProductionOrder(
        productCode,
        product.name,
        quantity,
        product.unit,
        ingredients,
        totalCost
      );
      
      if (!newOrder) return null;
      
      const allAvailable = ingredients.every(i => i.available);
      if (!allAvailable) {
        toast.warning('بع�� المكونات غير متوفرة بالكمية المطلوبة. تم حفظ الأمر كمسودة.');
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
      
      const result = await this.databaseService.updateProductionOrderStatus(orderId, newStatus);
      
      if (!result) {
        return false;
      }
      
      if (prevStatus === 'completed' && newStatus !== 'completed') {
        const returnMaterials = order.ingredients.map(ingredient => ({
          code: ingredient.code,
          requiredQuantity: ingredient.requiredQuantity
        }));
        
        await this.inventoryService.returnRawMaterials(returnMaterials);
        
        await this.inventoryService.removeSemiFinishedFromInventory(order.productCode, order.quantity);
        
        toast.success(`تم تحديث حالة أمر الإنتاج إلى ${this.getStatusTranslation(newStatus)}`);
        return true;
      }
      
      if (newStatus === 'completed' && prevStatus !== 'completed') {
        const requirements = order.ingredients.map(ingredient => ({
          code: ingredient.code,
          requiredQuantity: ingredient.requiredQuantity
        }));
        
        const consumeSuccess = await this.inventoryService.consumeRawMaterials(requirements);
        if (!consumeSuccess) {
          await this.databaseService.updateProductionOrderStatus(orderId, prevStatus);
          return false;
        }
        
        await this.inventoryService.updateRawMaterialsImportance(
          requirements.map(req => req.code)
        );
        
        const totalCost = await this.calculateProductionCost(requirements);
        
        const addSuccess = await this.inventoryService.addSemiFinishedToInventory(
          order.productCode, 
          order.quantity, 
          totalCost / order.quantity
        );
        
        if (!addSuccess) {
          await this.inventoryService.returnRawMaterials(requirements);
          await this.databaseService.updateProductionOrderStatus(orderId, prevStatus);
          return false;
        }
        
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
    quantity: number
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
      
      const totalCost = product.unit_cost * quantity;
      
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
}

export default ProductionService;
