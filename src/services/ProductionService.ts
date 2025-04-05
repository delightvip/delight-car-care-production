
import { toast } from "sonner";
import ProductionOrderService from "./production/ProductionOrderService";
import PackagingOrderService from "./production/PackagingOrderService";
import ProductionStatsService from "./production/ProductionStatsService";
import { 
  ProductionOrder, 
  PackagingOrder,
  ProductionStats,
  MonthlyProductionStats
} from "./production/ProductionTypes";

class ProductionService {
  private static instance: ProductionService;
  private productionOrderService: ProductionOrderService;
  private packagingOrderService: PackagingOrderService;
  private statsService: ProductionStatsService;
  
  private constructor() {
    this.productionOrderService = ProductionOrderService.getInstance();
    this.packagingOrderService = PackagingOrderService.getInstance();
    this.statsService = ProductionStatsService.getInstance();
  }
  
  // الحصول على كائن وحيد من الخدمة (نمط Singleton)
  public static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }
  
  // ---- خدمات أوامر الإنتاج ----
  
  // الحصول على جميع أوامر الإنتاج
  public async getProductionOrders(): Promise<ProductionOrder[]> {
    return await this.productionOrderService.getProductionOrders();
  }
  
  // إنشاء أمر إنتاج جديد
  public async createProductionOrder(productCode: string, quantity: number): Promise<ProductionOrder | null> {
    return await this.productionOrderService.createProductionOrder(productCode, quantity);
  }
  
  // تحديث حالة أمر إنتاج
  public async updateProductionOrderStatus(
    orderId: number, 
    newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    return await this.productionOrderService.updateProductionOrderStatus(orderId, newStatus);
  }
  
  // حذف أمر إنتاج
  public async deleteProductionOrder(orderId: number): Promise<boolean> {
    return await this.productionOrderService.deleteProductionOrder(orderId);
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
    return await this.productionOrderService.updateProductionOrder(orderId, orderData);
  }
  
  // ---- خدمات أوامر التعبئة ----
  
  // الحصول على جميع أوامر التعبئة
  public async getPackagingOrders(): Promise<PackagingOrder[]> {
    return await this.packagingOrderService.getPackagingOrders();
  }
  
  // إنشاء أمر تعبئة جديد
  public async createPackagingOrder(
    finishedProductCode: string,
    quantity: number
  ): Promise<PackagingOrder | null> {
    return await this.packagingOrderService.createPackagingOrder(finishedProductCode, quantity);
  }
  
  // تحديث حالة أمر تعبئة
  public async updatePackagingOrderStatus(
    orderId: number, 
    newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    return await this.packagingOrderService.updatePackagingOrderStatus(orderId, newStatus);
  }
  
  // حذف أمر تعبئة
  public async deletePackagingOrder(orderId: number): Promise<boolean> {
    return await this.packagingOrderService.deletePackagingOrder(orderId);
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
    return await this.packagingOrderService.updatePackagingOrder(orderId, orderData);
  }
  
  // ---- خدمات الإحصائيات ----
  
  // الحصول على بيانات إحصائية للإنتاج
  public async getProductionStats(): Promise<ProductionStats> {
    return await this.statsService.getProductionStats();
  }
  
  // الحصول على بيانات الإنتاج للرسوم البيانية
  public async getProductionChartData(): Promise<MonthlyProductionStats[]> {
    return await this.statsService.getProductionChartData();
  }
}

export default ProductionService;
