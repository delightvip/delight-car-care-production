
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Return, 
  ReturnItem, 
  LedgerEntry 
} from "./CommercialTypes";

// استيراد الخدمات المعاد هيكلتها
import InvoiceService from './commercial/invoice/InvoiceService';
import PaymentService from './commercial/payment/PaymentService';
import ReturnService from './commercial/return/ReturnService';
import LedgerService from './commercial/ledger/LedgerService';
import { format } from "date-fns";

class CommercialService {
  private static instance: CommercialService;
  private invoiceService: InvoiceService;
  private paymentService: PaymentService;
  private returnService: ReturnService;
  private ledgerService: LedgerService;
  
  private constructor() {
    this.invoiceService = InvoiceService.getInstance();
    this.paymentService = PaymentService.getInstance();
    this.returnService = ReturnService.getInstance();
    this.ledgerService = LedgerService.getInstance();
  }
  
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }
  
  // Invoice methods
  public async getInvoices(): Promise<Invoice[]> {
    try {
      return await this.invoiceService.getInvoices();
    } catch (error) {
      console.error('Error in getInvoices:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }
  
  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    try {
      return await this.invoiceService.getInvoicesByParty(partyId);
    } catch (error) {
      console.error(`Error in getInvoicesByParty(${partyId}):`, error);
      toast.error('حدث خطأ أثناء جلب فواتير الطرف');
      return [];
    }
  }
  
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      return await this.invoiceService.getInvoiceById(id);
    } catch (error) {
      console.error(`Error in getInvoiceById(${id}):`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الفاتورة');
      return null;
    }
  }
  
  public async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      const invoice = await this.invoiceService.createInvoice(invoiceData);
      
      if (!invoice) {
        console.error('Failed to create invoice');
        return null;
      }
      
      return invoice;
    } catch (error) {
      console.error('Error in createInvoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      return null;
    }
  }
  
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      // استخدام وعد يتم حله بعد تأكيد الفاتورة
      // هذا يسمح بتنفيذ العملية بشكل غير متزامن
      const confirmPromise = new Promise<boolean>((resolve) => {
        // استخدام setTimeout لتنفيذ عملية التأكيد في الخلفية
        // وتجنب تجمد واجهة المستخدم
        setTimeout(async () => {
          try {
            const result = await this.invoiceService.confirmInvoice(invoiceId);
            resolve(result);
          } catch (error) {
            console.error(`Error in confirmInvoice timeout(${invoiceId}):`, error);
            resolve(false);
          }
        }, 100);
      });
      
      return confirmPromise;
    } catch (error) {
      console.error(`Error in confirmInvoice(${invoiceId}):`, error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }
  
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      // استخدام وعد يتم حله بعد إلغاء الفاتورة
      // هذا يسمح بتنفيذ العملية بشكل غير متزامن
      const cancelPromise = new Promise<boolean>((resolve) => {
        // استخدام setTimeout لتنفيذ عملية الإلغاء في الخلفية
        // وتجنب تجمد واجهة المستخدم
        setTimeout(async () => {
          try {
            const result = await this.invoiceService.cancelInvoice(invoiceId);
            resolve(result);
          } catch (error) {
            console.error(`Error in cancelInvoice timeout(${invoiceId}):`, error);
            resolve(false);
          }
        }, 100);
      });
      
      return cancelPromise;
    } catch (error) {
      console.error(`Error in cancelInvoice(${invoiceId}):`, error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
      return false;
    }
  }
  
  public async deleteInvoice(id: string): Promise<boolean> {
    try {
      return await this.invoiceService.deleteInvoice(id);
    } catch (error) {
      console.error(`Error in deleteInvoice(${id}):`, error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
      return false;
    }
  }
  
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      return await this.invoiceService.updateInvoiceStatusAfterPayment(invoiceId, paymentAmount);
    } catch (error) {
      console.error(`Error in updateInvoiceStatusAfterPayment(${invoiceId}, ${paymentAmount}):`, error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة بعد الدفع');
    }
  }
  
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      return await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(invoiceId, paymentAmount);
    } catch (error) {
      console.error(`Error in reverseInvoiceStatusAfterPaymentCancellation(${invoiceId}, ${paymentAmount}):`, error);
      toast.error('حدث خطأ أثناء عكس حالة الفاتورة بعد إلغاء الدفع');
    }
  }
  
  // Payment methods
  public async getPayments(): Promise<Payment[]> {
    try {
      return await this.paymentService.getPayments();
    } catch (error) {
      console.error('Error in getPayments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      return await this.paymentService.getPaymentsByParty(partyId);
    } catch (error) {
      console.error(`Error in getPaymentsByParty(${partyId}):`, error);
      toast.error('حدث خطأ أثناء جلب مدفوعات الطرف');
      return [];
    }
  }
  
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      return await this.paymentService.recordPayment(paymentData);
    } catch (error) {
      console.error('Error in recordPayment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
      return null;
    }
  }
  
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      // استخدام وعد يتم حله بعد تأكيد الدفعة
      // هذا يسمح بتنفيذ العملية بشكل غير متزامن
      const confirmPromise = new Promise<boolean>((resolve) => {
        // استخدام setTimeout لتنفيذ عملية التأكيد في الخلفية
        // وتجنب تجمد واجهة المستخدم
        setTimeout(async () => {
          try {
            const result = await this.paymentService.confirmPayment(paymentId);
            resolve(result);
          } catch (error) {
            console.error(`Error in confirmPayment timeout(${paymentId}):`, error);
            resolve(false);
          }
        }, 100);
      });
      
      return confirmPromise;
    } catch (error) {
      console.error(`Error in confirmPayment(${paymentId}):`, error);
      toast.error('حدث خطأ أثناء تأكيد الدفعة');
      return false;
    }
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      // استخدام وعد يتم حله بعد إلغاء الدفعة
      // هذا يسمح بتنفيذ العملية بشكل غير متزامن
      const cancelPromise = new Promise<boolean>((resolve) => {
        // استخدام setTimeout لتنفيذ عملية الإلغاء في الخلفية
        // وتجنب تجمد واجهة المستخدم
        setTimeout(async () => {
          try {
            const result = await this.paymentService.cancelPayment(paymentId);
            resolve(result);
          } catch (error) {
            console.error(`Error in cancelPayment timeout(${paymentId}):`, error);
            resolve(false);
          }
        }, 100);
      });
      
      return cancelPromise;
    } catch (error) {
      console.error(`Error in cancelPayment(${paymentId}):`, error);
      toast.error('حدث خطأ أثناء إلغاء الدفعة');
      return false;
    }
  }
  
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    try {
      return await this.paymentService.updatePayment(id, paymentData);
    } catch (error) {
      console.error(`Error in updatePayment(${id}):`, error);
      toast.error('حدث خطأ أثناء تحديث الدفعة');
      return false;
    }
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    try {
      return await this.paymentService.deletePayment(id);
    } catch (error) {
      console.error(`Error in deletePayment(${id}):`, error);
      toast.error('حدث خطأ أثناء حذف الدفعة');
      return false;
    }
  }
  
  // Return methods
  public async getReturns(): Promise<Return[]> {
    try {
      return await this.returnService.getReturns();
    } catch (error) {
      console.error('Error in getReturns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      return await this.returnService.getReturnById(id);
    } catch (error) {
      console.error(`Error in getReturnById(${id}):`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجع');
      return null;
    }
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      return await this.returnService.createReturn(returnData);
    } catch (error) {
      console.error('Error in createReturn:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }
  
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      return await this.returnService.updateReturn(id, returnData);
    } catch (error) {
      console.error(`Error in updateReturn(${id}):`, error);
      toast.error('حدث خطأ أثناء تحديث المرتجع');
      return false;
    }
  }
  
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      return await this.returnService.confirmReturn(returnId);
    } catch (error) {
      console.error(`Error in confirmReturn(${returnId}):`, error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      return await this.returnService.cancelReturn(returnId);
    } catch (error) {
      console.error(`Error in cancelReturn(${returnId}):`, error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
  
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      return await this.returnService.deleteReturn(id);
    } catch (error) {
      console.error(`Error in deleteReturn(${id}):`, error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
      return false;
    }
  }
  
  // Ledger methods
  public async getLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
    try {
      return await this.ledgerService.getLedgerEntries(partyId, startDate, endDate);
    } catch (error) {
      console.error(`Error in getLedgerEntries(${partyId}):`, error);
      toast.error('حدث خطأ أثناء جلب سجلات الحساب');
      return [];
    }
  }
  
  public async generateAccountStatement(startDate: string, endDate: string, partyType?: string): Promise<any> {
    try {
      return await this.ledgerService.generateAccountStatement(startDate, endDate, partyType);
    } catch (error) {
      console.error(`Error in generateAccountStatement(${startDate}, ${endDate}, ${partyType}):`, error);
      toast.error('حدث خطأ أثناء إنشاء كشف الحساب');
      return null;
    }
  }
}

// Re-export the CommercialTypes so they can be imported from this module as well
export type { 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Return, 
  ReturnItem, 
  LedgerEntry 
};

export default CommercialService;
