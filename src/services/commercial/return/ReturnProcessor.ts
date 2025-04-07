import { supabase } from "@/integrations/supabase/client";
import { Return } from "@/services/CommercialTypes";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { ReturnEntity } from "./ReturnEntity";
import { toast } from "@/components/ui/use-toast";

interface InventoryItem {
  id: number;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  name: string;
  code: string;
  [key: string]: any;
}

export class ReturnProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;

  constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.partyService = PartyService.getInstance();
  }

  /**
   * Get invoice details by ID without using CommercialService
   */
  private async getInvoiceById(invoiceId: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching invoice ${invoiceId}:`, error);
      return null;
    }
  }

  /**
   * تأكيد مرتجع، تحديث المخزون والسجلات المالية
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await ReturnEntity.fetchById(returnId);
      
      if (!returnData) {
        console.error('Return not found:', returnId);
        toast({
          title: "خطأ",
          description: "لم يتم العثور على المرتجع",
          variant: "destructive"
        });
        return false;
      }
      
      if (returnData.payment_status === 'confirmed') {
        console.log('Return already confirmed:', returnId);
        toast({
          title: "تنبيه",
          description: "المرتجع مؤكد بالفعل",
          variant: "default"
        });
        return true;
      }

      console.log('Processing return confirmation:', returnId, returnData);
      
      // إذا كان المرتجع مرتبط بفاتورة، تحقق من صحة الأصناف
      if (returnData.invoice_id) {
        const invoice = await this.getInvoiceById(returnData.invoice_id);
        
        if (!invoice) {
          console.error('Invoice not found for return:', returnData.invoice_id);
          toast({
            title: "خطأ",
            description: "لم يتم العثور على الفاتورة المرتبطة بالمرتجع",
            variant: "destructive"
          });
          return false;
        }

        // تعيين طرف المرتجع إذا لم يكن موجوداً
        if (!returnData.party_id && invoice.party_id) {
          const { error } = await supabase
            .from('returns')
            .update({ party_id: invoice.party_id })
            .eq('id', returnId);
          
          if (error) {
            console.error('Error updating return party_id:', error);
            toast({
              title: "خطأ",
              description: "حدث خطأ أثناء تحديث بيانات المرتجع",
              variant: "destructive"
            });
            return false;
          }
          
          // تحديث معلومات المرتجع
          returnData.party_id = invoice.party_id;
        }
      }
      
      // التحقق من وجود أصناف
      if (!returnData.items || returnData.items.length === 0) {
        console.error('No items in return:', returnId);
        toast({
          title: "خطأ",
          description: "لا توجد أصناف في المرتجع",
          variant: "destructive"
        });
        return false;
      }

      console.log('Return items:', returnData.items);
      
      // تحديث المخزون وفقاً لنوع المرتجع
      let allUpdatesSuccessful = true;
      
      if (returnData.return_type === 'sales_return') {
        // زيادة المخزون لمرتجعات المبيعات (استلام بضاعة)
        for (const item of returnData.items) {
          try {
            // التأكد من وجود المنتج والحصول على الكمية الحالية
            const { data: currentItem, error: itemError } = await this.getItemByTypeAndId(
              item.item_type,
              item.item_id
            );
            
            if (itemError) {
              console.error(`Error fetching item ${item.item_id}:`, itemError);
              toast({
                title: "خطأ",
                description: `حدث خطأ أثناء جلب معلومات ${item.item_name}`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            if (!currentItem) {
              console.error(`Item not found: ${item.item_name}`);
              toast({
                title: "خطأ", 
                description: `لم يتم العثور على ${item.item_name} في المخزون`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // حساب الكمية الجديدة
            const currentQuantity = Number(currentItem.quantity) || 0;
            const newQuantity = currentQuantity + Number(item.quantity);
            console.log(`Updating ${item.item_name} quantity: ${currentQuantity} + ${item.quantity} = ${newQuantity}`);
            
            // تحديث المخزون
            const { error: updateError } = await this.updateItemQuantity(
              item.item_type,
              item.item_id,
              newQuantity
            );
            
            if (updateError) {
              console.error(`Error updating ${item.item_name} quantity:`, updateError);
              toast({
                title: "خطأ",
                description: `حدث خطأ أثناء تحديث مخزون ${item.item_name}`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // تسجيل حركة المخزون
            await this.recordInventoryMovement(
              item.item_id,
              item.item_type,
              Number(item.quantity),
              newQuantity,
              'in',
              `مرتجع مبيعات - رقم: ${returnId}`
            );
          } catch (err) {
            console.error(`Error processing item ${item.item_name}:`, err);
            allUpdatesSuccessful = false;
          }
        }
        
        // تم إزالة استدعاء تحديث رصيد العميل لمرتجعات المبيعات هنا
        // لأنه سيتم التعامل معه من خلال ReturnProcessingService -> FinancialCommercialBridge
        // لتجنب مضاعفة التأثير على رصيد العميل
        
      } else if (returnData.return_type === 'purchase_return') {
        // خفض المخزون لمرتجعات المشتريات (إرجاع بضاعة للمورد)
        for (const item of returnData.items) {
          try {
            // التأكد من وجود المنتج والحصول على الكمية الحالية
            const { data: currentItem, error: itemError } = await this.getItemByTypeAndId(
              item.item_type,
              item.item_id
            );
            
            if (itemError) {
              console.error(`Error fetching item ${item.item_id}:`, itemError);
              toast({
                title: "خطأ",
                description: `حدث خطأ أثناء جلب معلومات ${item.item_name}`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            if (!currentItem) {
              console.error(`Item not found: ${item.item_name}`);
              toast({
                title: "خطأ",
                description: `لم يتم العثور على ${item.item_name} في المخزون`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // التحقق من وجود كمية كافية للإرجاع
            const currentQuantity = Number(currentItem.quantity) || 0;
            if (currentQuantity < Number(item.quantity)) {
              console.error(`Insufficient quantity for ${item.item_name}: ${currentQuantity} < ${item.quantity}`);
              toast({
                title: "خطأ",
                description: `كمية ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إرجاعها (${item.quantity})`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // حساب الكمية الجديدة
            const newQuantity = currentQuantity - Number(item.quantity);
            console.log(`Updating ${item.item_name} quantity: ${currentQuantity} - ${item.quantity} = ${newQuantity}`);
            
            // تحديث المخزون
            const { error: updateError } = await this.updateItemQuantity(
              item.item_type,
              item.item_id,
              newQuantity
            );
            
            if (updateError) {
              console.error(`Error updating ${item.item_name} quantity:`, updateError);
              toast({
                title: "خطأ",
                description: `حدث خطأ أثناء تحديث مخزون ${item.item_name}`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // تسجيل حركة المخزون
            await this.recordInventoryMovement(
              item.item_id,
              item.item_type,
              -Number(item.quantity),
              newQuantity,
              'out',
              `مرتجع مشتريات - رقم: ${returnId}`
            );
          } catch (err) {
            console.error(`Error processing item ${item.item_name}:`, err);
            allUpdatesSuccessful = false;
          }
        }
        
        // تم إزالة استدعاء تحديث رصيد المورد لمرتجعات المشتريات هنا
        // لأنه سيتم التعامل معه من خلال ReturnProcessingService -> FinancialCommercialBridge
        // لتجنب مضاعفة التأثير على رصيد المورد
      }
      
      if (!allUpdatesSuccessful) {
        console.error('Some updates failed for return:', returnId);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديث بعض البيانات. يرجى التحقق من سجلات النظام.",
          variant: "destructive"
        });
      }
      
      // تحديث حالة المرتجع إلى مؤكد حتى لو كانت هناك بعض الأخطاء في التحديثات
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);
      
      if (error) {
        console.error('Error updating return status:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديث حالة المرتجع",
          variant: "destructive"
        });
        return false;
      }
      
      console.log('Return confirmed successfully:', returnId);
      toast({
        title: "نجاح",
        description: "تم تأكيد المرتجع بنجاح",
        variant: "success"
      });
      
      return true;
    } catch (error) {
      console.error('Error confirming return:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد المرتجع",
        variant: "destructive"
      });
      return false;
    }
  }
  
  /**
   * إلغاء مرتجع، عكس تغييرات المخزون والتغييرات المالية
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await ReturnEntity.fetchById(returnId);
      
      if (!returnData) {
        console.error('Return not found:', returnId);
        toast({
          title: "خطأ",
          description: "لم يتم العثور على المرتجع",
          variant: "destructive"
        });
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        console.error('Cannot cancel unconfirmed return:', returnId, returnData.payment_status);
        toast({
          title: "خطأ",
          description: "يمكن إلغاء المرتجعات المؤكدة فقط",
          variant: "destructive"
        });
        return false;
      }

      console.log('Processing return cancellation:', returnId, returnData);
      
      // التحقق من وجود أصناف
      if (!returnData.items || returnData.items.length === 0) {
        console.error('No items in return:', returnId);
        toast({
          title: "خطأ",
          description: "لا توجد أصناف في المرتجع",
          variant: "destructive"
        });
        return false;
      }
      
      // تحديث المخزون وفقاً لنوع المرتجع
      let allUpdatesSuccessful = true;
      
      if (returnData.return_type === 'sales_return') {
        // خفض المخزون لمرتجعات المبيعات الملغاة (إرجاع البضاعة المستلمة)
        for (const item of returnData.items) {
          try {
            // التأكد من وجود المنتج والحصول على الكمية الحالية
            const { data: currentItem, error: itemError } = await this.getItemByTypeAndId(
              item.item_type,
              item.item_id
            );
            
            if (itemError) {
              console.error(`Error fetching item ${item.item_id}:`, itemError);
              toast({
                title: "خطأ",
                description: `حدث خطأ أثناء جلب معلومات ${item.item_name}`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            if (!currentItem) {
              console.error(`Item not found: ${item.item_name}`);
              toast({
                title: "خطأ",
                description: `لم يتم العثور على ${item.item_name} في المخزون`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // التحقق من وجود كمية كافية للإلغاء
            const currentQuantity = Number(currentItem.quantity) || 0;
            if (currentQuantity < Number(item.quantity)) {
              console.error(`Insufficient quantity for ${item.item_name}: ${currentQuantity} < ${item.quantity}`);
              toast({
                title: "خطأ",
                description: `كمية ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إلغاء إرجاعها (${item.quantity})`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // حساب الكمية الجديدة
            const newQuantity = currentQuantity - Number(item.quantity);
            console.log(`Updating ${item.item_name} quantity: ${currentQuantity} - ${item.quantity} = ${newQuantity}`);
            
            // تحديث المخزون
            const { error: updateError } = await this.updateItemQuantity(
              item.item_type,
              item.item_id,
              newQuantity
            );
            
            if (updateError) {
              console.error(`Error updating ${item.item_name} quantity:`, updateError);
              toast({
                title: "خطأ",
                description: `حدث خطأ أثناء تحديث مخزون ${item.item_name}`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // تسجيل حركة المخزون
            await this.recordInventoryMovement(
              item.item_id,
              item.item_type,
              -Number(item.quantity),
              newQuantity,
              'out',
              `إلغاء مرتجع مبيعات - رقم: ${returnId}`
            );
          } catch (err) {
            console.error(`Error processing item ${item.item_name}:`, err);
            allUpdatesSuccessful = false;
          }
        }
        
        // تم إزالة تحديث حساب العميل لإلغاء مرتجعات المبيعات هنا
        // لأنه سيتم التعامل معه من خلال ReturnProcessingService -> FinancialCommercialBridge
        // لتجنب مضاعفة التأثير على رصيد العميل
        
      } else if (returnData.return_type === 'purchase_return') {
        // زيادة المخزون لمرتجعات المشتريات الملغاة (استعادة البضاعة المرجعة)
        for (const item of returnData.items) {
          try {
            // التأكد من وجود المنتج والحصول على الكمية الحالية
            const { data: currentItem, error: itemError } = await this.getItemByTypeAndId(
              item.item_type,
              item.item_id
            );
            
            if (itemError) {
              console.error(`Error fetching item ${item.item_id}:`, itemError);
              toast({
                title: "خطأ",
                description: `حدث خطأ أثناء جلب معلومات ${item.item_name}`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            if (!currentItem) {
              console.error(`Item not found: ${item.item_name}`);
              toast({
                title: "خطأ",
                description: `لم يتم العثور على ${item.item_name} في المخزون`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // حساب الكمية الجديدة
            const currentQuantity = Number(currentItem.quantity) || 0;
            const newQuantity = currentQuantity + Number(item.quantity);
            console.log(`Updating ${item.item_name} quantity: ${currentQuantity} + ${item.quantity} = ${newQuantity}`);
            
            // تحديث المخزون
            const { error: updateError } = await this.updateItemQuantity(
              item.item_type,
              item.item_id,
              newQuantity
            );
            
            if (updateError) {
              console.error(`Error updating ${item.item_name} quantity:`, updateError);
              toast({
                title: "خطأ",
                description: `حدث خطأ أثناء تحديث مخزون ${item.item_name}`,
                variant: "destructive"
              });
              allUpdatesSuccessful = false;
              continue;
            }
            
            // تسجيل حركة المخزون
            await this.recordInventoryMovement(
              item.item_id,
              item.item_type,
              Number(item.quantity),
              newQuantity,
              'in',
              `إلغاء مرتجع مشتريات - رقم: ${returnId}`
            );
          } catch (err) {
            console.error(`Error processing item ${item.item_name}:`, err);
            allUpdatesSuccessful = false;
          }
        }
        
        // تم إزالة تحديث حساب المورد لإلغاء مرتجعات المشتريات هنا
        // لأنه سيتم التعامل معه من خلال ReturnProcessingService -> FinancialCommercialBridge
        // لتجنب مضاعفة التأثير على رصيد المورد
      }
      
      if (!allUpdatesSuccessful) {
        console.error('Some updates failed for cancelled return:', returnId);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديث بعض البيانات. يرجى التحقق من سجلات النظام.",
          variant: "destructive"
        });
      }
      
      // تحديث حالة المرتجع إلى ملغى حتى لو كانت هناك بعض الأخطاء في التحديثات
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', returnId);
      
      if (error) {
        console.error('Error updating return status:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديث حالة المرتجع",
          variant: "destructive"
        });
        return false;
      }
      
      console.log('Return cancelled successfully:', returnId);
      toast({
        title: "نجاح",
        description: "تم إلغاء المرتجع بنجاح",
        variant: "success"
      });
      
      return true;
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء المرتجع",
        variant: "destructive"
      });
      return false;
    }
  }
  
  /**
   * الحصول على عنصر المخزون حسب النوع والمعرف
   */
  private async getItemByTypeAndId(itemType: string, itemId: string | number) {
    try {
      let tableName = '';
      
      switch (itemType) {
        case 'raw_materials':
          tableName = 'raw_materials';
          break;
        case 'packaging_materials':
          tableName = 'packaging_materials';
          break;
        case 'semi_finished_products':
          tableName = 'semi_finished_products';
          break;
        case 'finished_products':
          tableName = 'finished_products';
          break;
        default:
          return { data: null, error: new Error('نوع المنتج غير معروف') };
      }
      
      const result = await supabase
        .from(tableName as any) // Cast to any to fix TypeScript error
        .select('*')
        .eq('id', itemId)
        .single();
        
      console.log(`Fetched item ${itemId} from ${tableName}:`, result.data);
      
      return result;
    } catch (error) {
      console.error(`Error in getItemByTypeAndId(${itemType}, ${itemId}):`, error);
      return { data: null, error };
    }
  }
  
  /**
   * تحديث كمية العنصر في المخزون
   */
  private async updateItemQuantity(itemType: string, itemId: string | number, newQuantity: number) {
    try {
      let tableName = '';
      
      switch (itemType) {
        case 'raw_materials':
          tableName = 'raw_materials';
          break;
        case 'packaging_materials':
          tableName = 'packaging_materials';
          break;
        case 'semi_finished_products':
          tableName = 'semi_finished_products';
          break;
        case 'finished_products':
          tableName = 'finished_products';
          break;
        default:
          return { error: new Error('نوع المنتج غير معروف') };
      }
      
      console.log(`Updating ${tableName} item ${itemId} to quantity ${newQuantity}`);
      
      return await supabase
        .from(tableName as any) // Cast to any to fix TypeScript error
        .update({ quantity: newQuantity })
        .eq('id', itemId);
    } catch (error) {
      console.error(`Error in updateItemQuantity(${itemType}, ${itemId}, ${newQuantity}):`, error);
      return { error };
    }
  }
  
  /**
   * تسجيل حركة مخزون
   */
  private async recordInventoryMovement(
    itemId: string | number, 
    itemType: string, 
    quantity: number, 
    balanceAfter: number, 
    movementType: 'in' | 'out' | 'adjustment', 
    reason: string
  ) {
    try {
      console.log(`Recording inventory movement: ${itemType} ${itemId}, ${movementType}, ${quantity}, balance: ${balanceAfter}`);
      
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          item_id: itemId.toString(),
          item_type: itemType,
          quantity: quantity,
          balance_after: balanceAfter,
          movement_type: movementType,
          reason: reason
        });
      
      if (error) {
        console.error('Error recording inventory movement:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error recording inventory movement:', error);
      return false;
    }
  }
}

