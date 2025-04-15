
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InventoryMovement } from '@/types/inventoryTypes';

/**
 * خدمة تتبع المخزون - مسؤولة فقط عن تسجيل حركات المخزون وليس إجراء تغييرات على المخزون
 */
class InventoryTrackingService {
  private static instance: InventoryTrackingService;

  private constructor() {}

  /**
   * الحصول على نسخة واحدة من الخدمة (نمط Singleton)
   */
  public static getInstance(): InventoryTrackingService {
    if (!InventoryTrackingService.instance) {
      InventoryTrackingService.instance = new InventoryTrackingService();
    }
    return InventoryTrackingService.instance;
  }

  /**
   * تسجيل حركة مخزون جديدة
   * @param movement بيانات حركة المخزون
   */
  public async recordMovement(movement: {
    item_id: string;
    item_type: string;
    movement_type: 'in' | 'out' | 'adjustment';
    quantity: number;
    balance_after: number;
    reason?: string;
  }): Promise<boolean> {
    try {
      // جلب معرف المستخدم الحالي إذا كان متاحًا
      let user_id: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        user_id = user.id;
      }

      // إضافة حركة جديدة في جدول تتبع المخزون
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          item_id: movement.item_id,
          item_type: movement.item_type,
          movement_type: movement.movement_type,
          quantity: movement.quantity,
          balance_after: movement.balance_after,
          reason: movement.reason || '',
          user_id
        });

      if (error) {
        console.error("Error recording inventory movement:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in recordMovement:", error);
      return false;
    }
  }

  /**
   * تسجيل حركة وارد للمخزون
   */
  public async recordIncomingMovement(
    itemId: string,
    itemType: string,
    quantity: number,
    balanceAfter: number,
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      item_id: itemId,
      item_type: itemType,
      movement_type: 'in',
      quantity: Math.abs(quantity), // التأكد من أن الكمية موجبة
      balance_after: balanceAfter,
      reason
    });
  }

  /**
   * تسجيل حركة صرف من المخزون
   */
  public async recordOutgoingMovement(
    itemId: string,
    itemType: string,
    quantity: number,
    balanceAfter: number,
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      item_id: itemId,
      item_type: itemType,
      movement_type: 'out',
      quantity: Math.abs(quantity), // التأكد من أن الكمية موجبة
      balance_after: balanceAfter,
      reason
    });
  }

  /**
   * تسجيل حركة تعديل في المخزون
   */
  public async recordAdjustmentMovement(
    itemId: string,
    itemType: string,
    quantity: number,
    balanceAfter: number,
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      item_id: itemId,
      item_type: itemType,
      movement_type: 'adjustment',
      quantity,
      balance_after: balanceAfter,
      reason: reason || 'تعديل مخزون'
    });
  }

  /**
   * استرجاع حركات المخزون مع إمكانية التصفية
   */
  public async getInventoryMovements(filters?: {
    itemType?: string;
    movementType?: 'in' | 'out' | 'adjustment';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<InventoryMovement[]> {
    try {
      let query = supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false });

      // تطبيق المرشحات إذا كانت موجودة
      if (filters) {
        if (filters.itemType) {
          query = query.eq('item_type', filters.itemType);
        }
        
        if (filters.movementType) {
          query = query.eq('movement_type', filters.movementType);
        }
        
        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate.toISOString());
        }
        
        if (filters.endDate) {
          // إضافة يوم واحد للتاريخ النهائي للتأكد من شمول كل الحركات في ذلك اليوم
          const endDate = new Date(filters.endDate);
          endDate.setDate(endDate.getDate() + 1);
          query = query.lt('created_at', endDate.toISOString());
        }
        
        if (filters.limit) {
          query = query.limit(filters.limit);
        }
        
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching inventory movements:", error);
        throw error;
      }

      // تحويل البيانات إلى الشكل المطلوب
      return (data || []).map(item => ({
        id: item.id,
        item_id: item.item_id,
        item_type: item.item_type,
        movement_type: item.movement_type,
        quantity: item.quantity,
        balance_after: item.balance_after,
        reason: item.reason,
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_id: item.user_id
      }));
    } catch (error) {
      console.error("Error fetching inventory movements:", error);
      toast.error("حدث خطأ أثناء جلب حركات المخزون");
      return [];
    }
  }

  /**
   * استرجاع حركات المخزون لصنف محدد
   */
  public async getItemMovements(itemId: string, itemType: string): Promise<InventoryMovement[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('item_id', itemId)
        .eq('item_type', itemType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching item movements:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getItemMovements:", error);
      return [];
    }
  }

  /**
   * استرجاع إحصائيات حركة المخزون
   */
  public async getMovementStatistics(period?: 'day' | 'week' | 'month' | 'year'): Promise<{
    totalIn: number;
    totalOut: number;
    totalAdjustments: number;
    movementsByType: Record<string, number>;
  }> {
    try {
      let query = supabase
        .from('inventory_movements')
        .select('*');
      
      // تطبيق تصفية حسب الفترة الزمنية
      if (period) {
        const now = new Date();
        let startDate: Date;
        
        switch (period) {
          case 'day':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching movement statistics:", error);
        throw error;
      }

      // تحليل البيانات وحساب الإحصائيات
      const movements = data || [];
      const inMovements = movements.filter(m => m.movement_type === 'in');
      const outMovements = movements.filter(m => m.movement_type === 'out');
      const adjustmentMovements = movements.filter(m => m.movement_type === 'adjustment');
      
      // حساب إجمالي الكميات
      const totalIn = inMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
      const totalOut = outMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
      const totalAdjustments = adjustmentMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
      
      // حساب الحركات حسب النوع
      const movementsByType: Record<string, number> = {};
      movements.forEach(m => {
        const type = m.item_type;
        movementsByType[type] = (movementsByType[type] || 0) + 1;
      });
      
      return {
        totalIn,
        totalOut,
        totalAdjustments,
        movementsByType
      };
    } catch (error) {
      console.error("Error calculating movement statistics:", error);
      return {
        totalIn: 0,
        totalOut: 0,
        totalAdjustments: 0,
        movementsByType: {}
      };
    }
  }
}

export default InventoryTrackingService;
