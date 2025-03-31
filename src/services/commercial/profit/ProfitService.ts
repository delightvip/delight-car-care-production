
import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceItem } from '@/services/CommercialTypes';
import { toast } from "sonner";
import { format } from 'date-fns';
import BaseCommercialService from '../BaseCommercialService';

export interface ProfitData {
  id: string;
  invoice_id: string;
  invoice_date: string;
  party_id: string;
  party_name: string;
  total_sales: number;
  total_cost: number;
  profit_amount: number;
  profit_percentage: number;
  created_at?: string;
}

export interface ProfitSummary {
  total_sales: number;
  total_cost: number;
  total_profit: number;
  average_profit_percentage: number;
  invoice_count: number;
}

export interface ProfitFilter {
  startDate?: string;
  endDate?: string;
  partyId?: string;
  minProfit?: string;
  maxProfit?: string;
  sortBy?: 'date' | 'profit_amount' | 'profit_percentage';
  sortOrder?: 'asc' | 'desc';
}

class ProfitService extends BaseCommercialService {
  private static instance: ProfitService;
  
  private constructor() {
    super();
  }
  
  public static getInstance(): ProfitService {
    if (!ProfitService.instance) {
      ProfitService.instance = new ProfitService();
    }
    return ProfitService.instance;
  }
  
  /**
   * Calculate profit for a specific invoice
   */
  public async calculateInvoiceProfit(invoiceId: string): Promise<ProfitData | null> {
    try {
      // Get invoice details
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('invoices')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Make sure this is a sales invoice
      if (invoice.invoice_type !== 'sale' || invoice.payment_status !== 'confirmed') {
        return null;
      }
      
      // Get invoice items
      const { data: items, error: itemsError } = await this.supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);
      
      if (itemsError) throw itemsError;
      
      if (!items || items.length === 0) {
        return null;
      }
      
      // Calculate total cost of items
      let totalCost = 0;
      
      for (const item of items) {
        const itemCost = await this.getItemCost(item.item_id, item.item_type);
        totalCost += itemCost * item.quantity;
      }
      
      const totalSales = invoice.total_amount;
      const profitAmount = totalSales - totalCost;
      const profitPercentage = totalSales > 0 ? (profitAmount / totalSales) * 100 : 0;
      
      // Check if profit record already exists
      const { data: existingProfit, error: existingError } = await this.supabase
        .from('profits')
        .select('*')
        .eq('invoice_id', invoiceId)
        .maybeSingle();
      
      let profitData: ProfitData;
      
      if (existingProfit) {
        // Update existing profit record
        const { data, error } = await this.supabase
          .from('profits')
          .update({
            total_sales: totalSales,
            total_cost: totalCost,
            profit_amount: profitAmount,
            profit_percentage: profitPercentage
          })
          .eq('id', existingProfit.id)
          .select()
          .single();
        
        if (error) throw error;
        
        profitData = {
          id: data.id,
          invoice_id: data.invoice_id,
          invoice_date: data.invoice_date,
          party_id: data.party_id,
          party_name: invoice.parties?.name || '',
          total_sales: data.total_sales,
          total_cost: data.total_cost,
          profit_amount: data.profit_amount,
          profit_percentage: data.profit_percentage,
          created_at: data.created_at
        };
      } else {
        // Create new profit record
        const { data, error } = await this.supabase
          .from('profits')
          .insert({
            invoice_id: invoiceId,
            invoice_date: invoice.date,
            party_id: invoice.party_id,
            total_sales: totalSales,
            total_cost: totalCost,
            profit_amount: profitAmount,
            profit_percentage: profitPercentage
          })
          .select()
          .single();
        
        if (error) throw error;
        
        profitData = {
          id: data.id,
          invoice_id: data.invoice_id,
          invoice_date: data.invoice_date,
          party_id: data.party_id,
          party_name: invoice.parties?.name || '',
          total_sales: data.total_sales,
          total_cost: data.total_cost,
          profit_amount: data.profit_amount,
          profit_percentage: data.profit_percentage,
          created_at: data.created_at
        };
      }
      
      return profitData;
    } catch (error) {
      console.error('Error calculating invoice profit:', error);
      toast.error('حدث خطأ أثناء حساب الأرباح');
      return null;
    }
  }
  
  /**
   * Get profit data with filtering options
   */
  public async getProfits(filters?: ProfitFilter): Promise<ProfitData[]> {
    try {
      let query = this.supabase
        .from('profits')
        .select(`
          *,
          parties (name)
        `);
      
      if (filters) {
        if (filters.startDate) {
          query = query.gte('invoice_date', filters.startDate);
        }
        
        if (filters.endDate) {
          query = query.lte('invoice_date', filters.endDate);
        }
        
        if (filters.partyId) {
          query = query.eq('party_id', filters.partyId);
        }
        
        if (filters.minProfit) {
          const min = parseFloat(filters.minProfit);
          if (!isNaN(min)) {
            query = query.gte('profit_amount', min);
          }
        }
        
        if (filters.maxProfit) {
          const max = parseFloat(filters.maxProfit);
          if (!isNaN(max)) {
            query = query.lte('profit_amount', max);
          }
        }
        
        // Handle sorting
        if (filters.sortBy) {
          const order = filters.sortOrder || 'desc';
          query = query.order(filters.sortBy, { ascending: order === 'asc' });
        } else {
          query = query.order('invoice_date', { ascending: false });
        }
      } else {
        query = query.order('invoice_date', { ascending: false });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map(profit => ({
        id: profit.id,
        invoice_id: profit.invoice_id,
        invoice_date: profit.invoice_date,
        party_id: profit.party_id,
        party_name: profit.parties?.name || '',
        total_sales: profit.total_sales,
        total_cost: profit.total_cost,
        profit_amount: profit.profit_amount,
        profit_percentage: profit.profit_percentage,
        created_at: profit.created_at
      }));
    } catch (error) {
      console.error('Error fetching profits:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الأرباح');
      return [];
    }
  }
  
  /**
   * Get profit summary
   */
  public async getProfitSummary(startDate?: string, endDate?: string, partyId?: string): Promise<ProfitSummary> {
    try {
      let query = this.supabase
        .from('profits')
        .select('*');
      
      if (startDate) {
        query = query.gte('invoice_date', startDate);
      }
      
      if (endDate) {
        query = query.lte('invoice_date', endDate);
      }
      
      if (partyId) {
        query = query.eq('party_id', partyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calculate summary
      let totalSales = 0;
      let totalCost = 0;
      let totalProfit = 0;
      
      data.forEach(profit => {
        totalSales += profit.total_sales;
        totalCost += profit.total_cost;
        totalProfit += profit.profit_amount;
      });
      
      const averageProfitPercentage = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
      
      return {
        total_sales: totalSales,
        total_cost: totalCost,
        total_profit: totalProfit,
        average_profit_percentage: averageProfitPercentage,
        invoice_count: data.length
      };
    } catch (error) {
      console.error('Error calculating profit summary:', error);
      toast.error('حدث خطأ أثناء حساب ملخص الأرباح');
      return {
        total_sales: 0,
        total_cost: 0,
        total_profit: 0,
        average_profit_percentage: 0,
        invoice_count: 0
      };
    }
  }
  
  /**
   * Remove profit data for an invoice (when invoice is deleted/cancelled)
   */
  public async removeProfitData(invoiceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('profits')
        .delete()
        .eq('invoice_id', invoiceId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error removing profit data:', error);
      toast.error('حدث خطأ أثناء حذف بيانات الأرباح');
      return false;
    }
  }
  
  /**
   * Recalculate profits for all sales invoices
   */
  public async recalculateAllProfits(): Promise<boolean> {
    try {
      // Get all confirmed sales invoices
      const { data: invoices, error } = await this.supabase
        .from('invoices')
        .select('id')
        .eq('invoice_type', 'sale')
        .eq('payment_status', 'confirmed');
      
      if (error) throw error;
      
      // Process each invoice
      let successCount = 0;
      for (const invoice of invoices) {
        const result = await this.calculateInvoiceProfit(invoice.id);
        if (result) successCount++;
      }
      
      toast.success(`تم إعادة حساب الأرباح بنجاح لعدد ${successCount} من الفواتير`);
      return true;
    } catch (error) {
      console.error('Error recalculating all profits:', error);
      toast.error('حدث خطأ أثناء إعادة حساب الأرباح');
      return false;
    }
  }
  
  /**
   * Get the cost of an item based on its type and ID
   */
  private async getItemCost(itemId: number, itemType: string): Promise<number> {
    try {
      let table: string;
      
      switch (itemType) {
        case 'raw_materials':
          table = 'raw_materials';
          break;
        case 'packaging_materials':
          table = 'packaging_materials';
          break;
        case 'semi_finished_products':
          table = 'semi_finished_products';
          break;
        case 'finished_products':
          table = 'finished_products';
          break;
        default:
          return 0;
      }
      
      const { data, error } = await this.supabase
        .from(table)
        .select('unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error) {
        console.error(`Error fetching cost for item ${itemId} from ${table}:`, error);
        return 0;
      }
      
      return data?.unit_cost || 0;
    } catch (error) {
      console.error('Error getting item cost:', error);
      return 0;
    }
  }
}

export default ProfitService;
