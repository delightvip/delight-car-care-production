import { NewsItem } from "@/components/ui/news-ticker";
import { NewsTickerServiceInterface } from "./NewsTickerTypes";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * خدمة أخبار المرتجعات
 */
class ReturnsNewsService implements NewsTickerServiceInterface {
  private static instance: ReturnsNewsService;
  
  private constructor() {}
  
  public static getInstance(): ReturnsNewsService {
    if (!ReturnsNewsService.instance) {
      ReturnsNewsService.instance = new ReturnsNewsService();
    }
    return ReturnsNewsService.instance;
  }
  
  /**
   * الحصول على أخبار المرتجعات
   */
  public async getNews(): Promise<NewsItem[]> {
    try {
      const newsItems: NewsItem[] = [];
      
      // استعلام عن آخر المرتجعات
      const { data: recentReturns, error: returnsError } = await supabase
        .from('returns')
        .select(`
          id,
          date,
          amount,
          return_type,
          payment_status,
          party_id,
          parties (name)
        `)
        .order('date', { ascending: false })
        .limit(5);
      
      if (returnsError) throw returnsError;
      
      // إنشاء أخبار من المرتجعات
      recentReturns?.forEach(returnItem => {
        const returnType = returnItem.return_type === 'sales' ? 'مبيعات' : 'مشتريات';
        const partyName = returnItem.parties?.name || 'غير معروف';
        
        newsItems.push({
          id: `return-${returnItem.id}`,
          content: `مرتجع ${returnType} من ${partyName}`,
          category: "returns",
          importance: returnItem.amount > 5000 ? 'high' : 'normal',
          value: returnItem.amount,
          trend: 'down',
        });
      });
      
      // إحصائيات المرتجعات
      const today = new Date();
      const lastMonth = subDays(today, 30);
      const startDate = format(lastMonth, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');
      
      // استعلام لحساب إجمالي المرتجعات
      const { data: returnsStats, error: statsError } = await supabase
        .from('returns')
        .select('amount, return_type')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (statsError) throw statsError;
      
      if (returnsStats && returnsStats.length > 0) {
        const totalSalesReturns = returnsStats
          .filter(r => r.return_type === 'sales')
          .reduce((sum, item) => sum + item.amount, 0);
          
        const totalPurchaseReturns = returnsStats
          .filter(r => r.return_type === 'purchase')
          .reduce((sum, item) => sum + item.amount, 0);
        
        if (totalSalesReturns > 0) {
          newsItems.push({
            id: 'returns-stats-sales',
            content: 'إجمالي مرتجعات المبيعات (آخر 30 يوم)',
            category: "returns",
            importance: totalSalesReturns > 10000 ? 'high' : 'normal',
            value: totalSalesReturns,
            trend: 'down',
          });
        }
        
        if (totalPurchaseReturns > 0) {
          newsItems.push({
            id: 'returns-stats-purchase',
            content: 'إجمالي مرتجعات المشتريات (آخر 30 يوم)',
            category: "returns",
            value: totalPurchaseReturns,
            trend: 'up',
          });
        }
      }
      
      return newsItems;
    } catch (error) {
      console.error("Error fetching returns news:", error);
      return [];
    }
  }
}

export default ReturnsNewsService;
