
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

// نوع جدول المخزون المطابق
type InventoryTableType = 'raw_materials' | 'semi_finished_products' | 'packaging_materials' | 'finished_products';

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
      // تحديد الجدول المناسب حسب نوع العنصر
      const tableName = this.getTableNameForItemType(itemType);
      
      if (!tableName) {
        console.warn(`نوع العنصر غير معروف: ${itemType}`);
        return 0;
      }
      
      // محاولة تحويل itemId إلى رقم (معظم الجداول تستخدم معرفات رقمية)
      const numericId = parseInt(itemId);
      if (isNaN(numericId)) {
        console.warn(`معرف العنصر ليس رقمًا صالحًا: ${itemId}`);
        return 0;
      }
      
      // استخدام نهج أكثر أمانًا من حيث الأنواع
      const query = supabase
        .from(tableName)
        .select('quantity')
        .eq('id', numericId)
        .single();
      
      const { data, error } = await query;
      
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
      // استخدام وظيفة RPC من قاعدة البيانات
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
      // استرجاع الحركات الأخيرة مباشرة من جدول الحركات
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
      
      // إضافة اسم العنصر بشكل منفصل
      const enrichedData = await Promise.all((data || []).map(async (item) => {
        let itemName = '';
        let userName = '';
        
        // الحصول على اسم العنصر من الجدول المناسب
        if (item.item_type && item.item_id) {
          const tableName = this.getTableNameForItemType(item.item_type);
          
          if (tableName) {
            try {
              const numericId = parseInt(item.item_id);
              if (!isNaN(numericId)) {
                const { data: itemDetails } = await supabase
                  .from(tableName)
                  .select('name')
                  .eq('id', numericId)
                  .single();
                
                if (itemDetails?.name) {
                  itemName = itemDetails.name;
                }
              }
            } catch (e) {
              console.warn(`Failed to get name for ${item.item_type} ${item.item_id}`);
            }
          }
        }
        
        // الحصول على اسم المستخدم إذا كان موجوداً
        if (item.user_id) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('name')
              .eq('id', item.user_id)
              .single();
            
            if (userData?.name) {
              userName = userData.name;
            }
          } catch (e) {
            console.warn(`Failed to get user name for ${item.user_id}`);
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

  /**
   * تحديد اسم الجدول بناءً على نوع العنصر
   * @param itemType نوع العنصر
   * @returns اسم الجدول أو null إذا كان نوع العنصر غير معروف
   */
  private getTableNameForItemType(itemType: string): InventoryTableType | null {
    switch (itemType) {
      case 'raw':
        return 'raw_materials';
      case 'semi':
        return 'semi_finished_products';
      case 'packaging':
        return 'packaging_materials';
      case 'finished':
        return 'finished_products';
      default:
        return null;
    }
  }
}

export default InventoryMovementTrackingService;
