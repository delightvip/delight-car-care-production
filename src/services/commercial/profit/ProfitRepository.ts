
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import BaseCommercialService from '../BaseCommercialService';
import { ProfitData, ProfitFilter, ProfitSummary } from './ProfitTypes';

class ProfitRepository extends BaseCommercialService {
  private static instance: ProfitRepository;
  
  private constructor() {
    super();
  }
  
  public static getInstance(): ProfitRepository {
    if (!ProfitRepository.instance) {
      ProfitRepository.instance = new ProfitRepository();
    }
    return ProfitRepository.instance;
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
        
        if (filters.partyId && filters.partyId !== 'all') {
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
      
      if (partyId && partyId !== 'all') {
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
   * Create or update profit record
   */
  public async saveProfitData(profitData: Omit<ProfitData, 'id' | 'created_at' | 'party_name'>): Promise<ProfitData | null> {
    try {
      // Check if profit record already exists
      const { data: existingProfit, error: existingError } = await this.supabase
        .from('profits')
        .select('*')
        .eq('invoice_id', profitData.invoice_id)
        .maybeSingle();
      
      if (existingProfit) {
        // Update existing profit record
        const { data, error } = await this.supabase
          .from('profits')
          .update({
            total_sales: profitData.total_sales,
            total_cost: profitData.total_cost,
            profit_amount: profitData.profit_amount,
            profit_percentage: profitData.profit_percentage
          })
          .eq('id', existingProfit.id)
          .select('*, parties (name)')
          .single();
        
        if (error) throw error;
        
        return {
          id: data.id,
          invoice_id: data.invoice_id,
          invoice_date: data.invoice_date,
          party_id: data.party_id,
          party_name: data.parties?.name || '',
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
            invoice_id: profitData.invoice_id,
            invoice_date: profitData.invoice_date,
            party_id: profitData.party_id,
            total_sales: profitData.total_sales,
            total_cost: profitData.total_cost,
            profit_amount: profitData.profit_amount,
            profit_percentage: profitData.profit_percentage
          })
          .select('*, parties (name)')
          .single();
        
        if (error) throw error;
        
        return {
          id: data.id,
          invoice_id: data.invoice_id,
          invoice_date: data.invoice_date,
          party_id: data.party_id,
          party_name: data.parties?.name || '',
          total_sales: data.total_sales,
          total_cost: data.total_cost,
          profit_amount: data.profit_amount,
          profit_percentage: data.profit_percentage,
          created_at: data.created_at
        };
      }
    } catch (error) {
      console.error('Error saving profit data:', error);
      return null;
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
}

export default ProfitRepository;
