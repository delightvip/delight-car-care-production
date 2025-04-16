
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * واجهة حركة المخزون لاستخدامها في التتبع
 */
export interface InventoryMovementRecord {
  item_id: string;
  item_type: string; // 'raw', 'semi', 'packaging', 'finished'
  movement_type: 'in' | 'out';
  quantity: number;
  reason?: string;
  user_id?: string;
}

/**
 * خدمة تتبع حركات المخزون - مسؤولة فقط عن تسجيل الحركات دون التأثير على المخزون
 */
class InventoryMovementTrackingService {
  private static instance: InventoryMovementTrackingService;

  private constructor() {}

  public static getInstance(): InventoryMovementTrackingService {
    if (!InventoryMovementTrackingService.instance) {
      InventoryMovementTrackingService.instance = new InventoryMovementTrackingService();
    }
    return InventoryMovementTrackingService.instance;
  }

  /**
   * تسجيل حركة مخزون جديدة
   * @param movement بيانات الحركة
   */
  public async recordMovement(movement: InventoryMovementRecord): Promise<boolean> {
    try {
      // الحصول على الرصيد الحالي للعنصر من الجدول المناسب
      const currentBalance = await this.getCurrentItemBalance(movement.item_id, movement.item_type);
      
      // حساب الرصيد بعد الحركة
      const balanceAfter = movement.movement_type === 'in' 
        ? currentBalance + movement.quantity 
        : currentBalance - movement.quantity;
      
      // إدخال سجل الحركة في جدول حركات المخزون
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          item_id: movement.item_id,
          item_type: movement.item_type,
          movement_type: movement.movement_type,
          quantity: movement.quantity,
          balance_after: Math.max(0, balanceAfter), // منع الأرصدة السالبة في السجل
          reason: movement.reason || '',
          user_id: movement.user_id
        });

      if (error) {
        throw error;
      }

      console.log(`تم تسجيل حركة مخزون: ${movement.movement_type} ${movement.quantity} من ${movement.item_type} رقم ${movement.item_id}`);
      return true;
    } catch (error) {
      console.error("خطأ في تسجيل حركة المخزون:", error);
      return false;
    }
  }

  /**
   * تسجيل مجموعة من حركات المخزون في عملية واحدة
   * @param movements مجموعة الحركات
   */
  public async recordBatchMovements(movements: InventoryMovementRecord[]): Promise<boolean> {
    try {
      let success = true;
      
      // استخدام وعود متوازية لتحسين الأداء
      const recordPromises = movements.map(async (movement) => {
        const result = await this.recordMovement(movement);
        if (!result) success = false;
        return result;
      });
      
      await Promise.all(recordPromises);
      
      return success;
    } catch (error) {
      console.error("خطأ في تسجيل مجموعة حركات المخزون:", error);
      return false;
    }
  }

  /**
   * الحصول على الرصيد الحالي لعنصر في المخزون
   * @param itemId معرف العنصر
   * @param itemType نوع العنصر
   */
  private async getCurrentItemBalance(itemId: string, itemType: string): Promise<number> {
    try {
      let table: string;
      
      // تحديد الجدول المناسب حسب نوع العنصر
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
        default:
          return 0;
      }
      
      // استعلام عن الرصيد الحالي
      if (!['raw_materials', 'semi_finished_products', 'packaging_materials', 'finished_products'].includes(table)) {
        return 0;
      }
      
      const { data, error } = await supabase
        .from(table as any)
        .select('quantity')
        .eq('id', itemId)
        .single();
      
      if (error) {
        console.error(`خطأ في الحصول على رصيد العنصر: ${itemType} ${itemId}`, error);
        return 0;
      }
      
      return data?.quantity || 0;
    } catch (error) {
      console.error("خطأ في الحصول على رصيد العنصر:", error);
      return 0;
    }
  }

  /**
   * الحصول على حركات مخزون عنصر معين
   * @param itemId معرف العنصر
   * @param itemType نوع العنصر
   */
  public async getItemMovements(itemId: string, itemType: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_inventory_movements_by_item', {
        p_item_id: itemId,
        p_item_type: itemType
      });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error("خطأ في الحصول على حركات العنصر:", error);
      return [];
    }
  }

  /**
   * الحصول على حركات مخزون عنصر معين مجمعة حسب الفترة
   * @param itemId معرف العنصر
   * @param itemType نوع العنصر
   * @param period الفترة (day, week, month, year)
   */
  public async getItemMovementsByTime(
    itemId: string, 
    itemType: string, 
    period: string = 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      // استدعاء وظيفة SQL معدة مسبقاً
      const { data, error } = await supabase.rpc('get_inventory_movements_by_time', {
        p_item_id: itemId,
        p_item_type: itemType,
        p_period: period,
        p_start_date: startDate ? startDate.toISOString() : null,
        p_end_date: endDate ? endDate.toISOString() : null
      });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error("خطأ في الحصول على حركات العنصر حسب الفترة:", error);
      return [];
    }
  }

  /**
   * الحصول على حركات المخزون الأخيرة
   * @param limit عدد الحركات
   */
  public async getRecentMovements(limit: number = 10): Promise<any[]> {
    try {
      // استرجاع الحركات الأخيرة يدوياً بدلاً من وظيفة SQL غير موجودة
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          item_id,
          item_type,
          movement_type,
          quantity,
          reason,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // إضافة اسم العنصر (هذا بديل مؤقت للوظيفة المفقودة)
      const enrichedData = await Promise.all((data || []).map(async (item) => {
        let itemName = '';
        
        // تحديد الجدول المناسب حسب نوع العنصر
        let table: string;
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
          default:
            table = '';
        }
        
        if (table) {
          const { data: itemDetails } = await supabase
            .from(table as any)
            .select('name')
            .eq('id', item.item_id)
            .single();
          
          if (itemDetails) {
            itemName = itemDetails.name;
          }
        }
        
        // إضافة اسم المستخدم إذا كان موجوداً
        let userName = '';
        if (item.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', item.user_id)
            .single();
          
          if (userData) {
            userName = userData.name;
          }
        }
        
        return {
          ...item,
          item_name: itemName,
          user_name: userName
        };
      }));
      
      return enrichedData;
    } catch (error) {
      console.error("خطأ في الحصول على الحركات الأخيرة:", error);
      return [];
    }
  }
}

export default InventoryMovementTrackingService;
