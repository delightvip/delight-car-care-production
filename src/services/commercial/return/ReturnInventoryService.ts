
import { supabase } from "@/integrations/supabase/client";

/**
 * خدمة مخزون المرتجعات
 * مسؤولة عن تحديث المخزون بناءً على عمليات المرتجعات
 */
export class ReturnInventoryService {
  /**
   * زيادة كمية صنف في المخزون
   */
  public async increaseItemQuantity(
    itemType: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products',
    itemId: number,
    quantity: number
  ): Promise<boolean> {
    try {
      // تحديد اسم الجدول بناءً على نوع الصنف
      const tableName = this.getTableNameByType(itemType);
      
      // الحصول على الكمية الحالية
      const { data, error } = await supabase
        .from(tableName)
        .select('quantity')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      
      // حساب الكمية الجديدة
      const newQuantity = (data.quantity || 0) + quantity;
      
      // تحديث الكمية
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ quantity: newQuantity })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      // تسجيل حركة المخزون
      await this.recordInventoryMovement(itemType, itemId, quantity, 'increase', 'return', newQuantity);
      
      return true;
    } catch (error) {
      console.error(`Error increasing quantity for ${itemType} item ${itemId}:`, error);
      return false;
    }
  }
  
  /**
   * تقليل كمية صنف في المخزون
   */
  public async decreaseItemQuantity(
    itemType: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products',
    itemId: number,
    quantity: number
  ): Promise<boolean> {
    try {
      // تحديد اسم الجدول بناءً على نوع الصنف
      const tableName = this.getTableNameByType(itemType);
      
      // الحصول على الكمية الحالية
      const { data, error } = await supabase
        .from(tableName)
        .select('quantity')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      
      // التأكد من وجود كمية كافية
      if (data.quantity < quantity) {
        console.error(`Not enough quantity available for ${itemType} item ${itemId}`);
        return false;
      }
      
      // حساب الكمية الجديدة
      const newQuantity = data.quantity - quantity;
      
      // تحديث الكمية
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ quantity: newQuantity })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      // تسجيل حركة المخزون
      await this.recordInventoryMovement(itemType, itemId, quantity, 'decrease', 'return_cancel', newQuantity);
      
      return true;
    } catch (error) {
      console.error(`Error decreasing quantity for ${itemType} item ${itemId}:`, error);
      return false;
    }
  }
  
  /**
   * تسجيل حركة مخزون
   */
  private async recordInventoryMovement(
    itemType: string,
    itemId: number,
    quantity: number,
    movementType: 'increase' | 'decrease',
    reason: string,
    balanceAfter: number
  ): Promise<void> {
    try {
      await supabase
        .from('inventory_movements')
        .insert({
          item_type: itemType,
          item_id: itemId.toString(),
          quantity: movementType === 'increase' ? quantity : -quantity,
          movement_type: movementType,
          reason: reason,
          balance_after: balanceAfter
        });
    } catch (error) {
      console.error('Error recording inventory movement:', error);
    }
  }
  
  /**
   * الحصول على اسم الجدول بناءً على نوع الصنف
   */
  private getTableNameByType(itemType: string): 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products' {
    switch (itemType) {
      case 'raw_materials':
        return 'raw_materials';
      case 'packaging_materials':
        return 'packaging_materials';
      case 'semi_finished_products':
        return 'semi_finished_products';
      case 'finished_products':
        return 'finished_products';
      default:
        throw new Error(`Invalid item type: ${itemType}`);
    }
  }
}

export default ReturnInventoryService;
