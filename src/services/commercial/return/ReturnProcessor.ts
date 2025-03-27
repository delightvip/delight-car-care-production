
import { Return } from "@/services/CommercialTypes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OperationLocks, runAsyncOperation } from "@/utils/asyncUtils";
import { ErrorHandler } from "@/utils/errorHandler";
import InventoryService from "@/services/InventoryService";
import LedgerService from "../ledger/LedgerService";
import CommercialFinanceIntegration from "@/services/integrations/CommercialFinanceIntegration";

/**
 * معالج المرتجعات
 * مسؤول عن معالجة عمليات تأكيد وإلغاء المرتجعات
 */
export class ReturnProcessor {
  private inventoryService: InventoryService;
  private ledgerService: LedgerService;
  private financeIntegration: CommercialFinanceIntegration;

  constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.ledgerService = LedgerService.getInstance();
    this.financeIntegration = CommercialFinanceIntegration.getInstance();
  }

  /**
   * تأكيد مرتجع
   * @param returnId معرف المرتجع
   * @param returnData بيانات المرتجع (اختياري)
   */
  public async confirmReturn(returnId: string, returnData?: Return): Promise<boolean> {
    return OperationLocks.runWithLock(`confirm-return-${returnId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          // الحصول على بيانات المرتجع إذا لم تكن متاحة
          const data = returnData || await this.getReturnData(returnId);
          if (!data) {
            toast.error("لم يتم العثور على المرتجع");
            return false;
          }

          if (data.payment_status !== "draft") {
            toast.error("لا يمكن تأكيد مرتجع تم تأكيده أو إلغاؤه من قبل");
            return false;
          }

          // تحديث حالة المرتجع
          const { error: updateError } = await supabase
            .from("returns")
            .update({ payment_status: "confirmed" })
            .eq("id", returnId);

          if (updateError) throw updateError;

          // تحديث المخزون والحسابات
          if (data.items && data.items.length > 0) {
            // 1. تحديث المخزون
            for (const item of data.items) {
              let quantity: number;
              
              if (data.return_type === "sales_return") {
                // مرتجع مبيعات: إضافة للمخزون
                quantity = item.quantity;
              } else {
                // مرتجع مشتريات: خصم من المخزون
                quantity = -item.quantity;
              }

              await this.updateInventoryItem(
                item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
                item.item_id,
                quantity,
                `Return #${returnId} - ${data.return_type}`
              );
            }
          }

          // 2. إضافة قيد في سجل الحساب إذا كان هناك طرف مرتبط
          if (data.party_id) {
            let debit = 0;
            let credit = 0;

            if (data.return_type === "sales_return") {
              // مرتجع مبيعات: المنشأة تستحق على العميل
              debit = 0;
              credit = data.amount;
            } else {
              // مرتجع مشتريات: المنشأة تدفع للمورد
              debit = data.amount;
              credit = 0;
            }

            await this.ledgerService.addLedgerEntry({
              party_id: data.party_id,
              transaction_id: returnId,
              transaction_type: data.return_type,
              date: data.date,
              debit,
              credit,
              notes: `مرتجع ${data.return_type === "sales_return" ? "مبيعات" : "مشتريات"} رقم ${returnId}`
            });
          }

          // 3. تسجيل معاملة مالية إذا كان المرتجع نقدي
          if (data.payment_status === "confirmed" && data.party_id) {
            // هنا يمكن إضافة منطق لتحديد ما إذا كان المرتجع نقدي أو آجل
            // وإضافة المعاملة المالية المناسبة
            const categoryId = data.return_type === "sales_return" 
              ? "sales-returns-category-id" // يجب استبداله بمعرف فئة مرتجعات المبيعات الفعلي
              : "purchase-returns-category-id"; // يجب استبداله بمعرف فئة مرتجعات المشتريات الفعلي

            await this.financeIntegration.recordFinancialTransaction({
              type: data.return_type === "sales_return" ? "expense" : "income",
              amount: data.amount,
              payment_method: "cash", // يمكن تحديد طريقة الدفع بناءً على بيانات المرتجع
              category_id: categoryId,
              reference_id: returnId,
              reference_type: data.return_type,
              date: data.date,
              notes: `مرتجع ${data.return_type === "sales_return" ? "مبيعات" : "مشتريات"} رقم ${returnId}`
            });

            // تحديث رصيد الخزينة
            await this.financeIntegration.updateBalance(
              data.return_type === "sales_return" ? -data.amount : data.amount,
              "cash" // يمكن تحديد طريقة الدفع بناءً على بيانات المرتجع
            );
          }

          toast.success(`تم تأكيد المرتجع بنجاح`);
          return true;
        } catch (error) {
          ErrorHandler.handleError(
            error,
            "confirmReturn",
            "حدث خطأ أثناء تأكيد المرتجع"
          );
          return false;
        }
      });
    });
  }

  /**
   * إلغاء مرتجع
   * @param returnId معرف المرتجع
   * @param returnData بيانات المرتجع (اختياري)
   */
  public async cancelReturn(returnId: string, returnData?: Return): Promise<boolean> {
    return OperationLocks.runWithLock(`cancel-return-${returnId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          // الحصول على بيانات المرتجع إذا لم تكن متاحة
          const data = returnData || await this.getReturnData(returnId);
          if (!data) {
            toast.error("لم يتم العثور على المرتجع");
            return false;
          }

          if (data.payment_status !== "confirmed") {
            toast.error("لا يمكن إلغاء مرتجع غير مؤكد أو تم إلغاؤه من قبل");
            return false;
          }

          // تحديث حالة المرتجع
          const { error: updateError } = await supabase
            .from("returns")
            .update({ payment_status: "cancelled" })
            .eq("id", returnId);

          if (updateError) throw updateError;

          // عكس تأثير المرتجع على المخزون والحسابات
          if (data.items && data.items.length > 0) {
            // 1. تحديث المخزون
            for (const item of data.items) {
              let quantity: number;
              
              if (data.return_type === "sales_return") {
                // عكس مرتجع مبيعات: خصم من المخزون
                quantity = -item.quantity;
              } else {
                // عكس مرتجع مشتريات: إضافة للمخزون
                quantity = item.quantity;
              }

              await this.updateInventoryItem(
                item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
                item.item_id,
                quantity,
                `Cancel Return #${returnId} - ${data.return_type}`
              );
            }
          }

          // 2. إضافة قيد عكسي في سجل الحساب إذا كان هناك طرف مرتبط
          if (data.party_id) {
            let debit = 0;
            let credit = 0;

            if (data.return_type === "sales_return") {
              // عكس مرتجع مبيعات: المنشأة تدين العميل
              debit = data.amount;
              credit = 0;
            } else {
              // عكس مرتجع مشتريات: المنشأة تستحق على المورد
              debit = 0;
              credit = data.amount;
            }

            await this.ledgerService.addLedgerEntry({
              party_id: data.party_id,
              transaction_id: returnId,
              transaction_type: `cancel_${data.return_type}`,
              date: new Date().toISOString().split("T")[0],
              debit,
              credit,
              notes: `إلغاء مرتجع ${data.return_type === "sales_return" ? "مبيعات" : "مشتريات"} رقم ${returnId}`
            });
          }

          // 3. إلغاء المعاملة المالية المرتبطة بالمرتجع إذا كانت موجودة
          // هنا يمكن إضافة منطق لإلغاء المعاملة المالية المرتبطة بالمرتجع

          toast.success(`تم إلغاء المرتجع بنجاح`);
          return true;
        } catch (error) {
          ErrorHandler.handleError(
            error,
            "cancelReturn",
            "حدث خطأ أثناء إلغاء المرتجع"
          );
          return false;
        }
      });
    });
  }

  /**
   * الحصول على بيانات المرتجع
   * @param returnId معرف المرتجع
   */
  private async getReturnData(returnId: string): Promise<Return | null> {
    try {
      const { data, error } = await supabase
        .from("returns")
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq("id", returnId)
        .single();

      if (error) throw error;

      if (!data) return null;

      // Fetch return items in a separate query
      const { data: returnItems, error: itemsError } = await supabase
        .from("return_items")
        .select("*")
        .eq("return_id", returnId);

      if (itemsError) throw itemsError;

      // Cast the item_type to the expected enum type
      const typedItems = (returnItems || []).map(item => ({
        ...item,
        item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products"
      }));

      return {
        id: data.id,
        invoice_id: data.invoice_id,
        party_id: data.party_id,
        party_name: data.parties?.name,
        date: data.date,
        return_type: data.return_type as "sales_return" | "purchase_return",
        amount: data.amount,
        items: typedItems,
        payment_status: data.payment_status as "draft" | "confirmed" | "cancelled",
        notes: data.notes,
        created_at: data.created_at,
      };
    } catch (error) {
      console.error("Error fetching return data:", error);
      return null;
    }
  }

  /**
   * تحديث عنصر المخزون
   * طريقة مساعدة للتفاعل مع خدمة المخزون
   * @param itemType نوع العنصر
   * @param itemId معرف العنصر
   * @param quantity الكمية (موجبة للإضافة، سالبة للخصم)
   * @param reason سبب التحديث
   */
  private async updateInventoryItem(
    itemType: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
    itemId: number,
    quantity: number,
    reason: string
  ): Promise<void> {
    try {
      // التعامل مع أنواع العناصر المختلفة
      switch (itemType) {
        case "raw_materials":
          await this.inventoryService.updateRawMaterial(itemId, { quantity });
          break;
        case "packaging_materials":
          await this.inventoryService.updatePackagingMaterial(itemId, { quantity });
          break;
        case "semi_finished_products":
          await this.inventoryService.updateSemiFinishedProduct(itemId, { quantity });
          break;
        case "finished_products":
          await this.inventoryService.updateFinishedProduct(itemId, { quantity });
          break;
        default:
          throw new Error(`نوع عنصر غير معروف: ${itemType}`);
      }
    } catch (error) {
      console.error(`Error updating inventory item (${itemType}, ${itemId}):`, error);
      throw error;
    }
  }
}
