import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Return, 
  ReturnItem, 
  LedgerEntry 
} from "./CommercialTypes";

// Import other service classes
import InvoiceService from './commercial/invoice/InvoiceService';
import PaymentService from './commercial/payment/PaymentService';
import LedgerService from './commercial/ledger/LedgerService';
import ReturnService from './commercial/return/ReturnService';
import { format } from "date-fns";

class CommercialService {
  private static instance: CommercialService;
  private invoiceService: InvoiceService;
  private paymentService: PaymentService;
  private ledgerService: LedgerService;
  private returnService: ReturnService;
  
  private constructor() {
    this.invoiceService = InvoiceService.getInstance();
    this.paymentService = PaymentService.getInstance();
    this.ledgerService = LedgerService.getInstance();
    this.returnService = ReturnService.getInstance();
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
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب الفواتير",
        variant: "destructive"
      });
      return [];
    }
  }
  
  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    try {
      return await this.invoiceService.getInvoicesByParty(partyId);
    } catch (error) {
      console.error(`Error in getInvoicesByParty(${partyId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب فواتير الطرف",
        variant: "destructive"
      });
      return [];
    }
  }
  
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      return await this.invoiceService.getInvoiceById(id);
    } catch (error) {
      console.error(`Error in getInvoiceById(${id}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب بيانات الفاتورة",
        variant: "destructive"
      });
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
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء الفاتورة",
        variant: "destructive"
      });
      return null;
    }
  }
  
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      const confirmPromise = new Promise<boolean>((resolve) => {
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
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد الفاتورة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      const cancelPromise = new Promise<boolean>((resolve) => {
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
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء الفاتورة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async deleteInvoice(id: string): Promise<boolean> {
    try {
      return await this.invoiceService.deleteInvoice(id);
    } catch (error) {
      console.error(`Error in deleteInvoice(${id}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الفاتورة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      return await this.invoiceService.updateInvoiceStatusAfterPayment(invoiceId, paymentAmount);
    } catch (error) {
      console.error(`Error in updateInvoiceStatusAfterPayment(${invoiceId}, ${paymentAmount}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة الفاتورة بعد الدفع",
        variant: "destructive"
      });
    }
  }
  
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      return await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(invoiceId, paymentAmount);
    } catch (error) {
      console.error(`Error in reverseInvoiceStatusAfterPaymentCancellation(${invoiceId}, ${paymentAmount}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء عكس حالة الفاتورة بعد إلغاء الدفع",
        variant: "destructive"
      });
    }
  }
  
  // Payment methods
  public async getPayments(): Promise<Payment[]> {
    try {
      return await this.paymentService.getPayments();
    } catch (error) {
      console.error('Error in getPayments:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب المدفوعات",
        variant: "destructive"
      });
      return [];
    }
  }
  
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      return await this.paymentService.getPaymentsByParty(partyId);
    } catch (error) {
      console.error(`Error in getPaymentsByParty(${partyId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب مدفوعات الطرف",
        variant: "destructive"
      });
      return [];
    }
  }
  
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      return await this.paymentService.recordPayment(paymentData);
    } catch (error) {
      console.error('Error in recordPayment:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الدفعة",
        variant: "destructive"
      });
      return null;
    }
  }
  
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      const confirmPromise = new Promise<boolean>((resolve) => {
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
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد الدفعة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const cancelPromise = new Promise<boolean>((resolve) => {
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
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء الدفعة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    try {
      return await this.paymentService.updatePayment(id, paymentData);
    } catch (error) {
      console.error(`Error in updatePayment(${id}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الدفعة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    try {
      return await this.paymentService.deletePayment(id);
    } catch (error) {
      console.error(`Error in deletePayment(${id}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الدفعة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  // Return methods
  public async getReturns(): Promise<Return[]> {
    try {
      return await this.returnService.getReturns();
    } catch (error) {
      console.error('Error in getReturns:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب المرتجعات",
        variant: "destructive"
      });
      return [];
    }
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      return await this.returnService.getReturnById(id);
    } catch (error) {
      console.error(`Error in getReturnById(${id}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب بيانات المرتجع",
        variant: "destructive"
      });
      return null;
    }
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      return await this.returnService.createReturn(returnData);
    } catch (error) {
      console.error('Error in createReturn:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء المرتجع",
        variant: "destructive"
      });
      return null;
    }
  }
  
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      const confirmPromise = new Promise<boolean>((resolve) => {
        setTimeout(async () => {
          try {
            const result = await this.returnService.confirmReturn(returnId);
            resolve(result);
          } catch (error) {
            console.error(`Error in confirmReturn timeout(${returnId}):`, error);
            resolve(false);
          }
        }, 100);
      });
      
      return confirmPromise;
    } catch (error) {
      console.error(`Error in confirmReturn(${returnId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد المرتجع",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      const cancelPromise = new Promise<boolean>((resolve) => {
        setTimeout(async () => {
          try {
            const result = await this.returnService.cancelReturn(returnId);
            resolve(result);
          } catch (error) {
            console.error(`Error in cancelReturn timeout(${returnId}):`, error);
            resolve(false);
          }
        }, 100);
      });
      
      return cancelPromise;
    } catch (error) {
      console.error(`Error in cancelReturn(${returnId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء المرتجع",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async deleteReturn(returnId: string): Promise<boolean> {
    try {
      return await this.returnService.deleteReturn(returnId);
    } catch (error) {
      console.error(`Error in deleteReturn(${returnId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المرتجع",
        variant: "destructive"
      });
      return false;
    }
  }
  
  // Ledger methods
  public async getLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
    try {
      return await this.ledgerService.getLedgerEntries(partyId, startDate, endDate);
    } catch (error) {
      console.error(`Error in getLedgerEntries(${partyId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب سجلات الحساب",
        variant: "destructive"
      });
      return [];
    }
  }
  
  public async generateAccountStatement(startDate: string, endDate: string, partyType?: string): Promise<any> {
    try {
      return await this.ledgerService.generateAccountStatement(startDate, endDate, partyType);
    } catch (error) {
      console.error(`Error in generateAccountStatement(${startDate}, ${endDate}, ${partyType}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء كشف الحساب",
        variant: "destructive"
      });
      return null;
    }
  }
}

export default CommercialService;
