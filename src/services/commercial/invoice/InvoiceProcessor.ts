
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryService from "@/services/InventoryService";
import InventoryPricingService from "@/services/inventory/InventoryPricingService";
import PartyService from "@/services/PartyService";

export class InvoiceProcessor {
  private inventoryService: InventoryService;
  private pricingService: InventoryPricingService;
  private partyService: PartyService;

  constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.pricingService = InventoryPricingService.getInstance();
    this.partyService = PartyService.getInstance();
  }

  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      // جلب بيانات الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) {
        console.error('Error fetching invoice:', invoiceError);
        toast.error('حدث خطأ أثناء جلب بيانات الفاتورة');
        return false;
      }
      
      if (invoice.payment_status === 'confirmed') {
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      // معالجة المخزون
      const success = await this.processInventory(invoice);
      
      if (!success) {
        toast.error('حدث خطأ أثناء معالجة المخزون');
        return false;
      }
      
      // تحديث حساب الطرف المقابل (العميل/المورد)
      if (invoice.party_id) {
        const isCredit = invoice.invoice_type === 'sale';
        
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          isCredit, // sale => مدين، purchase => دائن
          isCredit ? 'فاتورة مبيعات' : 'فاتورة مشتريات',
          isCredit ? 'invoice_sale' : 'invoice_purchase',
          invoiceId
        );
      }
      
      // إذا كانت حالة الفاتورة "مدفوعة"، قم بتحديث حساب العميل مرة أخرى
      if (invoice.status === 'paid') {
        await this.handlePaidInvoice(invoice);
      }
      
      // تحديث حالة الفاتورة إلى مؤكدة
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (updateError) {
        console.error('Error updating invoice status:', updateError);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
        return false;
      }
      
      toast.success('تم تأكيد الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }

  /**
   * معالجة الفاتورة المدفوعة - تحديث حساب العميل
   */
  private async handlePaidInvoice(invoice: any): Promise<boolean> {
    try {
      if (!invoice.party_id) return true;
      
      const isCredit = invoice.invoice_type === 'purchase'; // عكس حالة الفاتورة
      
      await this.partyService.updatePartyBalance(
        invoice.party_id,
        invoice.total_amount,
        isCredit, // purchase => استلام دفعة (دائن)، sale => تسديد دفعة (مدين)
        isCredit ? 'تسديد فاتورة مشتريات' : 'استلام دفعة فاتورة مبيعات',
        isCredit ? 'payment_for_purchase' : 'payment_for_sale',
        invoice.id
      );
      
      return true;
    } catch (error) {
      console.error('Error handling paid invoice:', error);
      return false;
    }
  }

  private async processInventory(invoice: any): Promise<boolean> {
    try {
      // عند البيع: تقليل المخزون
      if (invoice.invoice_type === 'sale') {
        for (const item of invoice.items) {
          await this.reduceInventory(item);
        }
      } 
      // عند الشراء: زيادة المخزون وتحديث متوسط التكلفة
      else if (invoice.invoice_type === 'purchase') {
        for (const item of invoice.items) {
          await this.increaseInventory(item);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error processing inventory:', error);
      return false;
    }
  }

  private async reduceInventory(item: any): Promise<boolean> {
    const itemType = item.item_type;
    const itemId = item.item_id;
    const quantity = item.quantity;
    
    switch (itemType) {
      case 'raw_materials':
        return this.inventoryService.updateRawMaterial(itemId, { 
          quantity: supabase.rpc('coalesce_numeric', { col: 'quantity' }) - quantity 
        });
      
      case 'packaging_materials':
        return this.inventoryService.updatePackagingMaterial(itemId, { 
          quantity: supabase.rpc('coalesce_numeric', { col: 'quantity' }) - quantity 
        });
      
      case 'semi_finished_products':
        return this.inventoryService.updateSemiFinishedProduct(itemId, { 
          quantity: supabase.rpc('coalesce_numeric', { col: 'quantity' }) - quantity 
        });
      
      case 'finished_products':
        return this.inventoryService.updateFinishedProduct(itemId, { 
          quantity: supabase.rpc('coalesce_numeric', { col: 'quantity' }) - quantity 
        });
      
      default:
        console.warn(`Unknown item type: ${itemType}`);
        return false;
    }
  }

  private async increaseInventory(item: any): Promise<boolean> {
    const itemType = item.item_type;
    const itemId = item.item_id;
    const quantity = item.quantity;
    const unitPrice = item.unit_price;
    
    // زيادة الكمية في المخزون
    const updateQuantityResult = await this.updateInventoryQuantity(itemType, itemId, quantity);
    
    // تحديث متوسط تكلفة المخزون
    const updateCostResult = await this.updateInventoryCost(itemType, itemId, quantity, unitPrice);
    
    return updateQuantityResult && updateCostResult;
  }
  
  private async updateInventoryQuantity(
    itemType: string, 
    itemId: number, 
    quantity: number
  ): Promise<boolean> {
    switch (itemType) {
      case 'raw_materials':
        return this.inventoryService.updateRawMaterial(itemId, { 
          quantity: supabase.rpc('coalesce_numeric', { col: 'quantity' }) + quantity 
        });
      
      case 'packaging_materials':
        return this.inventoryService.updatePackagingMaterial(itemId, { 
          quantity: supabase.rpc('coalesce_numeric', { col: 'quantity' }) + quantity 
        });
      
      case 'semi_finished_products':
        return this.inventoryService.updateSemiFinishedProduct(itemId, { 
          quantity: supabase.rpc('coalesce_numeric', { col: 'quantity' }) + quantity 
        });
      
      case 'finished_products':
        return this.inventoryService.updateFinishedProduct(itemId, { 
          quantity: supabase.rpc('coalesce_numeric', { col: 'quantity' }) + quantity 
        });
      
      default:
        console.warn(`Unknown item type: ${itemType}`);
        return false;
    }
  }
  
  private async updateInventoryCost(
    itemType: string, 
    itemId: number, 
    quantity: number,
    unitPrice: number
  ): Promise<boolean> {
    switch (itemType) {
      case 'raw_materials':
        return this.pricingService.updateRawMaterialCost(itemId, quantity, unitPrice);
      
      case 'packaging_materials':
        return this.pricingService.updatePackagingMaterialCost(itemId, quantity, unitPrice);
      
      case 'semi_finished_products':
        return this.pricingService.updateSemiFinishedProductCost(itemId, quantity, unitPrice);
      
      case 'finished_products':
        return this.pricingService.updateFinishedProductCost(itemId, quantity, unitPrice);
      
      default:
        console.warn(`Unknown item type: ${itemType}`);
        return false;
    }
  }

  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      // جلب بيانات الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) {
        console.error('Error fetching invoice:', invoiceError);
        toast.error('حدث خطأ أثناء جلب بيانات الفاتورة');
        return false;
      }
      
      if (invoice.payment_status !== 'confirmed') {
        toast.info('لا يمكن إلغاء الفاتورة لأنها غير مؤكدة');
        return false;
      }
      
      // عكس تأثير المخزون
      const success = await this.reverseInventory(invoice);
      
      if (!success) {
        toast.error('حدث خطأ أثناء إلغاء تأثير المخزون');
        return false;
      }
      
      // عكس تأثير حساب الطرف المقابل
      if (invoice.party_id) {
        const isCredit = invoice.invoice_type === 'purchase'; // عكس التأثير
        
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          isCredit, // sale => دائن (عكس)، purchase => مدين (عكس)
          isCredit ? 'إلغاء فاتورة مبيعات' : 'إلغاء فاتورة مشتريات',
          isCredit ? 'cancel_invoice_sale' : 'cancel_invoice_purchase',
          invoiceId
        );
        
        // إذا كانت الفاتورة مدفوعة، عكس تأثير الدفع أيضاً
        if (invoice.status === 'paid') {
          const isPaymentCredit = invoice.invoice_type === 'sale'; // عكس تأثير الدفع
          
          await this.partyService.updatePartyBalance(
            invoice.party_id,
            invoice.total_amount,
            isPaymentCredit, // sale => مدين (عكس)، purchase => دائن (عكس)
            isPaymentCredit ? 'إلغاء دفعة فاتورة مبيعات' : 'إلغاء دفعة فاتورة مشتريات',
            isPaymentCredit ? 'cancel_payment_for_sale' : 'cancel_payment_for_purchase',
            invoiceId
          );
        }
      }
      
      // تحديث حالة الفاتورة إلى ملغاة
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ payment_status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (updateError) {
        console.error('Error updating invoice status:', updateError);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
        return false;
      }
      
      toast.success('تم إلغاء الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
      return false;
    }
  }

  private async reverseInventory(invoice: any): Promise<boolean> {
    try {
      // عكس تأثير البيع: زيادة المخزون
      if (invoice.invoice_type === 'sale') {
        for (const item of invoice.items) {
          await this.updateInventoryQuantity(
            item.item_type,
            item.item_id,
            item.quantity
          );
        }
      } 
      // عكس تأثير الشراء: تقليل المخزون
      else if (invoice.invoice_type === 'purchase') {
        for (const item of invoice.items) {
          await this.reduceInventory(item);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error reversing inventory:', error);
      return false;
    }
  }

  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      // جلب بيانات الفاتورة
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('id, total_amount, status, party_id, invoice_type')
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      
      // تحديد حالة الدفع الجديدة
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      // حساب المدفوع سابقاً - تقدير
      const previouslyPaid = invoice.status === 'paid' 
        ? invoice.total_amount 
        : invoice.status === 'partial' ? invoice.total_amount * 0.5 : 0;
      
      // إجمالي المدفوع
      const totalPaid = previouslyPaid + paymentAmount;
      
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }
      
      // تحديث حالة الفاتورة
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (updateError) throw updateError;
      
      // إذا كانت الفاتورة مؤكدة وتم تحديثها إلى "مدفوعة"، قم بتحديث حساب العميل
      if (invoice.party_id && invoice.status !== 'paid' && newStatus === 'paid') {
        const isCredit = invoice.invoice_type === 'purchase'; // عكس حالة الفاتورة
        
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          isCredit, // purchase => استلام دفعة (دائن)، sale => تسديد دفعة (مدين)
          isCredit ? 'تسديد فاتورة مشتريات' : 'استلام دفعة فاتورة مبيعات',
          isCredit ? 'payment_for_purchase' : 'payment_for_sale',
          invoice.id
        );
      }
    } catch (error) {
      console.error('Error updating invoice status after payment:', error);
    }
  }

  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      // جلب بيانات الفاتورة
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('id, total_amount, status, party_id, invoice_type')
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      
      // تحديد حالة الدفع الجديدة
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      // حساب المدفوع سابقاً - تقدير
      const previouslyPaid = invoice.status === 'paid' 
        ? invoice.total_amount 
        : invoice.status === 'partial' ? invoice.total_amount * 0.5 : 0;
      
      // إجمالي المدفوع بعد الإلغاء
      const remainingPaid = Math.max(0, previouslyPaid - paymentAmount);
      
      if (remainingPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (remainingPaid > 0) {
        newStatus = 'partial';
      }
      
      // تحديث حالة الفاتورة
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (updateError) throw updateError;
      
      // إذا كانت الفاتورة مدفوعة وتم تغييرها، قم بعكس تأثير الدفع على حساب العميل
      if (invoice.party_id && invoice.status === 'paid' && newStatus !== 'paid') {
        const isCredit = invoice.invoice_type === 'sale'; // عكس تأثير الدفع
        
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          paymentAmount,
          isCredit, // عكس التأثير السابق
          isCredit ? 'إلغاء دفعة فاتورة مبيعات' : 'إلغاء دفعة فاتورة مشتريات',
          isCredit ? 'cancel_payment_for_sale' : 'cancel_payment_for_purchase',
          invoice.id
        );
      }
    } catch (error) {
      console.error('Error reversing invoice status after payment cancellation:', error);
    }
  }
}
