import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import CommercialService from "@/services/CommercialService";

export class InvoiceProcessor {
  private commercialService: CommercialService;
  private partyService: PartyService;
  private inventoryService: InventoryService;
  
  constructor() {
    this.commercialService = CommercialService.getInstance();
    this.partyService = PartyService.getInstance();
    this.inventoryService = InventoryService.getInstance();
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
   * Confirm a sale invoice
   */
  async confirmSaleInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found:', invoiceId);
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoice.payment_status === 'confirmed') {
        console.log('Invoice already confirmed:', invoiceId);
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      // Update party balance based on invoice status
      await this.partyService.updatePartyBalance(
        invoice.party_id as string,
        invoice.total_amount,
        true // isDebit=true for sales (customer's debt increases)
      );
      
      // Update inventory
      for (const item of invoice.items) {
        const { error } = await supabase
          .from(item.item_type)
          .update({ quantity: item.quantity - item.quantity })
          .eq('id', item.item_id);
        
        if (error) {
          console.error('Error updating inventory:', error);
          toast.error('حدث خطأ أثناء تحديث المخزون');
          return false;
        }
      }
      
      // Update invoice status
      const { error: statusError } = await supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (statusError) {
        console.error('Error updating invoice status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
        return false;
      }
      
      toast.success('تم تأكيد الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming sale invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد فاتورة البيع');
      return false;
    }
  }
  
  /**
   * Cancel a sale invoice
   */
  async cancelSaleInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found:', invoiceId);
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoice.payment_status !== 'confirmed') {
        console.log('Invoice is not confirmed:', invoiceId);
        toast.info('الفاتورة ليست مؤكدة');
        return true;
      }
      
      // Update party balance based on invoice status
      await this.partyService.updatePartyBalance(
        invoice.party_id as string,
        invoice.total_amount,
        false // isDebit=false to reverse the sale (customer's debt decreases)
      );
      
      // Update inventory
      for (const item of invoice.items) {
        const { error } = await supabase
          .from(item.item_type)
          .update({ quantity: item.quantity + item.quantity })
          .eq('id', item.item_id);
        
        if (error) {
          console.error('Error updating inventory:', error);
          toast.error('حدث خطأ أثناء تحديث المخزون');
          return false;
        }
      }
      
      // Update invoice status
      const { error: statusError } = await supabase
        .from('invoices')
        .update({ payment_status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (statusError) {
        console.error('Error updating invoice status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
        return false;
      }
      
      toast.success('تم إلغاء الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling sale invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء فاتورة البيع');
      return false;
    }
  }
  
  /**
   * Confirm a purchase invoice
   */
  async confirmPurchaseInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found:', invoiceId);
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoice.payment_status === 'confirmed') {
        console.log('Invoice already confirmed:', invoiceId);
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      // Update party balance based on invoice status
      await this.partyService.updatePartyBalance(
        invoice.party_id as string,
        invoice.total_amount,
        false // isDebit=false for purchases (our debt to supplier increases)
      );
      
      // Update inventory
      for (const item of invoice.items) {
        const { error } = await supabase
          .from(item.item_type)
          .update({ quantity: item.quantity + item.quantity })
          .eq('id', item.item_id);
        
        if (error) {
          console.error('Error updating inventory:', error);
          toast.error('حدث خطأ أثناء تحديث المخزون');
          return false;
        }
      }
      
      // Update invoice status
      const { error: statusError } = await supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (statusError) {
        console.error('Error updating invoice status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
        return false;
      }
      
      toast.success('تم تأكيد الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming purchase invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد فاتورة الشراء');
      return false;
    }
  }
  
  /**
   * Cancel a purchase invoice
   */
  async cancelPurchaseInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found:', invoiceId);
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoice.payment_status !== 'confirmed') {
        console.log('Invoice is not confirmed:', invoiceId);
        toast.info('الفاتورة ليست مؤكدة');
        return true;
      }
      
      // Update party balance based on invoice status
      await this.partyService.updatePartyBalance(
        invoice.party_id as string,
        invoice.total_amount,
        true // isDebit=true to reverse the purchase (our debt to supplier decreases)
      );
      
      // Update inventory
      for (const item of invoice.items) {
        const { error } = await supabase
          .from(item.item_type)
          .update({ quantity: item.quantity - item.quantity })
          .eq('id', item.item_id);
        
        if (error) {
          console.error('Error updating inventory:', error);
          toast.error('حدث خطأ أثناء تحديث المخزون');
          return false;
        }
      }
      
      // Update invoice status
      const { error: statusError } = await supabase
        .from('invoices')
        .update({ payment_status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (statusError) {
        console.error('Error updating invoice status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
        return false;
      }
      
      toast.success('تم إلغاء الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling purchase invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء فاتورة الشراء');
      return false;
    }
  }
}
