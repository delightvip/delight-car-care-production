
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

      // الحصول على عدد الحركات لكل نوع عنصر
      const { data: byItemType, error: typeError } = await supabase
        .from('inventory_movements')
        .select('item_type, count')
        .select('item_type, count(*)')
        .group('item_type');

      if (typeError) throw typeError;

      // إعداد التقرير النهائي
      return {
        totalMovements: totalMovements || 0,
        inMovements: inMovements || 0,
        outMovements: outMovements || 0,
        totalInQuantity,
        totalOutQuantity,
        netQuantity: totalInQuantity - totalOutQuantity,
        byItemType: byItemType || [],
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
      let table = '';
      switch (itemType) {
        case 'raw':
          table = 'raw_materials';
          break;
        case 'semi':
          table = 'semi_finished_products';
          break;
        case 'packaging':
          table = 'packaging_materials';
          break;
        case 'finished':
          table = 'finished_products';
          break;
      }
      
      if (table) {
        const { data, error } = await supabase
          .from(table)
          .select('quantity')
          .eq('id', itemId)
          .single();
        
        if (!error && data) {
          currentQuantity = data.quantity;
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
      // الحصول على حركات المخزون مجمعة حسب نوع العنصر ومعرف العنصر
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('item_type, item_id, count(*)')
        .group('item_type, item_id')
        .order('count', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // الحصول على تفاصيل الأصناف
      const itemsWithDetails = await Promise.all((data || []).map(async (item) => {
        let details: any = {
          id: item.item_id,
          type: item.item_type,
          count: item.count,
          name: '',
          unit: '',
          quantity: 0
        };
        
        // الحصول على تفاصيل الصنف من الجدول المناسب
        let table = '';
        switch (item.item_type) {
          case 'raw':
            table = 'raw_materials';
            break;
          case 'semi':
            table = 'semi_finished_products';
            break;
          case 'packaging':
            table = 'packaging_materials';
            break;
          case 'finished':
            table = 'finished_products';
            break;
        }
        
        if (table) {
          const { data: itemDetails, error: itemError } = await supabase
            .from(table)
            .select('name, unit, quantity')
            .eq('id', item.item_id)
            .single();
          
          if (!itemError && itemDetails) {
            details.name = itemDetails.name;
            details.unit = itemDetails.unit;
            details.quantity = itemDetails.quantity;
          }
        }
        
        return details;
      }));
      
      return itemsWithDetails;
    } catch (error) {
      console.error("خطأ في الحصول على أكثر الأصناف حركة:", error);
      return [];
    }
  }
}

export default InventoryMovementReportingService;
