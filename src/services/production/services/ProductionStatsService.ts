
import ProductionDatabaseService from "../../database/ProductionDatabaseService";

export class ProductionStatsService {
  constructor(
    private databaseService: ProductionDatabaseService
  ) {}
  
  // الحصول على بيانات إحصائية للإنتاج
  public async getProductionStats() {
    return await this.databaseService.getProductionStats();
  }
  
  // الحصول على بيانات الإنتاج للرسوم البيانية
  public async getProductionChartData() {
    return await this.databaseService.getMonthlyProductionStats();
  }
  
  // ترجمة حالة الأمر
  public getStatusTranslation(status: string): string {
    const translations: Record<string, string> = {
      pending: 'قيد الانتظار',
      inProgress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };
    
    return translations[status] || status;
  }
}
