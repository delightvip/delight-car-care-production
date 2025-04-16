
import { NewsItem } from "@/components/ui/news-ticker";
import { NewsTickerServiceInterface } from "./NewsTickerTypes";
import InventoryService from "../InventoryService";
import { fetchInventoryMovements } from "../InventoryMovementService";

/**
 * خدمة أخبار المخزون
 */
class InventoryNewsService implements NewsTickerServiceInterface {
  private static instance: InventoryNewsService;
  private inventoryService: InventoryService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
  }
  
  public static getInstance(): InventoryNewsService {
    if (!InventoryNewsService.instance) {
      InventoryNewsService.instance = new InventoryNewsService();
    }
    return InventoryNewsService.instance;
  }
  
  /**
   * الحصول على أخبار المخزون
   */
  public async getNews(): Promise<NewsItem[]> {
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
          category: "المخزون",          importance: product.quantity <= 5 ? "urgent" : "high",
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
}

export default InventoryNewsService;
