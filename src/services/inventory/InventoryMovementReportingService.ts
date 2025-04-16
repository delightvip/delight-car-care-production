
import { supabase } from "@/integrations/supabase/client";
import InventoryMovementTrackingService from "./InventoryMovementTrackingService";

/**
 * خدمة تقارير حركة المخزون
 */
class InventoryMovementReportingService {
  private static instance: InventoryMovementReportingService;
  private trackingService: InventoryMovementTrackingService;

  private constructor() {
    this.trackingService = InventoryMovementTrackingService.getInstance();
  }

  public static getInstance(): InventoryMovementReportingService {
    if (!InventoryMovementReportingService.instance) {
      InventoryMovementReportingService.instance = new InventoryMovementReportingService();
    }
    return InventoryMovementReportingService.instance;
  }

  /**
   * الحصول على ملخص لحركات المخزون وإحصائيات عامة
   */
  public async getMovementsSummary(): Promise<any> {
    try {
      // الحصول على إجمالي حركات المخزون
      const { count: totalMovements, error: countError } = await supabase
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // الحصول على عدد الحركات الواردة
      const { count: inMovements, error: inError } = await supabase
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true })
        .eq('movement_type', 'in');

      if (inError) throw inError;

      // الحصول على عدد الحركات الصادرة
      const { count: outMovements, error: outError } = await supabase
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true })
        .eq('movement_type', 'out');

      if (outError) throw outError;

      // الحصول على إجمالي كميات الوارد
      const { data: inQuantities, error: inQtyError } = await supabase
        .from('inventory_movements')
        .select('quantity')
        .eq('movement_type', 'in');

      if (inQtyError) throw inQtyError;

      const totalInQuantity = inQuantities.reduce((sum, item) => sum + (item.quantity || 0), 0);

      // الحصول على إجمالي كميات الصادر
      const { data: outQuantities, error: outQtyError } = await supabase
        .from('inventory_movements')
        .select('quantity')
        .eq('movement_type', 'out');

      if (outQtyError) throw outQtyError;

      const totalOutQuantity = outQuantities.reduce((sum, item) => sum + (item.quantity || 0), 0);

      // الحصول على أعداد بنوع العنصر باستخدام استعلام مباشر لكل نوع
      const typeData = [];
      const itemTypes = ['raw', 'semi', 'packaging', 'finished'];
      
      for (const itemType of itemTypes) {
        const { count } = await supabase
          .from('inventory_movements')
          .select('*', { count: 'exact', head: true })
          .eq('item_type', itemType);
          
        typeData.push({
          item_type: itemType,
          count: count || 0
        });
      }

      // إعداد التقرير النهائي
      return {
        totalMovements: totalMovements || 0,
        inMovements: inMovements || 0,
        outMovements: outMovements || 0,
        totalInQuantity,
        totalOutQuantity,
        netQuantity: totalInQuantity - totalOutQuantity,
        byItemType: typeData,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("خطأ في الحصول على ملخص حركات المخزون:", error);
      return null;
    }
  }

  /**
   * الحصول على تقرير حركة المخزون لصنف معين
   * @param itemId معرف الصنف
   * @param itemType نوع الصنف
   */
  public async getItemMovementReport(itemId: string, itemType: string): Promise<any> {
    try {
      // الحصول على حركات الصنف
      const movements = await this.trackingService.getItemMovements(itemId, itemType);
      
      // الحصول على حركات الصنف المجمعة حسب الشهر
      const monthlyMovements = await this.trackingService.getItemMovementsByTime(itemId, itemType, 'month');
      
      // الحصول على الرصيد الحالي
      let currentQuantity = 0;
      
      // تحديد الجدول المناسب حسب نوع العنصر
      let tableName = '';
      switch (itemType) {
        case 'raw':
          tableName = 'raw_materials';
          break;
        case 'semi':
          tableName = 'semi_finished_products';
          break;
        case 'packaging':
          tableName = 'packaging_materials';
          break;
        case 'finished':
          tableName = 'finished_products';
          break;
      }
      
      if (tableName) {
        // تحويل معرف العنصر إلى رقم إذا كان الجدول يستخدم معرفات رقمية
        const numericId = parseInt(itemId);
        if (!isNaN(numericId)) {
          const { data, error } = await supabase
            .from(tableName)
            .select('quantity')
            .eq('id', numericId)
            .single();
          
          if (!error && data) {
            currentQuantity = data.quantity || 0;
          }
        }
      }
      
      // حساب إحصائيات أخرى
      const totalIn = movements
        .filter(m => m.movement_type === 'in')
        .reduce((sum, m) => sum + (m.quantity || 0), 0);
      
      const totalOut = movements
        .filter(m => m.movement_type === 'out')
        .reduce((sum, m) => sum + (m.quantity || 0), 0);
      
      // إعداد التقرير النهائي
      return {
        itemId,
        itemType,
        currentQuantity,
        totalMovements: movements.length,
        totalIn,
        totalOut,
        balance: totalIn - totalOut,
        movements,
        monthlyMovements,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("خطأ في الحصول على تقرير حركة المخزون للصنف:", error);
      return null;
    }
  }

  /**
   * الحصول على أكثر الأصناف حركة في المخزون
   * @param limit عدد النتائج
   */
  public async getMostActiveItems(limit: number = 10): Promise<any[]> {
    try {
      // استخدام وظيفة SQL بدلاً من التجميع اليدوي
      const { data: movementCounts, error } = await supabase
        .rpc('get_inventory_movements_by_item', {
          p_item_id: '',
          p_item_type: ''
        });
      
      if (error) {
        console.error("خطأ في استدعاء وظيفة SQL:", error);
        // استخدام طريقة بديلة بدون تجميع
        const { data } = await supabase
          .from('inventory_movements')
          .select('item_type, item_id, count(*)')
          .limit(100);
        
        // تجميع البيانات يدوياً
        const itemCounts: Record<string, { type: string, id: string, count: number }> = {};
        
        if (data) {
          data.forEach(item => {
            const key = `${item.item_type}-${item.item_id}`;
            if (!itemCounts[key]) {
              itemCounts[key] = {
                type: item.item_type,
                id: item.item_id,
                count: 0
              };
            }
            itemCounts[key].count++;
          });
        }
        
        // تحويل البيانات إلى مصفوفة وترتيبها
        const itemsArray = Object.values(itemCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
          
        // إضافة تفاصيل العناصر
        const itemsWithDetails = await Promise.all(itemsArray.map(async (item) => {
          let details: any = {
            id: item.id,
            type: item.type,
            count: item.count,
            name: '',
            unit: '',
            quantity: 0
          };
          
          // تحديد الجدول المناسب
          let tableName = '';
          switch (item.type) {
            case 'raw':
              tableName = 'raw_materials';
              break;
            case 'semi':
              tableName = 'semi_finished_products';
              break;
            case 'packaging':
              tableName = 'packaging_materials';
              break;
            case 'finished':
              tableName = 'finished_products';
              break;
          }
          
          if (tableName) {
            try {
              const numericId = parseInt(item.id);
              if (!isNaN(numericId)) {
                const { data: itemDetails } = await supabase
                  .from(tableName)
                  .select('name, unit, quantity')
                  .eq('id', numericId)
                  .single();
                
                if (itemDetails) {
                  details.name = itemDetails.name || '';
                  details.unit = itemDetails.unit || '';
                  details.quantity = itemDetails.quantity || 0;
                }
              }
            } catch (e) {
              console.warn(`Failed to get details for ${item.type} ${item.id}:`, e);
            }
          }
          
          return details;
        }));
        
        return itemsWithDetails;
      }
      
      return [];
    } catch (error) {
      console.error("خطأ في الحصول على أكثر الأصناف حركة:", error);
      return [];
    }
  }
}

export default InventoryMovementReportingService;
