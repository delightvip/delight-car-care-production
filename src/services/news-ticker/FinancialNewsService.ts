
import { NewsItem } from "@/components/ui/news-ticker";
import { NewsTickerServiceInterface } from "./NewsTickerTypes";
import { subDays, format } from "date-fns";
import FinancialService from "../financial/FinancialService";
import ProfitService from "../commercial/profit/ProfitService";

/**
 * خدمة الأخبار المالية
 */
class FinancialNewsService implements NewsTickerServiceInterface {
  private static instance: FinancialNewsService;
  private financialService: FinancialService;
  private profitService: ProfitService;
  
  private constructor() {
    this.financialService = FinancialService.getInstance();
    this.profitService = ProfitService.getInstance();
  }
  
  public static getInstance(): FinancialNewsService {
    if (!FinancialNewsService.instance) {
      FinancialNewsService.instance = new FinancialNewsService();
    }
    return FinancialNewsService.instance;
  }
  
  /**
   * الحصول على أخبار مالية
   */
  public async getNews(): Promise<NewsItem[]> {
    try {
      const newsItems: NewsItem[] = [];
      
      // الحصول على الملخص المالي
      const today = new Date();
      const lastMonth = subDays(today, 30);
      const startDate = format(lastMonth, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');
      
      // جلب البيانات المالية
      const summary = await this.financialService.getFinancialSummary(startDate, endDate);
      
      // جلب ملخص الأرباح
      const profitFilter = { startDate, endDate };
      const profitSummary = await this.profitService.getProfitSummary(profitFilter);
      
      // إضافة الملخص المالي
      newsItems.push({
        id: 'fin-income',
        content: 'إجمالي الإيرادات (آخر 30 يوم)',
        category: 'مالي',
        importance: summary.totalIncome > 10000 ? 'high' : 'normal',
        value: summary.totalIncome,
        trend: summary.totalIncome > summary.totalExpense ? 'up' : 'down',
      });
      
      newsItems.push({
        id: 'fin-expense',
        content: 'إجمالي المصروفات (آخر 30 يوم)',
        category: 'مالي',
        importance: summary.totalExpense > summary.totalIncome ? 'high' : 'normal',
        value: summary.totalExpense,
        trend: summary.totalExpense > summary.totalIncome / 2 ? 'down' : 'neutral',
      });
      
      newsItems.push({
        id: 'fin-profit',
        content: 'صافي الربح (آخر 30 يوم)',
        category: 'مالي',
        importance: summary.netProfit < 0 ? 'urgent' : summary.netProfit > 5000 ? 'high' : 'normal',
        value: summary.netProfit,
        trend: summary.netProfit > 0 ? 'up' : 'down',
        valueChangePercentage: summary.totalIncome > 0 ? (summary.netProfit / summary.totalIncome) * 100 : 0,
      });
      
      // إضافة ملخص الأرباح
      if (profitSummary.total_profit > 0) {
        newsItems.push({
          id: 'profit-summary',
          content: 'إجمالي أرباح المبيعات (آخر 30 يوم)',
          category: 'مبيعات',
          value: profitSummary.total_profit,
          valueChangePercentage: profitSummary.average_profit_percentage,
          trend: 'up',
          importance: profitSummary.average_profit_percentage > 20 ? 'high' : 'normal',
        });
      }
      
      // إضافة معلومات الخزينة
      if (summary.cashBalance || summary.bankBalance) {
        newsItems.push({
          id: 'cash-balance',
          content: 'رصيد الخزينة الحالي',
          category: 'مالي',
          value: summary.cashBalance,
          trend: 'neutral',
        });
        
        newsItems.push({
          id: 'bank-balance',
          content: 'رصيد البنك الحالي',
          category: 'مالي',
          value: summary.bankBalance,
          trend: 'neutral',
        });
      }
      
      return newsItems;
    } catch (error) {
      console.error("Error fetching financial news:", error);
      return [];
    }
  }
}

export default FinancialNewsService;
