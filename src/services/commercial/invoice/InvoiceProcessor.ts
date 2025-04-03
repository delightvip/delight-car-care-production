
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { Invoice, InvoiceItem } from "@/services/commercial/CommercialTypes";

export class InvoiceProcessor {
  private partyService: PartyService;
  private inventoryService: InventoryService;

  constructor() {
    this.partyService = PartyService.getInstance();
    this.inventoryService = InventoryService.getInstance();
  }

  /**
   * Get invoice details by ID without using CommercialService
   */
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
        party_name: invoice.parties?.name || 'Unknown',
        items: items || []
      };
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
        invoice.party_id,
        invoice.total_amount,
        true // isDebit=true for sales (customer's debt increases)
      );
      
      // Update inventory
      if (invoice.items) {
        for (const item of invoice.items) {
          // Get the current item from the database
          const itemResult = await supabase
            .from(item.item_type)
            .select('quantity')
            .eq('id', item.item_id)
            .single();
            
          if (itemResult.error) {
            console.error('Error fetching item:', itemResult.error);
            toast.error('حدث خطأ أثناء تحديث المخزون');
            return false;
          }
          
          const currentQuantity = itemResult.data.quantity || 0;
          const newQuantity = Math.max(0, currentQuantity - item.quantity);
          
          // Update the item quantity
          const { error } = await supabase
            .from(item.item_type)
            .update({ quantity: newQuantity })
            .eq('id', item.item_id);
            
          if (error) {
            console.error('Error updating inventory:', error);
            toast.error('حدث خطأ أثناء تحديث المخزون');
            return false;
          }
        }
      }

      // Update invoice status
      const { error: statusError } = await supabase
        .from('invoices')
        .update({
          payment_status: 'confirmed'
        })
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
        invoice.party_id,
        invoice.total_amount,
        false // isDebit=false to reverse the sale (customer's debt decreases)
      );
      
      // Update inventory
      if (invoice.items) {
        for (const item of invoice.items) {
          // Get the current item from the database
          const itemResult = await supabase
            .from(item.item_type)
            .select('quantity')
            .eq('id', item.item_id)
            .single();
            
          if (itemResult.error) {
            console.error('Error fetching item:', itemResult.error);
            toast.error('حدث خطأ أثناء تحديث المخزون');
            return false;
          }
          
          const currentQuantity = itemResult.data.quantity || 0;
          const newQuantity = currentQuantity + item.quantity;
          
          // Update the item quantity
          const { error } = await supabase
            .from(item.item_type)
            .update({ quantity: newQuantity })
            .eq('id', item.item_id);
            
          if (error) {
            console.error('Error updating inventory:', error);
            toast.error('حدث خطأ أثناء تحديث المخزون');
            return false;
          }
        }
      }

      // Update invoice status
      const { error: statusError } = await supabase
        .from('invoices')
        .update({
          payment_status: 'cancelled'
        })
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
        invoice.party_id,
        invoice.total_amount,
        false // isDebit=false for purchases (our debt to supplier increases)
      );
      
      // Update inventory
      if (invoice.items) {
        for (const item of invoice.items) {
          // Get the current item from the database
          const itemResult = await supabase
            .from(item.item_type)
            .select('quantity')
            .eq('id', item.item_id)
            .single();
            
          if (itemResult.error) {
            console.error('Error fetching item:', itemResult.error);
            toast.error('حدث خطأ أثناء تحديث المخزون');
            return false;
          }
          
          const currentQuantity = itemResult.data.quantity || 0;
          const newQuantity = currentQuantity + item.quantity;
          
          // Update the item quantity
          const { error } = await supabase
            .from(item.item_type)
            .update({ quantity: newQuantity })
            .eq('id', item.item_id);
            
          if (error) {
            console.error('Error updating inventory:', error);
            toast.error('حدث خطأ أثناء تحديث المخزون');
            return false;
          }
        }
      }

      // Update invoice status
      const { error: statusError } = await supabase
        .from('invoices')
        .update({
          payment_status: 'confirmed'
        })
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
        invoice.party_id,
        invoice.total_amount,
        true // isDebit=true to reverse the purchase (our debt to supplier decreases)
      );
      
      // Update inventory
      if (invoice.items) {
        for (const item of invoice.items) {
          // Get the current item from the database
          const itemResult = await supabase
            .from(item.item_type)
            .select('quantity')
            .eq('id', item.item_id)
            .single();
            
          if (itemResult.error) {
            console.error('Error fetching item:', itemResult.error);
            toast.error('حدث خطأ أثناء تحديث المخزون');
            return false;
          }
          
          const currentQuantity = itemResult.data.quantity || 0;
          const newQuantity = Math.max(0, currentQuantity - item.quantity);
          
          // Update the item quantity
          const { error } = await supabase
            .from(item.item_type)
            .update({ quantity: newQuantity })
            .eq('id', item.item_id);
            
          if (error) {
            console.error('Error updating inventory:', error);
            toast.error('حدث خطأ أثناء تحديث المخزون');
            return false;
          }
        }
      }

      // Update invoice status
      const { error: statusError } = await supabase
        .from('invoices')
        .update({
          payment_status: 'cancelled'
        })
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

  /**
   * Combined method to confirm an invoice of any type
   */
  async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('invoice_type')
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      
      if (invoice.invoice_type === 'sale') {
        return await this.confirmSaleInvoice(invoiceId);
      } else if (invoice.invoice_type === 'purchase') {
        return await this.confirmPurchaseInvoice(invoiceId);
      } else {
        toast.error('نوع الفاتورة غير معروف');
        return false;
      }
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }

  /**
   * Combined method to cancel an invoice of any type
   */
  async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('invoice_type')
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      
      if (invoice.invoice_type === 'sale') {
        return await this.cancelSaleInvoice(invoiceId);
      } else if (invoice.invoice_type === 'purchase') {
        return await this.cancelPurchaseInvoice(invoiceId);
      } else {
        toast.error('نوع الفاتورة غير معروف');
        return false;
      }
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
      return false;
    }
  }

  /**
   * Update invoice status after payment
   */
  async updateInvoiceStatusAfterPayment(invoiceId: string, amount: number): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found:', invoiceId);
        return false;
      }
      
      let status = 'unpaid';
      if (amount >= invoice.total_amount) {
        status = 'paid';
      } else if (amount > 0) {
        status = 'partial';
      }
      
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status
        })
        .eq('id', invoiceId);
        
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error updating invoice status after payment:', error);
      return false;
    }
  }

  /**
   * Reverse invoice status after payment cancellation
   */
  async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string): Promise<boolean> {
    try {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'unpaid'
        })
        .eq('id', invoiceId);
        
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error reversing invoice status after payment cancellation:', error);
      return false;
    }
  }
}
