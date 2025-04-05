
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
    try {
      const dbStats = await this.databaseService.getProductionStats();
      
      // Transform the database result to match the expected ProductionStats interface
      return {
        totalOrders: dbStats.total_production_orders || 0,
        pendingOrders: dbStats.pending_orders || 0,
        completedOrders: dbStats.completed_orders || 0,
        inProgressOrders: dbStats.in_progress_orders || 0,
        cancelledOrders: dbStats.cancelled_orders || 0,
        totalCost: dbStats.total_cost || 0
      };
    } catch (error) {
      console.error('Error fetching production stats:', error);
      // Return default values when there's an error
      return {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        inProgressOrders: 0,
        cancelledOrders: 0,
        totalCost: 0
      };
    }
  }
  
  // الحصول على بيانات الإنتاج للرسوم البيانية
  public async getProductionChartData(): Promise<MonthlyProductionStats[]> {
    try {
      const dbChartData = await this.databaseService.getMonthlyProductionStats();
      
      // Transform the database result to match the expected MonthlyProductionStats interface
      return dbChartData.map(item => ({
        month: item.month || '',
        productionCount: item.production_count || 0,
        packagingCount: item.packaging_count || 0
      }));
    } catch (error) {
      console.error('Error fetching monthly production stats:', error);
      // Return empty array when there's an error
      return [];
    }
  }
}

export default ProductionStatsService;
