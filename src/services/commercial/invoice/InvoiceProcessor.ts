
import { supabase } from "@/integrations/supabase/client";
import { Invoice } from '@/services/CommercialTypes';
import { toast } from "sonner";
import PartyService from '../../PartyService';
import InventoryService from '../../InventoryService';
import { InvoiceEntity } from './InvoiceEntity';

// خدمة تُعنى بمعالجة الفواتير
export class InvoiceProcessor {
  private partyService = PartyService.getInstance();
  private inventoryService = InventoryService.getInstance();

  // تأكيد فاتورة
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      console.log('Confirming invoice:', invoiceId);
      
      const invoiceData = await InvoiceEntity.fetchById(invoiceId);
      if (!invoiceData) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoiceData.payment_status === 'confirmed') {
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      // Update inventory based on invoice type
      if (invoiceData.invoice_type === 'sale') {
        console.log("نوع الفاتورة: بيع - تحديث المخزون");
        // Decrease inventory for sales invoices
        for (const item of invoiceData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for sales invoices
        if (invoiceData.party_id) {
          console.log("تحديث رصيد العميل:", invoiceData.party_id);
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            true, // debit for sales (increase customer's debt)
            'فاتورة مبيعات',
            'sale_invoice',
            invoiceData.id
          );
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        console.log("نوع الفاتورة: شراء - تحديث المخزون");
        // Increase inventory for purchase invoices
        for (const item of invoiceData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for purchase invoices
        if (invoiceData.party_id) {
          console.log("تحديث رصيد المورد:", invoiceData.party_id);
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            false, // credit for purchases (increase our debt)
            'فاتورة مشتريات',
            'purchase_invoice',
            invoiceData.id
          );
        }
      }
      
      // Update invoice status to confirmed
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      console.log('Invoice confirmed successfully');
      
      toast.success('تم تأكيد الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }
  
  // إلغاء فاتورة
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoiceData = await InvoiceEntity.fetchById(invoiceId);
      if (!invoiceData) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoiceData.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء الفواتير المؤكدة فقط');
        return false;
      }
      
      // Update inventory based on invoice type
      if (invoiceData.invoice_type === 'sale') {
        // Increase inventory for cancelled sales invoices
        for (const item of invoiceData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled sales invoices
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            false, // credit for cancelled sales (reduce customer's debt)
            'إلغاء فاتورة مبيعات',
            'cancel_sale_invoice',
            invoiceData.id
          );
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        // Decrease inventory for cancelled purchase invoices
        for (const item of invoiceData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled purchase invoices
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            true, // debit for cancelled purchases (reduce our debt)
            'إلغاء فاتورة مشتريات',
            'cancel_purchase_invoice',
            invoiceData.id
          );
        }
      }
      
      // Update invoice status to cancelled
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast.success('تم إلغاء الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
      return false;
    }
  }
  
  // تحديث حالة الفاتورة بعد الدفع
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await InvoiceEntity.fetchById(invoiceId);
      
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return;
      }
      
      const remainingAmount = invoice.total_amount - paymentAmount;
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partial';
      }
      
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (error) {
        console.error('Error updating invoice status:', error);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
      } else {
        console.log(`تم تحديث حالة الفاتورة ${invoiceId} إلى ${newStatus}`);
        toast.success('تم تحديث حالة الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  }
  
  // عكس تحديث حالة الفاتورة بعد إلغاء الدفعة
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await InvoiceEntity.fetchById(invoiceId);
      
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return;
      }
      
      // Get all payments for this invoice
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_status')
        .eq('related_invoice_id', invoiceId)
        .eq('payment_status', 'confirmed');
        
      if (paymentsError) {
        console.error('Error fetching payments for invoice:', paymentsError);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
        return;
      }
      
      // Calculate total confirmed payments
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }
      
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (error) {
        console.error('Error updating invoice status:', error);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
      } else {
        console.log(`تم تحديث حالة الفاتورة ${invoiceId} إلى ${newStatus} بعد إلغاء الدفعة`);
        toast.success('تم تحديث حالة الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  }
}
