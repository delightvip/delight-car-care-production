
import { NewsItem } from "@/components/ui/news-ticker";
import { toast } from "sonner";
import { NewsTickerServiceInterface } from "./NewsTickerTypes";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * الخدمة الأساسية للشريط الإخباري
 * تقوم بتنسيق وتجميع البيانات من مختلف مصادر الأخبار
 */
class BaseNewsTickerService {
  private static instance: BaseNewsTickerService;
  private newsServices: NewsTickerServiceInterface[] = [];
  
  private constructor() {}
  
  public static getInstance(): BaseNewsTickerService {
    if (!BaseNewsTickerService.instance) {
      BaseNewsTickerService.instance = new BaseNewsTickerService();
    }
    return BaseNewsTickerService.instance;
  }
  
  /**
   * إضافة خدمة أخبار إلى المجمع
   * @param service خدمة الأخبار
   */
  public registerNewsService(service: NewsTickerServiceInterface): void {
    this.newsServices.push(service);
  }
  
  /**
   * الحصول على جميع الأخبار من كافة المصادر المسجلة
   */
  public async getAllNews(): Promise<NewsItem[]> {
    try {
      const allNewsPromises = this.newsServices.map(service => 
        service.getNews().catch(error => {
          console.error("Error fetching news from service:", error);
          return [] as NewsItem[];
        })
      );
      
      const newsArrays = await Promise.all(allNewsPromises);
      
      // دمج جميع مصادر الأخبار
      let allNews: NewsItem[] = newsArrays.flat();
      
      // إضافة بعض الأخبار العامة
      allNews.push({
        id: "general-1",
        content: `تاريخ اليوم: ${format(new Date(), 'dd MMMM yyyy', { locale: ar })}`,
        category: "عام",
        importance: "normal",
        trend: "neutral"
      });
      
      return allNews;
    } catch (error) {
      console.error("Error fetching all news:", error);
      toast.error("حدث خطأ أثناء جلب البيانات للشريط الإخباري");
      return [];
    }
  }
}

export default BaseNewsTickerService;
