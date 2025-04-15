import { supabase } from "@/integrations/supabase/client";
import InventoryService from "./InventoryService";
import ProductionService from "./ProductionService";
import { fetchInventoryMovements } from "./InventoryMovementService";
import { NewsItem } from "@/components/ui/news-ticker";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

/**
 * خدمة الشريط الإخباري
 * مسؤولة عن استخراج وتجهيز البيانات من مختلف أقسام النظام لعرضها في الشريط الإخباري
 */
class NewsTickerService {
  private static instance: NewsTickerService;
  private inventoryService: InventoryService;
  private productionService: ProductionService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.productionService = ProductionService.getInstance();
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
        newsItems.push({
          id: `raw-${material.id}`,
          content: `المادة الخام "${material.name}" بكمية منخفضة (${material.quantity} ${material.unit})`,
          category: "المخزون",
          importance: material.quantity <= 5 ? "urgent" : "high",
        });
      });
      
      lowStockPackaging.forEach(material => {
        newsItems.push({
          id: `pkg-${material.id}`,
          content: `مادة التعبئة "${material.name}" بكمية منخفضة (${material.quantity} ${material.unit})`,
          category: "المخزون",
          importance: material.quantity <= 5 ? "urgent" : "high",
        });
      });
      
      lowStockFinished.forEach(product => {
        newsItems.push({
          id: `fin-${product.id}`,
          content: `المنتج "${product.name}" بكمية منخفضة (${product.quantity} ${product.unit})`,
          category: "المخزون",
          importance: product.quantity <= 5 ? "urgent" : "high",
        });
      });
      
      // إضافة أخبار حركات المخزون الأخيرة
      movements.slice(0, 5).forEach(movement => {
        const directionText = movement.type === 'in' ? 'إضافة' : 'صرف';
        newsItems.push({
          id: `mov-${movement.id}`,
          content: `${directionText} ${movement.quantity} ${movement.unit || 'وحدة'} من ${movement.item_name}`,
          category: "حركة المخزون",
          importance: "normal",
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
          content: `أمر إنتاج ${order.productName} (${order.quantity} ${order.unit}) قيد التنفيذ`,
          category: "الإنتاج",
          importance: "normal",
        });
      });
      
      // أوامر الإنتاج المكتملة حديثاً
      const recentCompletedProd = productionOrders
        .filter(order => order.status === 'completed')
        .slice(0, 3);
      
      recentCompletedProd.forEach(order => {
        newsItems.push({
          id: `prod-comp-${order.id}`,
          content: `تم إكمال إنتاج ${order.productName} (${order.quantity} ${order.unit})`,
          category: "الإنتاج",
          importance: "normal",
        });
      });
      
      // أوامر التعبئة قيد التنفيذ
      const inProgressPkg = packagingOrders.filter(order => order.status === 'inProgress');
      inProgressPkg.forEach(order => {
        newsItems.push({
          id: `pkg-${order.id}`,
          content: `أمر تعبئة ${order.productName} (${order.quantity} ${order.unit}) قيد التنفيذ`,
          category: "التعبئة",
          importance: "normal",
        });
      });
      
      // أوامر التعبئة المكتملة حديثاً
      const recentCompletedPkg = packagingOrders
        .filter(order => order.status === 'completed')
        .slice(0, 3);
      
      recentCompletedPkg.forEach(order => {
        newsItems.push({
          id: `pkg-comp-${order.id}`,
          content: `تم إكمال تعبئة ${order.productName} (${order.quantity} ${order.unit})`,
          category: "التعبئة",
          importance: "normal",
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
          content: `فاتورة ${invoiceType} جديدة للعميل ${partyName} بقيمة ${invoice.total_amount} ريال (${formattedDate})`,
          category: "المبيعات",
          importance: "normal",
        });
      });
      
      // أخبار المدفوعات
      recentPayments?.forEach(payment => {
        const paymentType = payment.payment_type === 'receipt' ? 'تحصيل' : 'سداد';
        const formattedDate = format(new Date(payment.date), 'dd MMMM', { locale: ar });
        const partyName = partyMap.get(payment.party_id) || 'غير معروف';
        
        newsItems.push({
          id: `pay-${payment.id}`,
          content: `${paymentType} دفعة من ${partyName} بقيمة ${payment.amount} ريال (${formattedDate})`,
          category: "المدفوعات",
          importance: "normal",
        });
      });
      
      // أخبار الأرباح
      recentProfits?.forEach(profit => {
        const profitPercentage = profit.profit_percentage.toFixed(1);
        const formattedDate = format(new Date(profit.invoice_date), 'dd MMMM', { locale: ar });
        
        newsItems.push({
          id: `profit-${profit.id}`,
          content: `ربح ${profit.profit_amount} ريال (${profitPercentage}%) من فاتورة ${profit.parties?.name} (${formattedDate})`,
          category: "الأرباح",
          importance: profit.profit_percentage >= 20 ? "high" : "normal",
        });
      });
      
      return newsItems;
    } catch (error) {
      console.error("Error fetching commercial news:", error);
      return [];
    }
  }
  
  /**
   * الحصول على جميع الأخبار والتقارير للعرض في الشريط الإخباري
   */
  public async getAllNews(): Promise<NewsItem[]> {
    try {
      const [inventoryNews, productionNews, commercialNews] = await Promise.all([
        this.getInventoryNews(),
        this.getProductionNews(),
        this.getCommercialNews(),
      ]);
      
      return [
        ...inventoryNews,
        ...productionNews,
        ...commercialNews,
        // إضافة بعض الأخبار العامة
        {
          id: "general-1",
          content: `تاريخ اليوم: ${format(new Date(), 'dd MMMM yyyy', { locale: ar })}`,
          category: "عام",
          importance: "normal",
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
