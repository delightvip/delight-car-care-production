
import { LedgerEntry } from '@/services/commercial/CommercialTypes';
import { LedgerEntity } from './LedgerEntity';
import { LedgerReportGenerator } from './LedgerReportGenerator';
import { toast } from "sonner";

// خدمة سجل الحساب الرئيسية
export class LedgerService {
  private static instance: LedgerService;
  
  private constructor() {}
  
  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }
  
  public async getLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
    return LedgerEntity.fetchLedgerEntries(partyId, startDate, endDate);
  }
  
  public async generateAccountStatement(startDate: string, endDate: string, partyType?: string): Promise<any> {
    return LedgerReportGenerator.generateAccountStatement(startDate, endDate, partyType);
  }
  
  public async generateSinglePartyStatement(partyId: string, startDate: string, endDate: string): Promise<any> {
    return LedgerReportGenerator.generateSinglePartyStatement(partyId, startDate, endDate);
  }
  
  public async exportLedgerToCSV(partyId: string, startDate?: string, endDate?: string): Promise<string> {
    return LedgerReportGenerator.exportLedgerToCSV(partyId, startDate, endDate);
  }
  
  // Adding these methods for PaymentProcessor
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const { data: invoice, error } = await this.supabase
        .from('invoices')
        .select('total_amount')
        .eq('id', invoiceId)
        .single();
      
      if (error) {
        console.error('Error fetching invoice:', error);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
        return;
      }
      
      const remainingAmount = invoice.total_amount - paymentAmount;
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partial';
      }
      
      const { error: updateError } = await this.supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (updateError) {
        console.error('Error updating invoice status:', updateError);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
      }
    } catch (error) {
      console.error('Error updating invoice status after payment:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  }
  
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const { data: invoice, error } = await this.supabase
        .from('invoices')
        .select('total_amount')
        .eq('id', invoiceId)
        .single();
      
      if (error) {
        console.error('Error fetching invoice:', error);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
        return;
      }
      
      const remainingAmount = invoice.total_amount + paymentAmount; // We add instead of subtract for cancellation
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partial';
      }
      
      const { error: updateError } = await this.supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (updateError) {
        console.error('Error updating invoice status:', updateError);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
      }
    } catch (error) {
      console.error('Error reversing invoice status after payment cancellation:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  }
  
  private get supabase() {
    return import('@/integrations/supabase/client').then(({ supabase }) => supabase);
  }
}

export default LedgerService;
