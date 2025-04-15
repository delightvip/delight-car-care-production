
import { NewsItem } from "@/components/ui/news-ticker";
import { toast } from "sonner";
import BaseNewsTickerService from "./news-ticker/BaseNewsTickerService";
import InventoryNewsService from "./news-ticker/InventoryNewsService";
import ProductionNewsService from "./news-ticker/ProductionNewsService";
import CommercialNewsService from "./news-ticker/CommercialNewsService";
import FinancialNewsService from "./news-ticker/FinancialNewsService";
import ReturnsNewsService from "./news-ticker/ReturnsNewsService";
import AnalyticsNewsService from "./news-ticker/AnalyticsNewsService";

/**
 * خدمة الشريط الإخباري
 * مسؤولة عن تجميع وتنسيق البيانات من مختلف مصادر الأخبار لعرضها في الشريط الإخباري
 */
class NewsTickerService {
  private static instance: NewsTickerService;
  private baseService: BaseNewsTickerService;
  
  private constructor() {
    // تهيئة الخدمة الأساسية
    this.baseService = BaseNewsTickerService.getInstance();
    
    // تسجيل جميع مصادر الأخبار
    this.baseService.registerNewsService(InventoryNewsService.getInstance());
    this.baseService.registerNewsService(ProductionNewsService.getInstance());
    this.baseService.registerNewsService(CommercialNewsService.getInstance());
    this.baseService.registerNewsService(FinancialNewsService.getInstance());
    this.baseService.registerNewsService(ReturnsNewsService.getInstance());
    this.baseService.registerNewsService(AnalyticsNewsService.getInstance());
  }
  
  public static getInstance(): NewsTickerService {
    if (!NewsTickerService.instance) {
      NewsTickerService.instance = new NewsTickerService();
    }
    return NewsTickerService.instance;
  }
  
  /**
   * الحصول على جميع الأخبار والتقارير للعرض في الشريط الإخباري
   */
  public async getAllNews(): Promise<NewsItem[]> {
    try {
      return await this.baseService.getAllNews();
    } catch (error) {
      console.error("Error fetching all news:", error);
      toast.error("حدث خطأ أثناء جلب البيانات للشريط الإخباري");
      return [];
    }
  }
}

export default NewsTickerService;
