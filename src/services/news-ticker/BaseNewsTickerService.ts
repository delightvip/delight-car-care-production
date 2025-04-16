
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
   */  public async getAllNews(): Promise<NewsItem[]> {
    try {
      const allNewsPromises = this.newsServices.map(service => 
        service.getNews().catch(error => {
          console.error("Error fetching news from service:", error);
          return [] as NewsItem[];
        })
      );
      
      const newsArrays = await Promise.all(allNewsPromises);
      
      // دمج جميع مصادر الأخبار مع ضمان فرادة المعرفات
      let allNews: NewsItem[] = [];
      const usedIds = new Set<string | number>();
      
      // معالجة كل مصفوفة أخبار
      newsArrays.forEach((newsArray, sourceIndex) => {
        newsArray.forEach(item => {
          // تحقق مما إذا كان المعرف مستخدماً بالفعل
          const idStr = String(item.id);
          if (usedIds.has(idStr)) {
            // إنشاء معرف جديد فريد بإضافة رقم المصدر ورقم عشوائي
            const newId = `${idStr}-src${sourceIndex}-${Math.floor(Math.random() * 1000)}`;
            allNews.push({ ...item, id: newId });
            usedIds.add(newId);
          } else {
            // إضافة العنصر كما هو إذا كان المعرف فريداً
            allNews.push(item);
            usedIds.add(idStr);
          }
        });
      });
      
      // إضافة بعض الأخبار العامة
      const generalNewsId = "general-1";
      if (!usedIds.has(generalNewsId)) {
        allNews.push({
          id: generalNewsId,
          content: `تاريخ اليوم: ${format(new Date(), 'dd MMMM yyyy', { locale: ar })}`,
          category: "عام",
          importance: "normal",
          trend: "neutral"
        });
      }
      
      return allNews;
    } catch (error) {
      console.error("Error fetching all news:", error);
      toast.error("حدث خطأ أثناء جلب البيانات للشريط الإخباري");
      return [];
    }
  }
}

export default BaseNewsTickerService;
