import { NewsItem } from "@/components/ui/news-ticker";
import { NewsTickerServiceInterface } from "./NewsTickerTypes";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * خدمة أخبار المبيعات والتجارة
 */
class CommercialNewsService implements NewsTickerServiceInterface {
  private static instance: CommercialNewsService;
  
  private constructor() {}
  
  public static getInstance(): CommercialNewsService {
    if (!CommercialNewsService.instance) {
      CommercialNewsService.instance = new CommercialNewsService();
    }
    return CommercialNewsService.instance;
  }
  
  /**
   * الحصول على أخبار المبيعات والتجارة
   */
  public async getNews(): Promise<NewsItem[]> {
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
          category: "commercial",
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
          category: "commercial",
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
          category: "commercial",
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
}

export default CommercialNewsService;
