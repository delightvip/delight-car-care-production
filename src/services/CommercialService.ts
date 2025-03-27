import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Category, Transaction, FinancialSummary, Invoice, Payment, Return } from "./CommercialTypes";
import PartyService from "./PartyService";

class CommercialService {
  private static instance: CommercialService;

  private constructor() {}

  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }

  // Inventory Management
  private getInventoryTableForItemType(itemType: string): string {
    switch (itemType) {
      case "raw_materials":
        return "raw_materials";
      case "packaging_materials":
        return "packaging_materials";
      case "semi_finished_products":
        return "semi_finished_products";
      case "finished_products":
        return "finished_products";
      default:
        throw new Error(`Unknown item type: ${itemType}`);
    }
  }

  public async getInventory(itemType: string): Promise<any[]> {
    const table = this.getInventoryTableForItemType(itemType);
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${itemType} inventory:`, error);
      toast.error(`Failed to fetch ${itemType} inventory.`);
      return [];
    }
  }

  public async getItemById(itemType: string, id: number): Promise<any | null> {
    const table = this.getInventoryTableForItemType(itemType);
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching ${itemType} item with id ${id}:`, error);
      toast.error(`Failed to fetch ${itemType} item.`);
      return null;
    }
  }

  public async addItem(itemType: string, item: any): Promise<any | null> {
    const table = this.getInventoryTableForItemType(itemType);
    try {
      const { data, error } = await supabase.from(table).insert(item).select().single();
      if (error) throw error;
      toast.success(`تمت إضافة ${itemType} بنجاح`);
      return data;
    } catch (error) {
      console.error(`Error adding ${itemType} item:`, error);
      toast.error(`Failed to add ${itemType} item.`);
      return null;
    }
  }

  public async updateItem(itemType: string, id: number, item: any): Promise<boolean> {
    const table = this.getInventoryTableForItemType(itemType);
    try {
      const { error } = await supabase.from(table).update(item).eq("id", id);
      if (error) throw error;
      toast.success(`تم تحديث ${itemType} بنجاح`);
      return true;
    } catch (error) {
      console.error(`Error updating ${itemType} item:`, error);
      toast.error(`Failed to update ${itemType} item.`);
      return false;
    }
  }

  public async deleteItem(itemType: string, id: number): Promise<boolean> {
    const table = this.getInventoryTableForItemType(itemType);
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      toast.success(`تم حذف ${itemType} بنجاح`);
      return true;
    } catch (error) {
      console.error(`Error deleting ${itemType} item:`, error);
      toast.error(`Failed to delete ${itemType} item.`);
      return false;
    }
  }

  public async recordInventoryMovement(movement: {
    item_id: string;
    item_type: string;
    quantity: number;
    movement_type: string;
    reason: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase.from("inventory_movements").insert(movement);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error recording inventory movement:", error);
      return false;
    }
  }

  // Invoice Management
  public async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices.");
      return [];
    }
  }

  public async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching invoice with id ${id}:`, error);
      toast.error("Failed to fetch invoice.");
      return null;
    }
  }

  public async createInvoice(invoice: Omit<Invoice, "id" | "created_at">): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase.from("invoices").insert(invoice).select().single();
      if (error) throw error;
      toast.success("Invoice created successfully!");
      return data;
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice.");
      return null;
    }
  }

  public async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<boolean> {
    try {
      const { error } = await supabase.from("invoices").update(invoice).eq("id", id);
      if (error) throw error;
      toast.success("Invoice updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update invoice.");
      return false;
    }
  }

  // Invoice Items Management
  public async getInvoiceItems(invoiceId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      toast.error("Failed to fetch invoice items.");
      return [];
    }
  }

  public async addInvoiceItem(item: any): Promise<any | null> {
    try {
      const { data, error } = await supabase.from("invoice_items").insert(item).select().single();
      if (error) throw error;
      toast.success("Invoice item added successfully!");
      return data;
    } catch (error) {
      console.error("Error adding invoice item:", error);
      toast.error("Failed to add invoice item.");
      return null;
    }
  }

  public async updateInvoiceItem(id: string, item: any): Promise<boolean> {
    try {
      const { error } = await supabase.from("invoice_items").update(item).eq("id", id);
      if (error) throw error;
      toast.success("Invoice item updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating invoice item:", error);
      toast.error("Failed to update invoice item.");
      return false;
    }
  }

  public async deleteInvoiceItem(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("invoice_items").delete().eq("id", id);
      if (error) throw error;
      toast.success("Invoice item deleted successfully!");
      return true;
    } catch (error) {
      console.error("Error deleting invoice item:", error);
      toast.error("Failed to delete invoice item.");
      return false;
    }
  }

  // Add these methods to the CommercialService class to handle returns:

  public async getReturns(): Promise<Return[]> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
        *,
        parties:party_id (name)
      `)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(returnItem => ({
        ...returnItem,
        party_name: returnItem.parties?.name
      }));
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجعات');
      return [];
    }
  }

  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .insert(returnData)
        .select()
        .single();

      if (error) throw error;

      // Insert return items if available
      if (returnData.items && returnData.items.length > 0) {
        const returnItems = returnData.items.map(item => ({
          ...item,
          return_id: data.id
        }));

        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(returnItems);

        if (itemsError) throw itemsError;
      }

      return data;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }

  public async confirmReturn(id: string): Promise<boolean> {
    try {
      // Get return details
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .select(`*, return_items(*)`)
        .eq('id', id)
        .single();

      if (returnError) throw returnError;

      // Update return status
      const { error: updateError } = await supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update inventory for each item
      const returnItems = returnData.return_items || [];
      for (const item of returnItems) {
        await this.updateInventoryForReturnItem(item, returnData.return_type);
      }

      // Update party balance if present
      if (returnData.party_id) {
        await this.updatePartyBalanceForReturn(returnData);
      }

      return true;
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }

  public async cancelReturn(id: string): Promise<boolean> {
    try {
      // Get return details
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .select(`*, return_items(*)`)
        .eq('id', id)
        .single();

      if (returnError) throw returnError;

      // Can only cancel confirmed returns
      if (returnData.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء المرتجعات المؤكدة فقط');
        return false;
      }

      // Update return status
      const { error: updateError } = await supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Reverse inventory changes
      const returnItems = returnData.return_items || [];
      for (const item of returnItems) {
        await this.reverseInventoryForReturnItem(item, returnData.return_type);
      }

      // Reverse party balance changes if present
      if (returnData.party_id) {
        await this.reversePartyBalanceForReturn(returnData);
      }

      return true;
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }

  private async updateInventoryForReturnItem(item: any, returnType: string): Promise<void> {
    // Implementation details vary based on item_type and return_type
    // This is a simplified version
    try {
      const table = this.getInventoryTableForItemType(item.item_type);

      // For sales returns, we add to inventory
      // For purchase returns, we subtract from inventory
      const isAddition = returnType === 'sales_return';
      const quantityChange = isAddition ? item.quantity : -item.quantity;

      // Get current quantity
      const { data, error } = await supabase
        .from(table)
        .select('quantity')
        .eq('id', item.item_id)
        .single();

      if (error) throw error;

      const newQuantity = (data.quantity || 0) + quantityChange;

      // Update inventory quantity
      const { error: updateError } = await supabase
        .from(table)
        .update({ quantity: newQuantity })
        .eq('id', item.item_id);

      if (updateError) throw updateError;

      // Record inventory movement
      await this.recordInventoryMovement({
        item_id: item.item_id.toString(),
        item_type: item.item_type,
        quantity: quantityChange,
        movement_type: returnType,
        reason: `Return ID: ${item.return_id}`
      });
    } catch (error) {
      console.error('Error updating inventory for return item:', error);
      throw error;
    }
  }

  private async reverseInventoryForReturnItem(item: any, returnType: string): Promise<void> {
    // This just does the opposite of updateInventoryForReturnItem
    try {
      const table = this.getInventoryTableForItemType(item.item_type);

      // For sales returns, we added to inventory, so now subtract
      // For purchase returns, we subtracted from inventory, so now add
      const isAddition = returnType === 'purchase_return';
      const quantityChange = isAddition ? item.quantity : -item.quantity;

      // Get current quantity
      const { data, error } = await supabase
        .from(table)
        .select('quantity')
        .eq('id', item.item_id)
        .single();

      if (error) throw error;

      const newQuantity = (data.quantity || 0) + quantityChange;

      // Update inventory quantity
      const { error: updateError } = await supabase
        .from(table)
        .update({ quantity: newQuantity })
        .eq('id', item.item_id);

      if (updateError) throw updateError;

      // Record inventory movement
      await this.recordInventoryMovement({
        item_id: item.item_id.toString(),
        item_type: item.item_type,
        quantity: quantityChange,
        movement_type: `${returnType}_cancel`,
        reason: `Cancelled Return ID: ${item.return_id}`
      });
    } catch (error) {
      console.error('Error reversing inventory for return item:', error);
      throw error;
    }
  }

  private async updatePartyBalanceForReturn(returnData: any): Promise<void> {
    try {
      const partyService = PartyService.getInstance();

      // For sales return, customer gets credit (we owe them money)
      // For purchase return, supplier owes us money
      const isDebit = returnData.return_type === 'purchase_return';

      await partyService.updatePartyBalance(
        returnData.party_id,
        returnData.amount,
        isDebit,
        `مرتجع ${returnData.return_type === 'sales_return' ? 'مبيعات' : 'مشتريات'} رقم: ${returnData.id}`,
        returnData.return_type,
        returnData.id
      );
    } catch (error) {
      console.error('Error updating party balance for return:', error);
      throw error;
    }
  }

  private async reversePartyBalanceForReturn(returnData: any): Promise<void> {
    try {
      const partyService = PartyService.getInstance();

      // Do the opposite of what updatePartyBalanceForReturn did
      const isDebit = returnData.return_type === 'sales_return';

      await partyService.updatePartyBalance(
        returnData.party_id,
        returnData.amount,
        isDebit,
        `إلغاء مرتجع ${returnData.return_type === 'sales_return' ? 'مبيعات' : 'مشتريات'} رقم: ${returnData.id}`,
        `${returnData.return_type}_cancel`,
        returnData.id
      );
    } catch (error) {
      console.error('Error reversing party balance for return:', error);
      throw error;
    }
  }

  // Also add these methods for invoice and payment operations that are missing:

  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error(`Error fetching invoices for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }

  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error(`Error fetching payments for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }

  public async deleteInvoice(id: string): Promise<boolean> {
    try {
      // Check if invoice can be deleted
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (invoice.payment_status !== 'draft') {
        toast.error('لا يمكن حذف الفاتورة المؤكدة. قم بإلغائها أولا.');
        return false;
      }

      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);

      if (itemsError) throw itemsError;

      // Delete invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
      return false;
    }
  }

  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
      return null;
    }
  }

  public async updatePayment(id: string, paymentData: Partial<Payment>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', id);

      if (error) throw error;

      toast.success('تم تحديث الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('حدث خطأ أثناء تحديث الدفعة');
      return false;
    }
  }

  public async deletePayment(id: string): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (payment.payment_status !== 'draft') {
        toast.error('لا يمكن حذف الدفعة المؤكدة. قم بإلغائها أولا.');
        return false;
      }

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف الدفعة');
      return false;
    }
  }

  public async confirmPayment(id: string): Promise<boolean> {
    try {
      // Get payment details
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update party balance
      if (payment.party_id) {
        const partyService = PartyService.getInstance();
        await partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          payment.payment_type === 'disbursement', // Disbursement is debit
          `دفعة ${payment.payment_type === 'collection' ? 'محصلة' : 'مدفوعة'} رقم: ${payment.id}`,
          'payment',
          payment.id
        );
      }

      toast.success('تم تأكيد الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد الدفعة');
      return false;
    }
  }

  public async cancelPayment(id: string): Promise<boolean> {
    try {
      // Get payment details
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (payment.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء الدفعات المؤكدة فقط');
        return false;
      }

      // Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Reverse party balance
      if (payment.party_id) {
        const partyService = PartyService.getInstance();
        await partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          payment.payment_type === 'collection', // Reverse of confirmation
          `إلغاء دفعة ${payment.payment_type === 'collection' ? 'محصلة' : 'مدفوعة'} رقم: ${payment.id}`,
          'payment_cancel',
          payment.id
        );
      }

      toast.success('تم إلغاء الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('حدث خطأ أثناء إلغاء الدفعة');
      return false;
    }
  }

}

export default CommercialService;
export type { Transaction, Category, FinancialSummary } from "./CommercialTypes";
