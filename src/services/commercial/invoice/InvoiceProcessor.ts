import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/services/CommercialTypes";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { toast } from "@/hooks/use-toast";
import FinancialService from "@/services/financial/FinancialService";
import { format } from "date-fns";

export class InvoiceProcessor {
  private partyService: PartyService;
  private inventoryService: InventoryService;
  
  constructor() {
    this.partyService = PartyService.getInstance();
    this.inventoryService = InventoryService.getInstance();
  }

  /**
   * تأكيد الفاتورة وتحديث المخزون والحسابات ذات الصلة
   */
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      // التحقق من حالة الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*)
        `)
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      if (invoice.payment_status === 'confirmed') {
        toast({
          title: "تنبيه",
          description: "الفاتورة مؤكدة بالفعل",
          variant: "default"
        });
        return true;
      }
      
      // تحديث المخزون بناءً على نوع الفاتورة
      if (invoice.invoice_type === 'sale') {
        // تحديث المخزون للبيع (خصم من المخزون)
        for (const item of invoice.invoice_items) {
          await this.inventoryService.updateInventoryLevel(
            item.item_id.toString(),
            item.item_type,
            -item.quantity,
            `بيع - فاتورة ${invoiceId}`,
            'sale'
          );
        }
        
        // تحديث رصيد العميل
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          true, // debit (زيادة مديونية العميل)
          `فاتورة بيع`,
          'sale_invoice',
          invoiceId
        );
        
        // تسجيل الإيرادات في النظام المالي (بيع بالائتمان)
        await this.financialService.recordCommercialTransaction(
          'income',
          invoice.total_amount,
          'other', // كمعاملة ائتمانية
          invoiceId,
          'sale_invoice',
          format(new Date(invoice.date), 'yyyy-MM-dd'),
          `فاتورة بيع`
        );
        
        // حساب تكلفة البضاعة المباعة لتتبع الأرباح
        let totalCost = 0;
        for (const item of invoice.invoice_items) {
          if (item.item_type === 'finished_products') {
            const { data: product } = await supabase
              .from('finished_products')
              .select('unit_cost')
              .eq('id', item.item_id)
              .single();
              
            if (product) {
              const itemCost = product.unit_cost * item.quantity;
              totalCost += itemCost;
            }
          }
        }
        
        // تسجيل تكلفة البضاعة المباعة
        if (totalCost > 0) {
          await this.financialService.recordCommercialTransaction(
            'expense',
            totalCost,
            'other',
            invoiceId,
            'cost_of_goods_sold',
            format(new Date(invoice.date), 'yyyy-MM-dd'),
            `تكلفة بضاعة مباعة - فاتورة ${invoiceId}`
          );
        }
        
      } else if (invoice.invoice_type === 'purchase') {
        // تحديث المخزون للشراء (إضافة للمخزون)
        for (const item of invoice.invoice_items) {
          await this.inventoryService.updateInventoryLevel(
            item.item_id.toString(),
            item.item_type,
            item.quantity,
            `شراء - فاتورة ${invoiceId}`,
            'purchase'
          );
        }
        
        // تحديث رصيد المورد
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          false, // credit (زيادة ما نحن مدينون به للمورد)
          `فاتورة شراء`,
          'purchase_invoice',
          invoiceId
        );
        
        // تسجيل المشتريات في النظام المالي (شراء بالائتمان)
        await this.financialService.recordCommercialTransaction(
          'expense',
          invoice.total_amount,
          'other', // كمعاملة ائتمانية
          invoiceId,
          'purchase_invoice',
          format(new Date(invoice.date), 'yyyy-MM-dd'),
          `فاتورة شراء`
        );
      }
      
      // تحديث حالة الفاتورة إلى "مؤكدة"
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (updateError) throw updateError;
      
      // استخدام setTimeout لتجنب تعليق واجهة المستخدم
      setTimeout(() => {
        toast({
          title: "نجاح",
          description: "تم تأكيد الفاتورة بنجاح",
          variant: "success"
        });
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد الفاتورة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  /**
   * إلغاء الفاتورة وعكس تغييرات المخزون والحسابات ذات الصلة
   */
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      // التحقق من حالة الفاتورة
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
        toast({
          title: "خطأ",
          description: "يمكن إلغاء الفواتير المؤكدة فقط",
          variant: "destructive"
        });
        return false;
      }
      
      // عكس تغييرات المخزون
      if (invoice.invoice_type === 'sale') {
        // إعادة المنتجات إلى المخزون
        for (const item of invoice.invoice_items) {
          await this.inventoryService.updateInventoryLevel(
            item.item_id.toString(),
            item.item_type,
            item.quantity, // إضافة الكمية مرة أخرى
            `إلغاء بيع - فاتورة ${invoiceId}`,
            'sale_cancel'
          );
        }
        
        // عكس تحديث رصيد العميل
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          false, // credit (خفض مديونية العميل)
          `إلغاء فاتورة بيع`,
          'sale_invoice_cancel',
          invoiceId
        );
        
        // تسجيل إلغاء الإيرادات في النظام المالي
        await this.financialService.recordCommercialTransaction(
          'expense', // عكس الإيراد
          invoice.total_amount,
          'other',
          invoiceId,
          'sale_invoice_cancel',
          format(new Date(), 'yyyy-MM-dd'),
          `إلغاء فاتورة بيع`
        );
        
        // عكس تكلفة البضاعة المباعة
        let totalCost = 0;
        for (const item of invoice.invoice_items) {
          if (item.item_type === 'finished_products') {
            const { data: product } = await supabase
              .from('finished_products')
              .select('unit_cost')
              .eq('id', item.item_id)
              .single();
              
            if (product) {
              const itemCost = product.unit_cost * item.quantity;
              totalCost += itemCost;
            }
          }
        }
        
        // تسجيل عكس تكلفة البضاعة المباعة
        if (totalCost > 0) {
          await this.financialService.recordCommercialTransaction(
            'income', // عكس المصروف
            totalCost,
            'other',
            invoiceId,
            'cost_of_goods_sold_cancel',
            format(new Date(), 'yyyy-MM-dd'),
            `إلغاء تكلفة بضاعة مباعة - فاتورة ${invoiceId}`
          );
        }
        
      } else if (invoice.invoice_type === 'purchase') {
        // خصم المنتجات من المخزون
        for (const item of invoice.invoice_items) {
          await this.inventoryService.updateInventoryLevel(
            item.item_id.toString(),
            item.item_type,
            -item.quantity, // خصم الكمية مرة أخرى
            `إلغاء شراء - فاتورة ${invoiceId}`,
            'purchase_cancel'
          );
        }
        
        // عكس تحديث رصيد المورد
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          true, // debit (خفض ما نحن مدينون به للمورد)
          `إلغاء فاتورة شراء`,
          'purchase_invoice_cancel',
          invoiceId
        );
        
        // تسجيل إلغاء المشتريات في النظام المالي
        await this.financialService.recordCommercialTransaction(
          'income', // عكس المصروف
          invoice.total_amount,
          'other',
          invoiceId,
          'purchase_invoice_cancel',
          format(new Date(), 'yyyy-MM-dd'),
          `إلغاء فاتورة شراء`
        );
      }
      
      // تحديث حالة الفاتورة إلى "ملغاة"
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ payment_status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (updateError) throw updateError;
      
      toast({
        title: "نجاح",
        description: "تم إلغاء الفاتورة بنجاح",
        variant: "success"
      });
      
      return true;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء الفاتورة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  /**
   * تحديث حالة الفاتورة بعد الدفع
   */
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // تحديث حالة الفاتورة استنادًا إلى المبلغ المدفوع والمبلغ الإجمالي
      let newStatus: string;
      
      if (paymentAmount >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partially_paid';
      } else {
        newStatus = 'unpaid';
      }
      
      await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
    } catch (error) {
      console.error('Error updating invoice status after payment:', error);
    }
  }
  
  /**
   * عكس تحديث حالة الفاتورة بعد إلغاء الدفع
   */
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      // للتبسيط، نقوم بإعادة الحالة إلى "غير مدفوعة"
      // في نظام حقيقي، سيكون عليك تتبع جميع المدفوعات وإعادة حساب الحالة
      await supabase
        .from('invoices')
        .update({ status: 'unpaid' })
        .eq('id', invoiceId);
      
    } catch (error) {
      console.error('Error reversing invoice status after payment cancellation:', error);
    }
  }
}
