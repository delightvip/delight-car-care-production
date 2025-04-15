
import { supabase } from "@/integrations/supabase/client";
import InventoryService from "./InventoryService";
import ProductionService from "./ProductionService";
import { fetchInventoryMovements } from "./InventoryMovementService";
import { NewsItem } from "@/components/ui/news-ticker";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import FinancialService from "./financial/FinancialService";
import ProfitService from "./commercial/profit/ProfitService";

/**
 * خدمة الشريط الإخباري
 * مسؤولة عن استخراج وتجهيز البيانات من مختلف أقسام النظام لعرضها في الشريط الإخباري
 */
class NewsTickerService {
  private static instance: NewsTickerService;
  private inventoryService: InventoryService;
  private productionService: ProductionService;
  private financialService: FinancialService;
  private profitService: ProfitService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.productionService = ProductionService.getInstance();
    this.financialService = FinancialService.getInstance();
    this.profitService = ProfitService.getInstance();
  }
  
  public static getInstance(): NewsTickerService {
    if (!NewsTickerService.instance) {
      NewsTickerService.instance = new NewsTickerService();
    }
    return NewsTickerService.instance;
  }
  
  /**
   * الحصول على أخبار المخزون الحالية
   */
  public async getInventoryNews(): Promise<NewsItem[]> {
    try {
      // الحصول على حركات المخزون الأخيرة
      const movements = await fetchInventoryMovements({ limit: 10 });
      
      // الحصول على المواد ذات الكمية القليلة
      const rawMaterials = await this.inventoryService.getRawMaterials();
      const packagingMaterials = await this.inventoryService.getPackagingMaterials();
      const finishedProducts = await this.inventoryService.getFinishedProducts();
      
      const lowStockThreshold = 10; // عتبة المخزون المنخفض
      
      const lowStockRaw = rawMaterials.filter(m => m.quantity <= lowStockThreshold);
      const lowStockPackaging = packagingMaterials.filter(m => m.quantity <= lowStockThreshold);
      const lowStockFinished = finishedProducts.filter(p => p.quantity <= lowStockThreshold);
      
      const newsItems: NewsItem[] = [];
      
      // إضافة أخبار المواد ذات الكمية القليلة
      lowStockRaw.forEach(material => {
        const isVeryCritical = material.quantity <= 3;
        newsItems.push({
          id: `raw-${material.id}`,
          content: `المادة الخام "${material.name}" بكمية منخفضة`,
          category: "المخزون",
          importance: material.quantity <= 5 ? "urgent" : "high",
          value: material.quantity,
          trend: "down",
          valueChangePercentage: -((material.min_stock - material.quantity) / material.min_stock * 100),
          highlight: isVeryCritical
        });
      });
      
      lowStockPackaging.forEach(material => {
        const isVeryCritical = material.quantity <= 3;
        newsItems.push({
          id: `pkg-${material.id}`,
          content: `مادة التعبئة "${material.name}" بكمية منخفضة`,
          category: "المخزون",
          importance: material.quantity <= 5 ? "urgent" : "high",
          value: material.quantity,
          trend: "down",
          valueChangePercentage: -((material.min_stock - material.quantity) / material.min_stock * 100),
          highlight: isVeryCritical
        });
      });
      
      lowStockFinished.forEach(product => {
        const isVeryCritical = product.quantity <= 3;
        newsItems.push({
          id: `fin-${product.id}`,
          content: `المنتج "${product.name}" بكمية منخفضة`,
          category: "المخزون",
          importance: product.quantity <= 5 ? "urgent" : "high",
          value: product.quantity,
          trend: "down",
          valueChangePercentage: -((product.min_stock - product.quantity) / product.min_stock * 100),
          highlight: isVeryCritical
        });
      });
      
      // إضافة أخبار حركات المخزون الأخيرة
      movements.slice(0, 5).forEach(movement => {
        const directionText = movement.type === 'in' ? 'إضافة' : 'صرف';
        const trend = movement.type === 'in' ? 'up' : 'down';
        newsItems.push({
          id: `mov-${movement.id}`,
          content: `${directionText} ${movement.item_name}`,
          category: "حركة المخزون",
          importance: "normal",
          value: movement.quantity,
          trend: trend as 'up' | 'down',
        });
      });
      
      return newsItems;
    } catch (error) {
      console.error("Error fetching inventory news:", error);
      return [];
    }
  }
  
  /**
   * الحصول على أخبار الإنتاج الحالية
   */
  public async getProductionNews(): Promise<NewsItem[]> {
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
  
  /**
   * الحصول على أخبار المبيعات والتجارة
   */
  public async getCommercialNews(): Promise<NewsItem[]> {
    try {
      // استخدام نوع دقيق للفواتير
      interface InvoiceData {
        id: string;
        date: string;
        total_amount: number;
        invoice_type: 'sale' | 'purchase';
        payment_status: string;
        party_id: string;
        party_name?: string;
      }
      
      // استعلام عن آخر 5 فواتير
      const { data: recentInvoices, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          date,
          total_amount,
          invoice_type,
          payment_status,
          party_id
        `)
        .order('date', { ascending: false })
        .limit(5);
      
      if (invoiceError) throw invoiceError;
      
      // استخدام نوع دقيق للمدفوعات
      interface PaymentData {
        id: string;
        date: string;
        amount: number;
        payment_type: 'collection' | 'disbursement';
        party_id: string;
        party_name?: string;
      }
      
      // استعلام عن آخر 5 مدفوعات
      const { data: recentPayments, error: paymentError } = await supabase
        .from('payments')
        .select(`
          id,
          date,
          amount,
          payment_type,
          party_id
        `)
        .order('date', { ascending: false })
        .limit(5);
      
      if (paymentError) throw paymentError;
      
      // استعلام عن آخر 3 أرباح
      const { data: recentProfits, error: profitError } = await supabase
        .from('profits')
        .select(`
          id,
          invoice_id,
          invoice_date,
          total_sales,
          profit_amount,
          profit_percentage,
          parties (name)
        `)
        .order('invoice_date', { ascending: false })
        .limit(3);
      
      if (profitError) throw profitError;
      
      // جلب بيانات الأطراف للفواتير والمدفوعات
      const partyIds = [
        ...(recentInvoices?.map(inv => inv.party_id) || []),
        ...(recentPayments?.map(pay => pay.party_id) || [])
      ];

      const { data: parties, error: partiesError } = await supabase
        .from('parties')
        .select('id, name')
        .in('id', partyIds);

      if (partiesError) throw partiesError;

      const partyMap = new Map(parties?.map(party => [party.id, party.name]));
      const newsItems: NewsItem[] = [];
      
      // أخبار الفواتير
      recentInvoices?.forEach(invoice => {
        const invoiceType = invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات';
        const formattedDate = format(new Date(invoice.date), 'dd MMMM', { locale: ar });
        const partyName = partyMap.get(invoice.party_id) || 'غير معروف';
        
        newsItems.push({
          id: `inv-${invoice.id}`,
          content: `فاتورة ${invoiceType} للعميل ${partyName}`,
          category: "المبيعات",
          importance: "normal",
          value: invoice.total_amount,
          trend: invoice.invoice_type === 'sale' ? 'up' : 'down',
        });
      });
      
      // أخبار المدفوعات
      recentPayments?.forEach(payment => {
        const paymentType = payment.payment_type === 'collection' ? 'تحصيل' : 'سداد';
        const formattedDate = format(new Date(payment.date), 'dd MMMM', { locale: ar });
        const partyName = partyMap.get(payment.party_id) || 'غير معروف';
        
        newsItems.push({
          id: `pay-${payment.id}`,
          content: `${paymentType} من ${partyName}`,
          category: "المدفوعات",
          importance: "normal",
          value: payment.amount,
          trend: payment.payment_type === 'collection' ? 'up' : 'down',
        });
      });
      
      // أخبار الأرباح
      recentProfits?.forEach(profit => {
        const profitPercentage = profit.profit_percentage;
        const formattedDate = format(new Date(profit.invoice_date), 'dd MMMM', { locale: ar });
        
        newsItems.push({
          id: `profit-${profit.id}`,
          content: `ربح من فاتورة ${profit.parties?.name}`,
          category: "الأرباح",
          importance: profitPercentage >= 20 ? "high" : "normal",
          value: profit.profit_amount,
          valueChangePercentage: profitPercentage,
          trend: 'up',
        });
      });
      
      return newsItems;
    } catch (error) {
      console.error("Error fetching commercial news:", error);
      return [];
    }
  }
  
  /**
   * الحصول على تقارير مالية للعرض في الشريط الإخباري
   */
  public async getFinancialNews(): Promise<NewsItem[]> {
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
  
  /**
   * الحصول على أخبار المرتجعات
   */
  public async getReturnsNews(): Promise<NewsItem[]> {
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
          category: "المرتجعات",
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
            category: "المرتجعات",
            importance: totalSalesReturns > 10000 ? 'high' : 'normal',
            value: totalSalesReturns,
            trend: 'down',
          });
        }
        
        if (totalPurchaseReturns > 0) {
          newsItems.push({
            id: 'returns-stats-purchase',
            content: 'إجمالي مرتجعات المشتريات (آخر 30 يوم)',
            category: "المرتجعات",
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
  
  /**
   * الحصول على جميع الأخبار والتقارير للعرض في الشريط الإخباري
   */
  public async getAllNews(): Promise<NewsItem[]> {
    try {
      const [inventoryNews, productionNews, commercialNews, financialNews, returnsNews] = await Promise.all([
        this.getInventoryNews(),
        this.getProductionNews(),
        this.getCommercialNews(),
        this.getFinancialNews(),
        this.getReturnsNews()
      ]);
      
      return [
        ...inventoryNews,
        ...productionNews,
        ...commercialNews,
        ...financialNews,
        ...returnsNews,
        // إضافة بعض الأخبار العامة
        {
          id: "general-1",
          content: `تاريخ اليوم: ${format(new Date(), 'dd MMMM yyyy', { locale: ar })}`,
          category: "عام",
          importance: "normal",
          trend: "neutral"
        },
      ];
    } catch (error) {
      console.error("Error fetching all news:", error);
      toast.error("حدث خطأ أثناء جلب البيانات للشريط الإخباري");
      return [];
    }
  }
}

export default NewsTickerService;
