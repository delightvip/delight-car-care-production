import { NewsItem } from "@/components/ui/news-ticker";
import { NewsTickerServiceInterface } from "./NewsTickerTypes";
import { supabase } from "@/integrations/supabase/client";
import InventoryService from "../InventoryService";

/**
 * خدمة أخبار وتحليلات متقدمة
 * توفر تحليلات مهمة مثل المنتجات الأكثر مبيعًا والأكثر ربحية والأكثر أهمية
 */
class AnalyticsNewsService implements NewsTickerServiceInterface {
  private static instance: AnalyticsNewsService;
  private inventoryService: InventoryService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
  }
  
  public static getInstance(): AnalyticsNewsService {
    if (!AnalyticsNewsService.instance) {
      AnalyticsNewsService.instance = new AnalyticsNewsService();
    }
    return AnalyticsNewsService.instance;
  }
  
  /**
   * الحصول على أخبار التحليلات
   */
  public async getNews(): Promise<NewsItem[]> {
    try {
      const newsItems: NewsItem[] = [];
      
      // جلب المنتجات الأكثر مبيعًا
      const topSellingProducts = await this.getTopSellingProducts();
      topSellingProducts.forEach((product, index) => {
        newsItems.push({
          id: `top-selling-${product.id}`,
          content: `المنتج الأكثر مبيعًا (${index + 1}): ${product.name}`,
          category: "analytics",
          importance: index === 0 ? "high" : "normal",
          value: product.total_sold,
          trend: "up",
        });
      });
      
      // جلب المنتجات الأكثر ربحية
      const mostProfitableProducts = await this.getMostProfitableProducts();
      mostProfitableProducts.forEach((product, index) => {
        newsItems.push({
          id: `most-profitable-${product.id}`,
          content: `المنتج الأكثر ربحية (${index + 1}): ${product.name}`,
          category: "analytics",
          importance: index === 0 ? "high" : "normal",
          value: product.profit,
          valueChangePercentage: product.profit_percentage,
          trend: "up",
        });
      });
      
      // جلب المواد الخام الأكثر استخدامًا
      const mostUsedRawMaterials = await this.getMostUsedRawMaterials();
      mostUsedRawMaterials.forEach((material, index) => {
        newsItems.push({
          id: `most-used-${material.id}`,
          content: `المادة الخام الأكثر استخدامًا (${index + 1}): ${material.name}`,
          category: "analytics",
          importance: "normal",
          value: material.usage_count,
          trend: "neutral",
        });
      });
      
      return newsItems;
    } catch (error) {
      console.error("Error fetching analytics news:", error);
      return [];
    }
  }
  /**
 * الحصول على المنتجات الأكثر ربحية
 */
private async getMostProfitableProducts(limit: number = 3): Promise<any[]> {
  try {
    // طريقة 1: محاولة استخدام جدول الأرباح مباشرة دون ربط فوري
    const { data, error } = await supabase
      .from('profits')
      .select(`
        id,
        profit_amount,
        profit_percentage,
        invoice_id
      `)
      .order('profit_amount', { ascending: false })
      .limit(50); // نحصل على عدد أكبر للمعالجة لاحقًا
    
    if (error) {
      console.error("استعلام الأرباح فشل:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // جمع معرفات الفواتير لجلب عناصرها
    const invoiceIds = data.map(profit => profit.invoice_id).filter(id => id);
    
    if (invoiceIds.length === 0) {
      return [];
    }
    
    // جلب عناصر الفواتير المرتبطة بسجلات الأرباح
    const { data: invoiceItems, error: itemsError } = await supabase
      .from('invoice_items')
      .select(`
        id,
        invoice_id,
        item_id,
        item_name,
        item_type,
        quantity
      `)
      .in('invoice_id', invoiceIds)
      .eq('item_type', 'finished_products');
    
    if (itemsError) {
      console.error("استعلام عناصر الفواتير فشل:", itemsError);
      return [];
    }
    
    // تجميع البيانات حسب المنتج
    const productProfits: Record<string, { id: number, name: string, profit: number, profit_percentage: number, count: number }> = {};
    
    // ربط سجلات الأرباح بعناصر الفواتير
    data.forEach(profitRecord => {
      // العثور على جميع العناصر المرتبطة بهذه الفاتورة
      const itemsForInvoice = invoiceItems?.filter(item => 
        item.invoice_id === profitRecord.invoice_id
      ) || [];
      
      if (itemsForInvoice.length > 0) {
        // توزيع الربح على جميع عناصر الفاتورة
        itemsForInvoice.forEach(item => {
          const key = `${item.item_id}-${item.item_name}`;
          if (!productProfits[key]) {
            productProfits[key] = {
              id: item.item_id,
              name: item.item_name,
              profit: 0,
              profit_percentage: 0,
              count: 0
            };
          }
          
          // تخصيص الربح للمنتج بناءً على كميته في الفاتورة
          const totalItems = itemsForInvoice.reduce((sum, i) => sum + (i.quantity || 1), 0);
          const itemRatio = (item.quantity || 1) / totalItems;
          productProfits[key].profit += (profitRecord.profit_amount * itemRatio);
          productProfits[key].count += 1;
          
          // تحديث نسبة الربح (متوسط)
          if (profitRecord.profit_percentage) {
            const oldTotal = productProfits[key].profit_percentage * (productProfits[key].count - 1);
            productProfits[key].profit_percentage = (oldTotal + profitRecord.profit_percentage) / productProfits[key].count;
          }
        });
      }
    });
    
    // تحويل البيانات إلى مصفوفة وترتيبها تنازليًا
    return Object.values(productProfits)
      .map(item => ({
        id: item.id,
        name: item.name,
        profit: Math.round(item.profit * 100) / 100, // تقريب الأرقام
        profit_percentage: Math.round(item.profit_percentage * 10) / 10
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit);
  } catch (error) {
    console.error("خطأ في الحصول على المنتجات الأكثر ربحية:", error);
    return [];
  }
}
  /**
   * الحصول على المواد الخام الأكثر استخدامًا في التصنيع
   */
  private async getMostUsedRawMaterials(limit: number = 3): Promise<any[]> {
    try {
      // استعلام عن مكونات المنتجات نصف المصنعة
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('semi_finished_ingredients')
        .select(`
          raw_material_id,
          semi_finished_id
        `)
        .order('raw_material_id');
      
      if (ingredientsError) throw ingredientsError;
      
      if (!ingredients || ingredients.length === 0) {
        return [];
      }
      
      // تجميع المواد الخام حسب عدد استخدامها
      const materialUsage: Record<number, number> = {};
      ingredients.forEach(ingredient => {
        if (ingredient.raw_material_id) {
          materialUsage[ingredient.raw_material_id] = (materialUsage[ingredient.raw_material_id] || 0) + 1;
        }
      });
      
      // جلب تفاصيل المواد الخام
      const rawMaterialIds = Object.keys(materialUsage).map(Number);
      const rawMaterials = await this.inventoryService.getRawMaterials();
      
      // بناء النتائج المجمعة
      const result = rawMaterials
        .filter(material => rawMaterialIds.includes(material.id))
        .map(material => ({
          id: material.id,
          name: material.name,
          usage_count: materialUsage[material.id] || 0
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit);
      
      return result;
    } catch (error) {
      console.error("Error getting most used raw materials:", error);
      return [];
    }
  }
  /**
   * الحصول على المنتجات الأكثر مبيعًا
   */
  private async getTopSellingProducts(limit: number = 3): Promise<any[]> {
    try {
      // استعلام لحساب إجمالي المبيعات لكل منتج
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          item_id,
          item_name,
          item_type,
          quantity,
          invoices!inner(invoice_type)
        `)
        .eq('item_type', 'finished_products')
        .eq('invoices.invoice_type', 'sale');
        
      if (error) {
        console.error("خطأ في جلب بيانات المبيعات:", error);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // تجميع المبيعات حسب المنتج
      const productSales: Record<string, { id: number, name: string, total_sold: number }> = {};
      
      data.forEach(item => {
        const key = `${item.item_id}-${item.item_name}`;
        
        if (!productSales[key]) {
          productSales[key] = {
            id: item.item_id,
            name: item.item_name,
            total_sold: 0
          };
        }
        
        productSales[key].total_sold += (item.quantity || 1);
      });
      
      // تحويل البيانات إلى مصفوفة وترتيبها تنازليًا
      return Object.values(productSales)
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, limit);
    } catch (error) {
      console.error("خطأ في الحصول على المنتجات الأكثر مبيعًا:", error);
      return [];
    }
  }
}

export default AnalyticsNewsService;
