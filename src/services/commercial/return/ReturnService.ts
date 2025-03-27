
import { supabase } from "@/integrations/supabase/client";
import { Return, ReturnItem } from "@/services/CommercialTypes";
import { toast } from "sonner";
import { OperationLocks, runAsyncOperation } from "@/utils/asyncUtils";
import { ErrorHandler } from "@/utils/errorHandler";
import { ReturnProcessor } from "./ReturnProcessor";

/**
 * خدمة إدارة المرتجعات
 */
export class ReturnService {
  private static instance: ReturnService;
  private returnProcessor: ReturnProcessor;

  private constructor() {
    this.returnProcessor = new ReturnProcessor();
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

        const createdReturn = {
          ...data,
          party_name: partyName,
          return_type: data.return_type as "sales_return" | "purchase_return",
          payment_status: data.payment_status as "draft" | "confirmed" | "cancelled",
          items: returnData.items,
        };

        // تأكيد المرتجع تلقائياً إذا كانت حالته مؤكدة
        if (returnData.payment_status === "confirmed") {
          await this.confirmReturn(data.id);
          return this.getReturnById(data.id);
        }

        return createdReturn;
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
    // استخدام ReturnProcessor للتأكيد
    const returnData = await this.getReturnById(returnId);
    return this.returnProcessor.confirmReturn(returnId, returnData || undefined);
  }

  /**
   * إلغاء مرتجع
   * @param returnId معرف المرتجع
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    // استخدام ReturnProcessor للإلغاء
    const returnData = await this.getReturnById(returnId);
    return this.returnProcessor.cancelReturn(returnId, returnData || undefined);
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
}

export default ReturnService;
