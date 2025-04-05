
import ProductionDatabaseService from "../database/ProductionDatabaseService";
import { MonthlyProductionStats, ProductionStats } from "./ProductionTypes";

class ProductionStatsService {
  private static instance: ProductionStatsService;
  private databaseService: ProductionDatabaseService;
  
  private constructor() {
    this.databaseService = ProductionDatabaseService.getInstance();
  }
  
  // الحصول على كائن وحيد من الخدمة (نمط Singleton)
  public static getInstance(): ProductionStatsService {
    if (!ProductionStatsService.instance) {
      ProductionStatsService.instance = new ProductionStatsService();
    }
    return ProductionStatsService.instance;
  }

  // الحصول على بيانات إحصائية للإنتاج
  public async getProductionStats(): Promise<ProductionStats> {
    return await this.databaseService.getProductionStats();
  }
  
  // الحصول على بيانات الإنتاج للرسوم البيانية
  public async getProductionChartData(): Promise<MonthlyProductionStats[]> {
    return await this.databaseService.getMonthlyProductionStats();
  }
}

export default ProductionStatsService;
