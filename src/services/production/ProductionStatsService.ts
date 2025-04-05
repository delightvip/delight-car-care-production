
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
    const dbStats = await this.databaseService.getProductionStats();
    
    // Transform the database result to match the expected ProductionStats interface
    return {
      totalOrders: dbStats.total_production_orders,
      pendingOrders: dbStats.pending_orders,
      completedOrders: dbStats.completed_orders,
      inProgressOrders: 0, // Set a default value if not available in the database
      cancelledOrders: 0, // Set a default value if not available in the database
      totalCost: dbStats.total_cost
    };
  }
  
  // الحصول على بيانات الإنتاج للرسوم البيانية
  public async getProductionChartData(): Promise<MonthlyProductionStats[]> {
    const dbChartData = await this.databaseService.getMonthlyProductionStats();
    
    // Transform the database result to match the expected MonthlyProductionStats interface
    return dbChartData.map(item => ({
      month: item.month,
      productionCount: item.production_count,
      packagingCount: item.packaging_count
    }));
  }
}

export default ProductionStatsService;
