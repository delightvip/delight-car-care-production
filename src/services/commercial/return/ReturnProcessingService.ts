
import { toast } from "sonner";
import { Return } from "@/types/returns";
import FinancialCommercialBridge from "@/services/financial/FinancialCommercialBridge";
import { supabase } from "@/integrations/supabase/client";
import returnValidationService from "./ReturnValidationService";

/**
 * خدمة معالجة المرتجعات
 * مسؤولة عن عمليات تأكيد وإلغاء المرتجعات وتحديث المخزون والحسابات
 */
export class ReturnProcessingService {
  private financialBridge: FinancialCommercialBridge;
  
  constructor() {
    this.financialBridge = FinancialCommercialBridge.getInstance();
  }

  /**
   * تأكيد مرتجع (تحديث المخزون والحسابات)
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // 1. التحقق من صحة المرتجع قبل التأكيد
      const validationResult = await returnValidationService.validateBeforeConfirm(returnId);
      if (!validationResult.valid) {
        toast.error(validationResult.message || 'فشل التحقق من صحة المرتجع');
        return false;
      }

      // 2. جلب بيانات المرتجع كاملة
      const returnData = await this.fetchReturnById(returnId);
      
      if (!returnData || !returnData.items || returnData.items.length === 0) {
        toast.error('لا توجد بيانات كافية لتأكيد المرتجع');
        return false;
      }

      console.log("Confirming return with data:", returnData);

      // 3. تحديث حالة المرتجع إلى مؤكد
      await this.updateReturnStatus(returnId, 'confirmed');

      // 4. تحديث المخزون بناءً على نوع المرتجع
      try {
        await this.updateInventory(returnData, 'confirm');
      } catch (error) {
        // في حالة حدوث خطأ، نعيد حالة المرتجع إلى مسودة
        await this.updateReturnStatus(returnId, 'draft');
        throw error;
      }

      // 5. تسجيل المعاملة المالية المقابلة
      try {
        await this.recordFinancialTransaction(returnData, 'confirm');
      } catch (error) {
        // في حالة حدوث خطأ، نحاول عكس تأثير المخزون ونعيد حالة المرتجع إلى مسودة
        await this.updateInventory(returnData, 'reverse_confirm');
        await this.updateReturnStatus(returnId, 'draft');
        throw error;
      }

      toast.success('تم تأكيد المرتجع وتحديث المخزون والحسابات');
      return true;
    } catch (error) {
      console.error(`Error confirming return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }

  /**
   * إلغاء مرتجع (عكس تأثيره على المخزون والحسابات)
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      // 1. التحقق من صحة المرتجع قبل الإلغاء
      const validationResult = await returnValidationService.validateBeforeCancel(returnId);
      if (!validationResult.valid) {
        toast.error(validationResult.message || 'فشل التحقق من صحة المرتجع');
        return false;
      }

      // 2. جلب بيانات المرتجع كاملة
      const returnData = await this.fetchReturnById(returnId);
      
      if (!returnData) {
        toast.error('لا توجد بيانات كافية لإلغاء المرتجع');
        return false;
      }

      console.log("Cancelling return with data:", returnData);

      // 3. تحديث حالة المرتجع إلى ملغي
      await this.updateReturnStatus(returnId, 'cancelled');

      // 4. عكس تأثير المرتجع على المخزون
      try {
        await this.updateInventory(returnData, 'cancel');
      } catch (error) {
        // في حالة حدوث خطأ، نعيد حالة المرتجع إلى مؤكد
        await this.updateReturnStatus(returnId, 'confirmed');
        throw error;
      }

      // 5. عكس المعاملة المالية
      try {
        await this.recordFinancialTransaction(returnData, 'cancel');
      } catch (error) {
        // في حالة حدوث خطأ، نحاول عكس تأثير المخزون ونعيد حالة المرتجع إلى مؤكد
        await this.updateInventory(returnData, 'reverse_cancel');
        await this.updateReturnStatus(returnId, 'confirmed');
        throw error;
      }

      toast.success('تم إلغاء المرتجع وعكس تأثيره على المخزون والحسابات');
      return true;
    } catch (error) {
      console.error(`Error cancelling return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }

  /**
   * جلب بيانات المرتجع بواسطة المعرف
   * @private
   */
  private async fetchReturnById(returnId: string): Promise<Return | null> {
    try {
      // 1. جلب بيانات المرتجع
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', returnId)
        .single();

      if (returnError) throw returnError;

      // 2. جلب عناصر المرتجع
      const { data: items, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', returnId);

      if (itemsError) throw itemsError;

      // 3. إنشاء كائن المرتجع كامل
      return {
        id: returnData.id,
        return_type: returnData.return_type as 'sales_return' | 'purchase_return',
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: returnData.parties?.name,
        date: returnData.date,
        amount: returnData.amount,
        payment_status: returnData.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: returnData.notes,
        created_at: returnData.created_at,
        items: items ? items.map(item => ({
          id: item.id,
          return_id: item.return_id,
          item_id: item.item_id,
          item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          created_at: item.created_at
        })) : []
      };
    } catch (error) {
      console.error(`Error fetching return with id ${returnId}:`, error);
      return null;
    }
  }

  /**
   * تحديث حالة المرتجع
   * @private
   */
  private async updateReturnStatus(returnId: string, status: 'draft' | 'confirmed' | 'cancelled'): Promise<void> {
    const { error } = await supabase
      .from('returns')
      .update({ payment_status: status })
      .eq('id', returnId);

    if (error) throw error;
  }

  /**
   * تحديث المخزون بناءً على نوع المرتجع والعملية
   * @private
   */
  private async updateInventory(returnData: Return, action: 'confirm' | 'cancel' | 'reverse_confirm' | 'reverse_cancel'): Promise<void> {
    if (!returnData.items || returnData.items.length === 0) {
      console.log("No items to update inventory");
      return;
    }

    console.log(`Processing ${returnData.items.length} items for inventory update`, returnData.items);

    for (const item of returnData.items) {
      // تحديد نوع العملية بناءً على نوع المرتجع والعملية المطلوبة
      let shouldIncrease = false;

      if (returnData.return_type === 'sales_return') {
        // مرتجع مبيعات: عند التأكيد نزيد المخزون، عند الإلغاء ننقص المخزون
        if (action === 'confirm' || action === 'reverse_cancel') {
          shouldIncrease = true;
        }
      } else {
        // مرتجع مشتريات: عند التأكيد ننقص المخزون، عند الإلغاء نزيد المخزون
        if (action === 'cancel' || action === 'reverse_confirm') {
          shouldIncrease = true;
        }
      }

      // تأكد من أن item_id هو رقم
      const itemId = Number(item.item_id);
      // تأكد من أن الكمية هي رقم إيجابي
      const quantity = Math.max(0, Number(item.quantity));

      if (isNaN(itemId) || itemId <= 0) {
        console.error(`Invalid item_id: ${item.item_id}, skipping inventory update`);
        continue;
      }

      if (isNaN(quantity) || quantity <= 0) {
        console.error(`Invalid quantity: ${item.quantity}, skipping inventory update`);
        continue;
      }

      console.log(`${shouldIncrease ? 'Increasing' : 'Decreasing'} inventory for item ${itemId} (${item.item_type}) by ${quantity}`);
      
      try {
        // تنفيذ تحديث المخزون من خلال استدعاء الدالة المناسبة
        if (shouldIncrease) {
          await this.increaseItemQuantity(item.item_type, itemId, quantity);
        } else {
          await this.decreaseItemQuantity(item.item_type, itemId, quantity);
        }
      } catch (error) {
        console.error(`Error updating inventory for item ${itemId}:`, error);
        throw new Error(`فشل تحديث المخزون للصنف: ${item.item_name}`);
      }
    }
  }

  /**
   * زيادة كمية الصنف في المخزون
   * @private
   */
  private async increaseItemQuantity(
    itemType: string,
    itemId: number,
    quantity: number
  ): Promise<boolean> {
    try {
      const table = this.getTableNameFromItemType(itemType);
      
      // 1. جلب الكمية الحالية
      const { data, error } = await supabase
        .from(table)
        .select('quantity')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      
      // 2. حساب الكمية الجديدة
      const currentQuantity = data.quantity || 0;
      const newQuantity = currentQuantity + quantity;
      
      // 3. تحديث الكمية
      const { error: updateError } = await supabase
        .from(table)
        .update({ quantity: newQuantity })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      // 4. تسجيل حركة المخزون
      await this.recordInventoryMovement(itemType, itemId, quantity, 'in', 'return');
      
      return true;
    } catch (error) {
      console.error(`Error increasing quantity for ${itemType} item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * خفض كمية الصنف في المخزون
   * @private
   */
  private async decreaseItemQuantity(
    itemType: string,
    itemId: number,
    quantity: number
  ): Promise<boolean> {
    try {
      const table = this.getTableNameFromItemType(itemType);
      
      // 1. جلب الكمية الحالية
      const { data, error } = await supabase
        .from(table)
        .select('quantity')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      
      // 2. التحقق من توفر الكمية المطلوبة
      const currentQuantity = data.quantity || 0;
      if (currentQuantity < quantity) {
        throw new Error(`الكمية المتوفرة (${currentQuantity}) أقل من الكمية المطلوبة (${quantity})`);
      }
      
      // 3. حساب الكمية الجديدة
      const newQuantity = currentQuantity - quantity;
      
      // 4. تحديث الكمية
      const { error: updateError } = await supabase
        .from(table)
        .update({ quantity: newQuantity })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      // 5. تسجيل حركة المخزون
      await this.recordInventoryMovement(itemType, itemId, quantity, 'out', 'return_cancel');
      
      return true;
    } catch (error) {
      console.error(`Error decreasing quantity for ${itemType} item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * تسجيل حركة في المخزون
   * @private
   */
  private async recordInventoryMovement(
    itemType: string,
    itemId: number,
    quantity: number,
    direction: 'in' | 'out',
    source: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          item_id: itemId.toString(), // Convert to string as expected by the API
          item_type: itemType,
          quantity: direction === 'in' ? quantity : -quantity,
          movement_type: direction,
          reason: source,
          balance_after: 0, // This will be updated by a trigger/function
          date: new Date().toISOString().split('T')[0]
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error recording inventory movement:', error);
      // تجاهل الخطأ هنا لأنه ثانوي
    }
  }

  /**
   * الحصول على اسم الجدول من نوع الصنف
   * @private
   */
  private getTableNameFromItemType(itemType: string): string {
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
        throw new Error(`نوع صنف غير معروف: ${itemType}`);
    }
  }

  /**
   * تسجيل المعاملة المالية
   * @private
   */
  private async recordFinancialTransaction(returnData: Return, action: 'confirm' | 'cancel'): Promise<void> {
    // 1. إعداد بيانات المعاملة المالية
    const note = returnData.return_type === 'sales_return' 
      ? `مرتجع مبيعات من ${returnData.party_name || ''}` 
      : `مرتجع مشتريات إلى ${returnData.party_name || ''}`;

    // 2. تحديد نوع المعاملة بناءً على الإجراء
    const transactionData = (action === 'confirm')
      ? {
          id: returnData.id,
          return_type: returnData.return_type,
          amount: returnData.amount,
          date: returnData.date,
          party_id: returnData.party_id,
          party_name: returnData.party_name,
          invoice_id: returnData.invoice_id,
          notes: note
        }
      : {
          id: returnData.id,
          return_type: returnData.return_type,
          amount: returnData.amount,
          date: returnData.date,
          party_id: returnData.party_id,
          party_name: returnData.party_name
        };

    // 3. استخدام جسر الربط المالي
    if (action === 'confirm') {
      await this.financialBridge.handleReturnConfirmation(transactionData);
    } else {
      await this.financialBridge.handleReturnCancellation(transactionData);
    }
  }
}
