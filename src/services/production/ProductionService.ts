
import { toast } from "sonner";
import InventoryService from "../InventoryService";
import ProductionDatabaseService from "../database/ProductionDatabaseService";
import { PackagingOrder, ProductionOrder } from "./types/ProductionTypes";
import { ProductionOrdersService } from "./services/ProductionOrdersService";
import { PackagingOrdersService } from "./services/PackagingOrdersService";
import { ProductionStatsService } from "./services/ProductionStatsService";

class ProductionService {
  private static instance: ProductionService;
  private inventoryService: InventoryService;
  private databaseService: ProductionDatabaseService;
  private productionOrdersService: ProductionOrdersService;
  private packagingOrdersService: PackagingOrdersService;
  private productionStatsService: ProductionStatsService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.databaseService = ProductionDatabaseService.getInstance();
    this.productionOrdersService = new ProductionOrdersService(this.inventoryService, this.databaseService);
    this.packagingOrdersService = new PackagingOrdersService(this.inventoryService, this.databaseService);
    this.productionStatsService = new ProductionStatsService(this.databaseService);
  }
  
  // الحصول على كائن وحيد من الخدمة (نمط Singleton)
  public static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }
  
  // -------- وظائف أوامر الإنتاج --------
  
  // الحصول على جميع أوامر الإنتاج
  public async getProductionOrders(): Promise<ProductionOrder[]> {
    return this.productionOrdersService.getProductionOrders();
  }
  
  // إنشاء أمر إنتاج جديد
  public async createProductionOrder(productCode: string, quantity: number): Promise<ProductionOrder | null> {
    return this.productionOrdersService.createProductionOrder(productCode, quantity);
  }
  
  // تحديث حالة أمر إنتاج
  public async updateProductionOrderStatus(
    orderId: number, 
    newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    return this.productionOrdersService.updateProductionOrderStatus(orderId, newStatus);
  }
  
  // حذف أمر إنتاج
  public async deleteProductionOrder(orderId: number): Promise<boolean> {
    return this.productionOrdersService.deleteProductionOrder(orderId);
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
    return this.productionOrdersService.updateProductionOrder(orderId, orderData);
  }
  
  // -------- وظائف أوامر التعبئة --------
  
  // الحصول على جميع أوامر التعبئة
  public async getPackagingOrders(): Promise<PackagingOrder[]> {
    return this.packagingOrdersService.getPackagingOrders();
  }
  
  // إنشاء أمر تعبئة جديد
  public async createPackagingOrder(
    finishedProductCode: string,
    quantity: number
  ): Promise<PackagingOrder | null> {
    return this.packagingOrdersService.createPackagingOrder(finishedProductCode, quantity);
  }
  
  // تحديث حالة أمر تعبئة
  public async updatePackagingOrderStatus(
    orderId: number, 
    newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    return this.packagingOrdersService.updatePackagingOrderStatus(orderId, newStatus);
  }
  
  // حذف أمر تعبئة
  public async deletePackagingOrder(orderId: number): Promise<boolean> {
    return this.packagingOrdersService.deletePackagingOrder(orderId);
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
    return this.packagingOrdersService.updatePackagingOrder(orderId, orderData);
  }
  
  // -------- وظائف الإحصائيات --------
  
  // الحصول على بيانات إحصائية للإنتاج
  public async getProductionStats() {
    return this.productionStatsService.getProductionStats();
  }
  
  // الحصول على بيانات الإنتاج للرسوم البيانية
  public async getProductionChartData() {
    return this.productionStatsService.getProductionChartData();
  }
  
  // ترجمة حالة الأمر
  public getStatusTranslation(status: string): string {
    return this.productionStatsService.getStatusTranslation(status);
  }
}

export default ProductionService;
