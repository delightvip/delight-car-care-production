
import { supabase } from "@/integrations/supabase/client";
import { Return, ReturnItem } from "@/services/CommercialTypes";
import { toast } from "sonner";
import { OperationLocks, runAsyncOperation } from "@/utils/asyncUtils";
import { ErrorHandler } from "@/utils/errorHandler";
import InventoryService from "@/services/InventoryService";
import LedgerService from "../ledger/LedgerService";

/**
 * خدمة إدارة المرتجعات
 */
export class ReturnService {
  private static instance: ReturnService;
  private inventoryService: InventoryService;
  private ledgerService: LedgerService;

  private constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.ledgerService = LedgerService.getInstance();
  }

  public static getInstance(): ReturnService {
    if (!ReturnService.instance) {
      ReturnService.instance = new ReturnService();
    }
    return ReturnService.instance;
  }

  /**
   * الحصول على جميع المرتجعات
   */
  public async getReturns(): Promise<Return[]> {
    return ErrorHandler.wrapOperation(
      async () => {
        const { data, error } = await supabase
          .from("returns")
          .select(`
            *,
            parties:party_id (name)
          `)
          .order("date", { ascending: false });

        if (error) throw error;

        return (data || []).map((item) => ({
          id: item.id,
          invoice_id: item.invoice_id,
          party_id: item.party_id,
          party_name: item.parties?.name,
          date: item.date,
          return_type: item.return_type as "sales_return" | "purchase_return",
          amount: item.amount,
          payment_status: item.payment_status as "draft" | "confirmed" | "cancelled",
          notes: item.notes,
          created_at: item.created_at,
        }));
      },
      "getReturns",
      "حدث خطأ أثناء جلب بيانات المرتجعات",
      []
    ) as Promise<Return[]>;
  }

  /**
   * الحصول على مرتجع محدد بواسطة المعرف
   * @param id معرف المرتجع
   */
  public async getReturnById(id: string): Promise<Return | null> {
    return ErrorHandler.wrapOperation(
      async () => {
        const { data, error } = await supabase
          .from("returns")
          .select(`
            *,
            parties:party_id (name)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;

        if (!data) return null;

        // Fetch return items in a separate query
        const { data: returnItems, error: itemsError } = await supabase
          .from("return_items")
          .select("*")
          .eq("return_id", id);

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
      },
      "getReturnById",
      "حدث خطأ أثناء جلب بيانات المرتجع",
      null
    );
  }

  /**
   * إنشاء مرتجع جديد
   * @param returnData بيانات المرتجع
   */
  public async createReturn(
    returnData: Omit<Return, "id" | "created_at">
  ): Promise<Return | null> {
    return ErrorHandler.wrapOperation(
      async () => {
        // إنشاء المرتجع الرئيسي
        const { data, error } = await supabase
          .from("returns")
          .insert({
            invoice_id: returnData.invoice_id,
            party_id: returnData.party_id,
            date: returnData.date,
            return_type: returnData.return_type,
            amount: returnData.amount,
            payment_status: returnData.payment_status,
            notes: returnData.notes,
          })
          .select()
          .single();

        if (error) throw error;

        // إذا كانت هناك عناصر، قم بإدراجها
        if (returnData.items && returnData.items.length > 0) {
          const itemsToInsert = returnData.items.map((item) => ({
            return_id: data.id,
            item_id: item.item_id,
            item_type: item.item_type,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
          }));

          const { error: itemsError } = await supabase
            .from("return_items")
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }

        // الحصول على اسم الطرف إذا كان متاحاً
        let partyName = "";
        if (returnData.party_id) {
          const { data: party } = await supabase
            .from("parties")
            .select("name")
            .eq("id", returnData.party_id)
            .single();
          partyName = party?.name || "";
        }

        return {
          ...data,
          party_name: partyName,
          return_type: data.return_type as "sales_return" | "purchase_return",
          payment_status: data.payment_status as "draft" | "confirmed" | "cancelled",
          items: returnData.items,
        };
      },
      "createReturn",
      "حدث خطأ أثناء إنشاء المرتجع",
      null
    );
  }

  /**
   * تحديث مرتجع
   * @param id معرف المرتجع
   * @param returnData بيانات المرتجع المحدثة
   */
  public async updateReturn(
    id: string,
    returnData: Partial<Return>
  ): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      async () => {
        // التحقق من أن المرتجع غير مؤكد
        const { data: existingReturn } = await supabase
          .from("returns")
          .select("payment_status")
          .eq("id", id)
          .single();

        if (existingReturn?.payment_status !== "draft") {
          toast.error("لا يمكن تعديل المرتجع بعد تأكيده أو إلغائه");
          return false;
        }

        const { error } = await supabase
          .from("returns")
          .update({
            invoice_id: returnData.invoice_id,
            party_id: returnData.party_id,
            date: returnData.date,
            return_type: returnData.return_type,
            amount: returnData.amount,
            notes: returnData.notes,
          })
          .eq("id", id);

        if (error) throw error;

        // تحديث العناصر إذا كانت متوفرة
        if (returnData.items && returnData.items.length > 0) {
          // حذف العناصر الحالية
          const { error: deleteError } = await supabase
            .from("return_items")
            .delete()
            .eq("return_id", id);

          if (deleteError) throw deleteError;

          // إضافة العناصر الجديدة
          const itemsToInsert = returnData.items.map((item) => ({
            return_id: id,
            item_id: item.item_id,
            item_type: item.item_type,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
          }));

          const { error: itemsError } = await supabase
            .from("return_items")
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }

        return true;
      },
      "updateReturn",
      "حدث خطأ أثناء تحديث المرتجع",
      false
    );
  }

  /**
   * تأكيد مرتجع
   * @param returnId معرف المرتجع
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    return OperationLocks.runWithLock(`confirm-return-${returnId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          // الحصول على بيانات المرتجع كاملة
          const returnData = await this.getReturnById(returnId);
          if (!returnData) {
            toast.error("لم يتم العثور على المرتجع");
            return false;
          }

          if (returnData.payment_status !== "draft") {
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
          if (returnData.items && returnData.items.length > 0) {
            // 1. تحديث المخزون
            for (const item of returnData.items) {
              let quantity: number;
              
              if (returnData.return_type === "sales_return") {
                // مرتجع مبيعات: إضافة للمخزون
                quantity = item.quantity;
              } else {
                // مرتجع مشتريات: خصم من المخزون
                quantity = -item.quantity;
              }

              await this.updateInventoryItem(
                item.item_type,
                item.item_id,
                quantity,
                `Return #${returnId} - ${returnData.return_type}`
              );
            }
          }

          // 2. إضافة قيد في سجل الحساب إذا كان هناك طرف مرتبط
          if (returnData.party_id) {
            let debit = 0;
            let credit = 0;

            if (returnData.return_type === "sales_return") {
              // مرتجع مبيعات: المنشأة تستحق على العميل
              debit = 0;
              credit = returnData.amount;
            } else {
              // مرتجع مشتريات: المنشأة تدفع للمورد
              debit = returnData.amount;
              credit = 0;
            }

            await this.ledgerService.addLedgerEntry({
              party_id: returnData.party_id,
              transaction_id: returnId,
              transaction_type: returnData.return_type,
              date: returnData.date,
              debit,
              credit,
              notes: `مرتجع ${returnData.return_type === "sales_return" ? "مبيعات" : "مشتريات"} رقم ${returnId}`,
            });
          }

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
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    return OperationLocks.runWithLock(`cancel-return-${returnId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          // الحصول على بيانات المرتجع كاملة
          const returnData = await this.getReturnById(returnId);
          if (!returnData) {
            toast.error("لم يتم العثور على المرتجع");
            return false;
          }

          if (returnData.payment_status !== "confirmed") {
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
          if (returnData.items && returnData.items.length > 0) {
            // 1. تحديث المخزون
            for (const item of returnData.items) {
              let quantity: number;
              
              if (returnData.return_type === "sales_return") {
                // عكس مرتجع مبيعات: خصم من المخزون
                quantity = -item.quantity;
              } else {
                // عكس مرتجع مشتريات: إضافة للمخزون
                quantity = item.quantity;
              }

              await this.updateInventoryItem(
                item.item_type,
                item.item_id,
                quantity,
                `Cancel Return #${returnId} - ${returnData.return_type}`
              );
            }
          }

          // 2. إضافة قيد عكسي في سجل الحساب إذا كان هناك طرف مرتبط
          if (returnData.party_id) {
            let debit = 0;
            let credit = 0;

            if (returnData.return_type === "sales_return") {
              // عكس مرتجع مبيعات: المنشأة تدين العميل
              debit = returnData.amount;
              credit = 0;
            } else {
              // عكس مرتجع مشتريات: المنشأة تستحق على المورد
              debit = 0;
              credit = returnData.amount;
            }

            await this.ledgerService.addLedgerEntry({
              party_id: returnData.party_id,
              transaction_id: returnId,
              transaction_type: `cancel_${returnData.return_type}`,
              date: new Date().toISOString().split("T")[0],
              debit,
              credit,
              notes: `إلغاء مرتجع ${returnData.return_type === "sales_return" ? "مبيعات" : "مشتريات"} رقم ${returnId}`,
            });
          }

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
   * حذف مرتجع
   * @param id معرف المرتجع
   */
  public async deleteReturn(id: string): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      async () => {
        // التحقق من أن المرتجع في حالة مسودة
        const { data: existingReturn } = await supabase
          .from("returns")
          .select("payment_status")
          .eq("id", id)
          .single();

        if (existingReturn?.payment_status !== "draft") {
          toast.error("لا يمكن حذف مرتجع تم تأكيده أو إلغاؤه");
          return false;
        }

        // حذف العناصر أولاً
        const { error: itemsError } = await supabase
          .from("return_items")
          .delete()
          .eq("return_id", id);

        if (itemsError) throw itemsError;

        // ثم حذف المرتجع نفسه
        const { error } = await supabase.from("returns").delete().eq("id", id);

        if (error) throw error;

        return true;
      },
      "deleteReturn",
      "حدث خطأ أثناء حذف المرتجع",
      false
    );
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

export default ReturnService;
