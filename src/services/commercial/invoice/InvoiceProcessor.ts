import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/services/CommercialTypes";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { InvoiceEntity } from "./InvoiceEntity";
import { toast } from "sonner";

export class InvoiceProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;

  constructor() {
    // استخدام getInstance للوصول إلى الخدمات
    this.inventoryService = InventoryService.getInstance();
    this.partyService = PartyService.getInstance();
  }

  /**
   * تأكيد فاتورة وتحديث المخزون والسجلات المالية
   */
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoiceData = await InvoiceEntity.fetchById(invoiceId);
      if (!invoiceData) {
        console.error('Invoice not found');
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoiceData.payment_status === 'confirmed') {
        console.log('Invoice already confirmed');
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      // تحديث المخزون بناءً على نوع الفاتورة
      if (invoiceData.invoice_type === 'sale') {
        // خفض المخزون لفواتير المبيعات
        for (const item of invoiceData.items || []) {
          let currentItem = null;
          let currentQuantity = 0;
          
          // الحصول على الكمية الحالية في المخزون
          switch (item.item_type) {
            case 'raw_materials':
              const { data: rawMaterial } = await supabase
                .from('raw_materials')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = rawMaterial;
              currentQuantity = rawMaterial?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية المادة ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوبة (${item.quantity})`);
                console.error(`Not enough quantity for ${item.item_name}. Current: ${currentQuantity}, Required: ${item.quantity}`);
                return false;
              }
              await this.inventoryService.updateRawMaterial(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'packaging_materials':
              const { data: packagingMaterial } = await supabase
                .from('packaging_materials')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = packagingMaterial;
              currentQuantity = packagingMaterial?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية مادة التعبئة ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوبة (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updatePackagingMaterial(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'semi_finished_products':
              const { data: semiFinished } = await supabase
                .from('semi_finished_products')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = semiFinished;
              currentQuantity = semiFinished?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية المنتج نصف المصنع ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوبة (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'finished_products':
              const { data: finishedProduct } = await supabase
                .from('finished_products')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = finishedProduct;
              currentQuantity = finishedProduct?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية المنتج النهائي ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوبة (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateFinishedProduct(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
          }
        }
        
        // تحديث السجلات المالية لفواتير المبيعات
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            true, // مدين للمبيعات (زيادة دين العميل)
            'فاتورة مبيعات',
            'sale_invoice',
            invoiceData.id
          );
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        // زيادة المخزون لفواتير المشتريات
        for (const item of invoiceData.items || []) {
          let currentItem = null;
          let currentQuantity = 0;
          let currentUnitCost = 0;
          let newQuantity = 0;
          let newUnitCost = 0;
          
          // الحصول على الكمية الحالية في المخزون
          switch (item.item_type) {
            case 'raw_materials':
              const { data: rawMaterial } = await supabase
                .from('raw_materials')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = rawMaterial;
              currentQuantity = rawMaterial?.quantity || 0;
              currentUnitCost = rawMaterial?.unit_cost || 0;
              
              // حساب متوسط التكلفة الموزون
              newQuantity = currentQuantity + Number(item.quantity);
              newUnitCost = this.calculateWeightedAverage(
                currentQuantity, currentUnitCost,
                Number(item.quantity), Number(item.unit_price)
              );
              
              await this.inventoryService.updateRawMaterial(item.item_id, { 
                quantity: newQuantity,
                unit_cost: newUnitCost
              });
              break;
            case 'packaging_materials':
              const { data: packagingMaterial } = await supabase
                .from('packaging_materials')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = packagingMaterial;
              currentQuantity = packagingMaterial?.quantity || 0;
              currentUnitCost = packagingMaterial?.unit_cost || 0;
              
              // حساب متوسط التكلفة الموزون
              newQuantity = currentQuantity + Number(item.quantity);
              newUnitCost = this.calculateWeightedAverage(
                currentQuantity, currentUnitCost,
                Number(item.quantity), Number(item.unit_price)
              );
              
              await this.inventoryService.updatePackagingMaterial(item.item_id, { 
                quantity: newQuantity,
                unit_cost: newUnitCost
              });
              break;
            case 'semi_finished_products':
              const { data: semiFinished } = await supabase
                .from('semi_finished_products')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = semiFinished;
              currentQuantity = semiFinished?.quantity || 0;
              currentUnitCost = semiFinished?.unit_cost || 0;
              
              // حساب متوسط التكلفة الموزون
              newQuantity = currentQuantity + Number(item.quantity);
              newUnitCost = this.calculateWeightedAverage(
                currentQuantity, currentUnitCost,
                Number(item.quantity), Number(item.unit_price)
              );
              
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
                quantity: newQuantity,
                unit_cost: newUnitCost
              });
              break;
            case 'finished_products':
              const { data: finishedProduct } = await supabase
                .from('finished_products')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = finishedProduct;
              currentQuantity = finishedProduct?.quantity || 0;
              currentUnitCost = finishedProduct?.unit_cost || 0;
              
              // حساب متوسط التكلفة الموزون
              newQuantity = currentQuantity + Number(item.quantity);
              newUnitCost = this.calculateWeightedAverage(
                currentQuantity, currentUnitCost,
                Number(item.quantity), Number(item.unit_price)
              );
              
              await this.inventoryService.updateFinishedProduct(item.item_id, { 
                quantity: newQuantity,
                unit_cost: newUnitCost
              });
              break;
          }
        }
        
        // تحديث السجلات المالية لفواتير المشتريات
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            false, // دائن للمشتريات (زيادة ديننا)
            'فاتورة مشتريات',
            'purchase_invoice',
            invoiceData.id
          );
        }
      }
      
      // تحديث حالة الفاتورة إلى مؤكدة
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast.success('تم تأكيد الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }
  
  /**
   * إلغاء فاتورة، عكس التغييرات في المخزون والتغييرات المالية
   */
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
      
      // تحديث المخزون بناءً على نوع الفاتورة
      if (invoiceData.invoice_type === 'sale') {
        // زيادة المخزون لفواتير المبيعات الملغاة
        for (const item of invoiceData.items || []) {
          let currentItem = null;
          let currentQuantity = 0;
          
          // الحصول على الكمية الحالية في المخزون
          switch (item.item_type) {
            case 'raw_materials':
              const { data: rawMaterial } = await supabase
                .from('raw_materials')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = rawMaterial;
              currentQuantity = rawMaterial?.quantity || 0;
              await this.inventoryService.updateRawMaterial(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
            case 'packaging_materials':
              const { data: packagingMaterial } = await supabase
                .from('packaging_materials')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = packagingMaterial;
              currentQuantity = packagingMaterial?.quantity || 0;
              await this.inventoryService.updatePackagingMaterial(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
            case 'semi_finished_products':
              const { data: semiFinished } = await supabase
                .from('semi_finished_products')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = semiFinished;
              currentQuantity = semiFinished?.quantity || 0;
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
            case 'finished_products':
              const { data: finishedProduct } = await supabase
                .from('finished_products')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = finishedProduct;
              currentQuantity = finishedProduct?.quantity || 0;
              await this.inventoryService.updateFinishedProduct(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
          }
        }
        
        // تحديث السجلات المالية لفواتير المبيعات الملغاة
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            false, // دائن لإلغاء المبيعات (تقليل دين العميل)
            'إلغاء فاتورة مبيعات',
            'cancel_sale_invoice',
            invoiceData.id
          );
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        // خفض المخزون لفواتير المشتريات الملغاة
        for (const item of invoiceData.items || []) {
          let currentItem = null;
          let currentQuantity = 0;
          
          // الحصول على الكمية الحالية في المخزون
          switch (item.item_type) {
            case 'raw_materials':
              const { data: rawMaterial } = await supabase
                .from('raw_materials')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = rawMaterial;
              currentQuantity = rawMaterial?.quantity || 0;
              // التأكد من أن الإلغاء لن يؤدي إلى كمية سالبة
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`لا يمكن إلغاء فاتورة المشتريات لأن كمية ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إلغاءها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateRawMaterial(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'packaging_materials':
              const { data: packagingMaterial } = await supabase
                .from('packaging_materials')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = packagingMaterial;
              currentQuantity = packagingMaterial?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`لا يمكن إلغاء فاتورة المشتريات لأن كمية مادة التعبئة ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إلغاءها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updatePackagingMaterial(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'semi_finished_products':
              const { data: semiFinished } = await supabase
                .from('semi_finished_products')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = semiFinished;
              currentQuantity = semiFinished?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`لا يمكن إلغاء فاتورة المشتريات لأن كمية المنتج نصف المصنع ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إلغاءها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'finished_products':
              const { data: finishedProduct } = await supabase
                .from('finished_products')
                .select('*')
                .eq('id', item.item_id)
                .single();
              
              currentItem = finishedProduct;
              currentQuantity = finishedProduct?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`لا يمكن إلغاء فاتورة المشتريات لأن كمية المنتج النهائي ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إلغاءها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateFinishedProduct(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
          }
        }
        
        // تحديث السجلات المالية لفواتير المشتريات الملغاة
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            true, // مدين لإلغاء المشتريات (تقليل ديننا)
            'إلغاء فاتورة مشتريات',
            'cancel_purchase_invoice',
            invoiceData.id
          );
        }
      }
      
      // تحديث حالة الفاتورة إلى ملغاة
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
  
  /**
   * تحديث حالة الفاتورة بعد الدفع
   */
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await InvoiceEntity.fetchById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found');
        return;
      }
      
      const remainingAmount = invoice.total_amount - paymentAmount;
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partial';
      }
      
      await InvoiceEntity.update(invoiceId, { status: newStatus });
    } catch (error) {
      console.error('Error updating invoice status:', error);
    }
  }
  
  /**
   * عكس حالة الفاتورة بعد إلغاء الدفع
   */
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await InvoiceEntity.fetchById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found');
        return;
      }
      
      // الحصول على جميع المدفوعات المؤكدة لهذه الفاتورة
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('related_invoice_id', invoiceId)
        .eq('payment_status', 'confirmed');
      
      if (error) throw error;
      
      // حساب إجمالي المبلغ المدفوع باستثناء الدفعة الملغاة
      const totalPaid = payments
        ? payments.reduce((sum, payment) => sum + Number(payment.amount), 0) - paymentAmount
        : 0;
      
      // تحديد الحالة الجديدة
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }
      
      await InvoiceEntity.update(invoiceId, { status: newStatus });
    } catch (error) {
      console.error('Error reversing invoice status:', error);
    }
  }
  
  private calculateWeightedAverage(
    currentQuantity: number,
    currentUnitCost: number,
    newQuantity: number,
    newUnitCost: number
  ): number {
    const totalCost = (currentQuantity * currentUnitCost) + (newQuantity * newUnitCost);
    const totalQuantity = currentQuantity + newQuantity;
    return totalCost / totalQuantity;
  }
}
