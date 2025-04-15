
import { NewsItem } from "@/components/ui/news-ticker";
import { NewsTickerServiceInterface } from "./NewsTickerTypes";
import ProductionService from "../ProductionService";

/**
 * خدمة أخبار الإنتاج
 */
class ProductionNewsService implements NewsTickerServiceInterface {
  private static instance: ProductionNewsService;
  private productionService: ProductionService;
  
  private constructor() {
    this.productionService = ProductionService.getInstance();
  }
  
  public static getInstance(): ProductionNewsService {
    if (!ProductionNewsService.instance) {
      ProductionNewsService.instance = new ProductionNewsService();
    }
    return ProductionNewsService.instance;
  }
  
  /**
   * الحصول على أخبار الإنتاج
   */
  public async getNews(): Promise<NewsItem[]> {
    try {
      const productionOrders = await this.productionService.getProductionOrders();
      const packagingOrders = await this.productionService.getPackagingOrders();
      const newsItems: NewsItem[] = [];
      
      // أوامر الإنتاج قيد التنفيذ
      const inProgressProd = productionOrders.filter(order => order.status === 'inProgress');
      inProgressProd.forEach(order => {
        newsItems.push({
          id: `prod-${order.id}`,
          content: `أمر إنتاج ${order.productName} قيد التنفيذ`,
          category: "الإنتاج",
          importance: "normal",
          value: order.quantity,
          trend: "up",
        });
      });
      
      // أوامر الإنتاج المكتملة حديثاً
      const recentCompletedProd = productionOrders
        .filter(order => order.status === 'completed')
        .slice(0, 3);
      
      recentCompletedProd.forEach(order => {
        newsItems.push({
          id: `prod-comp-${order.id}`,
          content: `تم إكمال إنتاج ${order.productName}`,
          category: "الإنتاج",
          importance: "normal",
          value: order.quantity,
          trend: "up",
        });
      });
      
      // أوامر التعبئة قيد التنفيذ
      const inProgressPkg = packagingOrders.filter(order => order.status === 'inProgress');
      inProgressPkg.forEach(order => {
        newsItems.push({
          id: `pkg-${order.id}`,
          content: `أمر تعبئة ${order.productName} قيد التنفيذ`,
          category: "التعبئة",
          importance: "normal",
          value: order.quantity,
          trend: "neutral",
        });
      });
      
      // أوامر التعبئة المكتملة حديثاً
      const recentCompletedPkg = packagingOrders
        .filter(order => order.status === 'completed')
        .slice(0, 3);
      
      recentCompletedPkg.forEach(order => {
        newsItems.push({
          id: `pkg-comp-${order.id}`,
          content: `تم إكمال تعبئة ${order.productName}`,
          category: "التعبئة",
          importance: "normal",
          value: order.quantity,
          trend: "up",
        });
      });
      
      return newsItems;
    } catch (error) {
      console.error("Error fetching production news:", error);
      return [];
    }
  }
}

export default ProductionNewsService;
