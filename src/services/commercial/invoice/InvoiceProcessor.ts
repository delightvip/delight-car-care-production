
import { Invoice } from '@/services/CommercialTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OperationLocks, runAsyncOperation } from '@/utils/asyncUtils';
import { ErrorHandler } from '@/utils/errorHandler';
import InventoryService from '@/services/InventoryService';
import LedgerService from '../ledger/LedgerService';
import { CommercialFinanceIntegration } from '@/services/integrations/CommercialFinanceIntegration';

/**
 * معالج الفواتير
 * مسؤول عن تأكيد وإلغاء وتحديث الفواتير
 */
export class InvoiceProcessor {
  private inventoryService: InventoryService;
  private ledgerService: LedgerService;
  private financeIntegration: CommercialFinanceIntegration;
  
  constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.ledgerService = LedgerService.getInstance();
    this.financeIntegration = CommercialFinanceIntegration.getInstance();
  }
  
  /**
   * تأكيد فاتورة
   * @param invoiceId معرف الفاتورة
   */
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    return OperationLocks.runWithLock(`confirm-invoice-${invoiceId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          // 1. Get invoice data
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
              *,
              invoice_items (*)
            `)
            .eq('id', invoiceId)
            .single();
            
          if (invoiceError) throw invoiceError;
          
          if (invoice.payment_status !== 'draft') {
            toast.error('لا يمكن تأكيد فاتورة تم تأكيدها أو إلغاؤها من قبل');
            return false;
          }
          
          // 2. Update inventory based on invoice type
          for (const item of invoice.invoice_items) {
            let quantity = 0;
            
            if (invoice.invoice_type === 'sale') {
              // Sales: decrease inventory
              quantity = -item.quantity;
            } else {
              // Purchase: increase inventory
              quantity = item.quantity;
            }
            
            await this.updateInventoryItem(
              item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products", 
              item.item_id, 
              quantity
            );
          }
          
          // 3. Update invoice status
          const { error: updateError } = await supabase
            .from('invoices')
            .update({ payment_status: 'confirmed' })
            .eq('id', invoiceId);
            
          if (updateError) throw updateError;
          
          // 4. Add ledger entry if party exists
          if (invoice.party_id) {
            let debit = 0;
            let credit = 0;
            
            if (invoice.invoice_type === 'sale') {
              // Sales: party owes us
              debit = invoice.total_amount;
              credit = 0;
            } else {
              // Purchase: we owe party
              debit = 0;
              credit = invoice.total_amount;
            }
            
            await this.financeIntegration.recordLedgerEntry({
              party_id: invoice.party_id,
              transaction_id: invoiceId,
              transaction_type: invoice.invoice_type,
              date: invoice.date,
              debit,
              credit,
              notes: `فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'} رقم ${invoiceId}`
            });
          }
          
          // 5. إذا كانت الفاتورة نقدية، سجل معاملة مالية وتحديث الخزينة
          if (invoice.status === 'paid') {
            const categoryId = invoice.invoice_type === 'sale' 
              ? "5f5b3ce0-1e87-4654-afef-c9cab5d59ef4" // معرف فئة المبيعات
              : "f8dcea05-c2e8-4bef-8ca4-a73473e23e34"; // معرف فئة المشتريات
              
            await this.financeIntegration.recordFinancialTransaction({
              type: invoice.invoice_type === 'sale' ? 'income' : 'expense',
              amount: invoice.total_amount,
              payment_method: 'cash', // يمكن إضافة حقل طريقة الدفع في الفاتورة مستقبلاً
              category_id: categoryId,
              reference_id: invoiceId,
              reference_type: invoice.invoice_type,
              date: invoice.date,
              notes: `فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'} نقدية رقم ${invoiceId}`
            });
          }
          
          toast.success(`تم تأكيد الفاتورة بنجاح`);
          return true;
        } catch (error) {
          ErrorHandler.handleError(error, "confirmInvoice", "حدث خطأ أثناء تأكيد الفاتورة");
          return false;
        }
      });
    });
  }
  
  /**
   * إلغاء فاتورة
   * @param invoiceId معرف الفاتورة
   */
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    return OperationLocks.runWithLock(`cancel-invoice-${invoiceId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          // 1. Get invoice data
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
              *,
              invoice_items (*)
            `)
            .eq('id', invoiceId)
            .single();
            
          if (invoiceError) throw invoiceError;
          
          if (invoice.payment_status !== 'confirmed') {
            toast.error('لا يمكن إلغاء فاتورة غير مؤكدة أو تم إلغاؤها من قبل');
            return false;
          }
          
          // 2. Reverse inventory updates
          for (const item of invoice.invoice_items) {
            let quantity = 0;
            
            if (invoice.invoice_type === 'sale') {
              // Reverse Sales: increase inventory
              quantity = item.quantity;
            } else {
              // Reverse Purchase: decrease inventory
              quantity = -item.quantity;
            }
            
            await this.updateInventoryItem(
              item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products", 
              item.item_id, 
              quantity
            );
          }
          
          // 3. Update invoice status
          const { error: updateError } = await supabase
            .from('invoices')
            .update({ payment_status: 'cancelled' })
            .eq('id', invoiceId);
            
          if (updateError) throw updateError;
          
          // 4. Add reverse ledger entry if party exists
          if (invoice.party_id) {
            let debit = 0;
            let credit = 0;
            
            if (invoice.invoice_type === 'sale') {
              // Reverse Sales: we owe party
              debit = 0;
              credit = invoice.total_amount;
            } else {
              // Reverse Purchase: party owes us
              debit = invoice.total_amount;
              credit = 0;
            }
            
            await this.ledgerService.addLedgerEntry({
              party_id: invoice.party_id,
              transaction_id: invoiceId,
              transaction_type: `cancel_${invoice.invoice_type}`,
              date: new Date().toISOString().split('T')[0],
              debit,
              credit,
              notes: `إلغاء فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'} رقم ${invoiceId}`
            });
          }
          
          // 5. إذا كانت الفاتورة نقدية، إلغاء المعاملة المالية وتحديث الخزينة
          if (invoice.status === 'paid') {
            // عكس تأثير المعاملة على الخزينة
            await this.financeIntegration.updateBalance(
              invoice.invoice_type === 'sale' ? -invoice.total_amount : invoice.total_amount,
              'cash' // يمكن إضافة حقل طريقة الدفع في الفاتورة مستقبلاً
            );
            
            // يمكن إضافة منطق لإلغاء المعاملة المالية المرتبطة بالفاتورة
          }
          
          toast.success(`تم إلغاء الفاتورة بنجاح`);
          return true;
        } catch (error) {
          ErrorHandler.handleError(error, "cancelInvoice", "حدث خطأ أثناء إلغاء الفاتورة");
          return false;
        }
      });
    });
  }
  
  /**
   * تحديث حالة الفاتورة بعد إجراء دفعة
   * @param invoiceId معرف الفاتورة
   * @param paymentAmount مبلغ الدفعة
   */
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    return ErrorHandler.wrapOperation(
      async () => {
        // 1. Get invoice data
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();
          
        if (invoiceError) throw invoiceError;
        
        // 2. Get all payments for this invoice
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('related_invoice_id', invoiceId)
          .eq('payment_status', 'confirmed');
          
        if (paymentsError) throw paymentsError;
        
        // 3. Calculate total paid amount
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0) + paymentAmount;
        
        // 4. Determine new status
        let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        
        if (totalPaid >= invoice.total_amount) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          newStatus = 'partial';
        }
        
        // 5. Update invoice status
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: newStatus })
          .eq('id', invoiceId);
          
        if (updateError) throw updateError;
      },
      "updateInvoiceStatusAfterPayment",
      "حدث خطأ أثناء تحديث حالة الفاتورة بعد الدفع",
      undefined
    ) as Promise<void>;
  }
  
  /**
   * عكس تحديث حالة الفاتورة بعد إلغاء دفعة
   * @param invoiceId معرف الفاتورة
   * @param paymentAmount مبلغ الدفعة
   */
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    return ErrorHandler.wrapOperation(
      async () => {
        // 1. Get invoice data
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();
          
        if (invoiceError) throw invoiceError;
        
        // 2. Get all payments for this invoice
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('related_invoice_id', invoiceId)
          .eq('payment_status', 'confirmed');
          
        if (paymentsError) throw paymentsError;
        
        // 3. Calculate total paid amount
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0) - paymentAmount;
        
        // 4. Determine new status
        let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        
        if (totalPaid >= invoice.total_amount) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          newStatus = 'partial';
        }
        
        // 5. Update invoice status
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: newStatus })
          .eq('id', invoiceId);
          
        if (updateError) throw updateError;
      },
      "reverseInvoiceStatusAfterPaymentCancellation",
      "حدث خطأ أثناء عكس حالة الفاتورة بعد إلغاء الدفع",
      undefined
    ) as Promise<void>;
  }
  
  /**
   * تحديث عنصر المخزون
   * @param itemType نوع العنصر
   * @param itemId معرف العنصر
   * @param quantity الكمية (موجبة للإضافة، سالبة للخصم)
   */
  private async updateInventoryItem(
    itemType: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
    itemId: number,
    quantity: number
  ): Promise<void> {
    try {
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
