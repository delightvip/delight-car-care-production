
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
   * تحديث عنصر في المخزون
   */
  private async updateInventoryItem(
    itemType: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
    itemId: number,
    quantity: number
  ): Promise<boolean> {
    return this.inventoryService.updateItemQuantity(itemType, itemId, quantity, "invoice");
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
              invoice_items (*),
              parties (name)
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
              notes: `فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'} رقم ${invoiceId}`,
              description: `فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'}`
            });
          }
          
          // 5. إذا كانت الفاتورة نقدية، سجل معاملة مالية وتحديث الخزينة
          if (invoice.status === 'paid') {
            await this.financeIntegration.recordInvoicePayment(
              invoiceId,
              invoice.invoice_type === 'sale' ? 'sale' : 'purchase',
              invoice.total_amount,
              'cash', // يمكن إضافة حقل طريقة الدفع في الفاتورة مستقبلاً
              invoice.date,
              invoice.parties?.name
            );
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
              invoice_items (*),
              parties (name)
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
            
            await this.financeIntegration.recordLedgerEntry({
              party_id: invoice.party_id,
              transaction_id: invoiceId,
              transaction_type: `cancel_${invoice.invoice_type}`,
              date: new Date().toISOString().split('T')[0],
              debit,
              credit,
              notes: `إلغاء فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'} رقم ${invoiceId}`,
              description: `إلغاء فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'}`
            });
          }
          
          // 5. إذا كانت الفاتورة نقدية، إلغاء المعاملة المالية وتحديث الخزينة
          if (invoice.status === 'paid') {
            const currentDate = new Date().toISOString().split('T')[0];
            // عكس تأثير المعاملة على الخزينة/النظام المالي
            await this.financeIntegration.recordInvoicePayment(
              invoiceId,
              invoice.invoice_type === 'sale' ? 'purchase' : 'sale', // عكس نوع الفاتورة
              invoice.total_amount,
              'cash',
              currentDate,
              invoice.parties?.name
            );
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
        
        // 2. Update invoice status based on payment
        let newStatus = invoice.status;
        
        if (paymentAmount >= invoice.total_amount) {
          newStatus = 'paid';
        } else if (paymentAmount > 0) {
          newStatus = 'partially_paid';
        }
        
        // 3. Update the invoice status
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: newStatus })
          .eq('id', invoiceId);
        
        if (updateError) throw updateError;
      },
      "updateInvoiceStatusAfterPayment",
      "حدث خطأ أثناء تحديث حالة الفاتورة بعد الدفع"
    );
  }
  
  /**
   * عكس تأثير الدفعة على حالة الفاتورة
   * @param invoiceId معرف الفاتورة
   * @param paymentAmount مبلغ الدفعة
   */
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    return ErrorHandler.wrapOperation(
      async () => {
        // 1. Get invoice data including remaining payments
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            *,
            payments!payments_related_invoice_id_fkey (
              amount,
              payment_status
            )
          `)
          .eq('id', invoiceId)
          .single();
        
        if (invoiceError) throw invoiceError;
        
        // 2. Calculate total confirmed payments excluding the cancelled payment
        const remainingPayments = (invoice.payments || [])
          .filter(p => p.payment_status === 'confirmed')
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        // 3. Update invoice status based on remaining payments
        let newStatus = 'confirmed';
        
        if (remainingPayments >= invoice.total_amount) {
          newStatus = 'paid';
        } else if (remainingPayments > 0) {
          newStatus = 'partially_paid';
        }
        
        // 4. Update the invoice status
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: newStatus })
          .eq('id', invoiceId);
        
        if (updateError) throw updateError;
      },
      "reverseInvoiceStatusAfterPaymentCancellation",
      "حدث خطأ أثناء تحديث حالة الفاتورة بعد إلغاء الدفع"
    );
  }
}
