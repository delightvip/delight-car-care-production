
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";

interface Return {
  id: string;
  party_id: string;
  return_type: string;
  payment_status: string;
  date: string;
  amount: number;
  notes: string;
  created_at: string;
  invoice_id: string | null;
}

interface ReturnItem {
  id: string;
  return_id: string;
  item_id: number;
  item_name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ReturnWithItems extends Return {
  items: ReturnItem[];
}

interface Invoice {
  id: string;
  party_id: string;
  invoice_type: string;
  payment_status: string;
  status: string;
  date: string;
  total_amount: number;
  notes: string;
  created_at: string;
  items: any[];
}

export class ReturnProcessor {
  private partyService: PartyService;
  private inventoryService: InventoryService;

  constructor() {
    this.partyService = PartyService.getInstance();
    this.inventoryService = InventoryService.getInstance();
  }

  async getReturnById(returnId: string): Promise<ReturnWithItems | null> {
    try {
      // Fetch return base data
      const { data: returnData, error } = await supabase
        .from('returns')
        .select('*')
        .eq('id', returnId)
        .single();
      
      if (error) throw error;

      // Fetch return items
      const { data: items, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', returnId);

      if (itemsError) throw itemsError;
      
      return {
        ...returnData,
        items: items || []
      };
    } catch (error) {
      console.error(`Error fetching return ${returnId}:`, error);
      return null;
    }
  }

  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    try {
      // Fetch invoice base data
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;

      // Fetch invoice items
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (itemsError) throw itemsError;
      
      return {
        ...invoice,
        items: items || []
      };
    } catch (error) {
      console.error(`Error fetching invoice ${invoiceId}:`, error);
      return null;
    }
  }

  async confirmSalesReturn(returnId: string): Promise<boolean> {
    try {
      const salesReturn = await this.getReturnById(returnId);
      
      if (!salesReturn) {
        console.error('Sales return not found:', returnId);
        toast.error('لم يتم العثور على مرتجع المبيعات');
        return false;
      }

      // Update party balance
      await this.updatePartyBalance(
        salesReturn.party_id,
        salesReturn.amount,
        false // isDebit=false for sales return (customer's debt decreases)
      );
      
      // Update inventory by returning items
      for (const item of salesReturn.items) {
        // Here we are returning items back to inventory
        // Therefore we need to add the quantity back
        await supabase
          .from(item.item_type)
          .update({
            quantity: supabase.rpc('coalesce_numeric', { 
              p1: `quantity + ${item.quantity}` 
            })
          })
          .eq('id', item.item_id);
      }
      
      // Update return status
      const { error: statusError } = await supabase
        .from('returns')
        .update({
          payment_status: 'confirmed'
        })
        .eq('id', returnId);
      
      if (statusError) {
        console.error('Error updating return status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast.success('تم تأكيد مرتجع المبيعات بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming sales return:', error);
      toast.error('حدث خطأ أثناء تأكيد مرتجع المبيعات');
      return false;
    }
  }

  async cancelSalesReturn(returnId: string): Promise<boolean> {
    try {
      const salesReturn = await this.getReturnById(returnId);
      
      if (!salesReturn) {
        console.error('Sales return not found:', returnId);
        toast.error('لم يتم العثور على مرتجع المبيعات');
        return false;
      }

      // Reverse party balance update
      await this.updatePartyBalance(
        salesReturn.party_id,
        salesReturn.amount,
        true // isDebit=true to reverse the effect (customer's debt increases)
      );
      
      // Reverse inventory update by removing the items again
      for (const item of salesReturn.items) {
        // Here we are reversing the return, so we remove the items again
        await supabase
          .from(item.item_type)
          .update({
            quantity: supabase.rpc('coalesce_numeric', { 
              p1: `quantity - ${item.quantity}` 
            })
          })
          .eq('id', item.item_id);
      }
      
      // Update return status
      const { error: statusError } = await supabase
        .from('returns')
        .update({
          payment_status: 'cancelled'
        })
        .eq('id', returnId);
      
      if (statusError) {
        console.error('Error updating return status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast.success('تم إلغاء مرتجع المبيعات بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling sales return:', error);
      toast.error('حدث خطأ أثناء إلغاء مرتجع المبيعات');
      return false;
    }
  }

  async confirmPurchaseReturn(returnId: string): Promise<boolean> {
    try {
      const purchaseReturn = await this.getReturnById(returnId);
      
      if (!purchaseReturn) {
        console.error('Purchase return not found:', returnId);
        toast.error('لم يتم العثور على مرتجع المشتريات');
        return false;
      }

      // Update party balance
      await this.updatePartyBalance(
        purchaseReturn.party_id,
        purchaseReturn.amount,
        true // isDebit=true for purchase return (supplier's debt increases)
      );
      
      // Update inventory by removing returned items
      for (const item of purchaseReturn.items) {
        // For purchase returns, we are returning items to supplier
        // Therefore we need to remove them from our inventory
        await supabase
          .from(item.item_type)
          .update({
            quantity: supabase.rpc('coalesce_numeric', { 
              p1: `quantity - ${item.quantity}` 
            })
          })
          .eq('id', item.item_id);
      }
      
      // Update return status
      const { error: statusError } = await supabase
        .from('returns')
        .update({
          payment_status: 'confirmed'
        })
        .eq('id', returnId);
      
      if (statusError) {
        console.error('Error updating return status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast.success('تم تأكيد مرتجع المشتريات بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming purchase return:', error);
      toast.error('حدث خطأ أثناء تأكيد مرتجع المشتريات');
      return false;
    }
  }

  async cancelPurchaseReturn(returnId: string): Promise<boolean> {
    try {
      const purchaseReturn = await this.getReturnById(returnId);
      
      if (!purchaseReturn) {
        console.error('Purchase return not found:', returnId);
        toast.error('لم يتم العثور على مرتجع المشتريات');
        return false;
      }

      // Reverse party balance update
      await this.updatePartyBalance(
        purchaseReturn.party_id,
        purchaseReturn.amount,
        false // isDebit=false to reverse the effect (supplier's debt decreases)
      );
      
      // Reverse inventory update by adding the items back
      for (const item of purchaseReturn.items) {
        // We are reversing the return to supplier, so add items back
        await supabase
          .from(item.item_type)
          .update({
            quantity: supabase.rpc('coalesce_numeric', { 
              p1: `quantity + ${item.quantity}` 
            })
          })
          .eq('id', item.item_id);
      }
      
      // Update return status
      const { error: statusError } = await supabase
        .from('returns')
        .update({
          payment_status: 'cancelled'
        })
        .eq('id', returnId);
      
      if (statusError) {
        console.error('Error updating return status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast.success('تم إلغاء مرتجع المشتريات بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling purchase return:', error);
      toast.error('حدث خطأ أثناء إلغاء مرتجع المشتريات');
      return false;
    }
  }

  /**
   * Update party balance based on return transaction
   */
  async updatePartyBalance(partyId: string, amount: number, isDebit: boolean): Promise<boolean> {
    try {
      return await this.partyService.updatePartyBalance(partyId, amount, isDebit);
    } catch (error) {
      console.error('Error updating party balance:', error);
      return false;
    }
  }
}
