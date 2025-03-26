import { supabase } from '@/integrations/supabase/client';
import { Return, ReturnItem } from '@/services/CommercialTypes';
import { ReturnProcessor } from './ReturnProcessor';
import { ReturnEntity } from './ReturnEntity';
import { toast } from 'sonner';

export class ReturnsService {
  private static instance: ReturnsService;
  private returnProcessor: ReturnProcessor;
  
  private constructor() {
    this.returnProcessor = new ReturnProcessor();
  }
  
  public static getInstance(): ReturnsService {
    if (!ReturnsService.instance) {
      ReturnsService.instance = new ReturnsService();
    }
    return ReturnsService.instance;
  }
  
  /**
   * Fetch all returns with related data
   */
  public async getReturns(): Promise<Return[]> {
    return ReturnEntity.fetchAll();
  }
  
  /**
   * Fetch a specific return by ID
   */
  public async getReturnById(id: string): Promise<Return | null> {
    return ReturnEntity.fetchById(id);
  }
  
  /**
   * Fetch returns associated with a specific party
   */
  public async getReturnsByParty(partyId: string): Promise<Return[]> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Get return items for each return
      const returnsWithItems = await Promise.all(
        (data || []).map(async (returnData) => {
          const { data: items, error: itemsError } = await supabase
            .from('return_items')
            .select('*')
            .eq('return_id', returnData.id);
          
          if (itemsError) {
            console.error(`Error fetching items for return ${returnData.id}:`, itemsError);
            return {
              ...returnData,
              party_name: returnData.parties?.name,
              items: []
            };
          }
          
          return {
            ...returnData,
            party_name: returnData.parties?.name,
            items: items || []
          };
        })
      );
      
      return returnsWithItems;
    } catch (error) {
      console.error('Error fetching returns by party:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
  
  /**
   * Create a new return and optionally confirm it
   */
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>, autoConfirm: boolean = false): Promise<Return | null> {
    try {
      console.log('Creating new return with data:', returnData);
      
      // If party_id is missing but invoice_id is provided, get party from invoice
      if (!returnData.party_id && returnData.invoice_id) {
        const { data: invoice, error } = await supabase
          .from('invoices')
          .select('party_id')
          .eq('id', returnData.invoice_id)
          .single();
        
        if (!error && invoice) {
          returnData.party_id = invoice.party_id;
          console.log(`Setting party_id from invoice: ${returnData.party_id}`);
        }
      }
      
      // Create the return record
      const returnRecord = await ReturnEntity.create(returnData);
      
      if (!returnRecord) {
        toast.error('فشل إنشاء المرتجع');
        return null;
      }
      
      console.log('Return record created:', returnRecord);
      
      // If auto-confirm is requested, confirm the return
      if (autoConfirm || returnData.payment_status === 'confirmed') {
        console.log('Auto-confirming return');
        const confirmed = await this.confirmReturn(returnRecord.id);
        
        if (!confirmed) {
          toast.warning('تم إنشاء المرتجع ولكن فشل التأكيد التلقائي');
          return returnRecord;
        }
        
        // Refresh the return data after confirmation
        const confirmedReturn = await this.getReturnById(returnRecord.id);
        if (confirmedReturn) {
          return confirmedReturn;
        }
      }
      
      toast.success('تم إنشاء المرتجع بنجاح');
      return returnRecord;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }
  
  /**
   * Update an existing return
   */
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      const success = await ReturnEntity.update(id, returnData);
      
      if (success) {
        toast.success('تم تحديث المرتجع بنجاح');
      } else {
        toast.error('فشل تحديث المرتجع');
      }
      
      return success;
    } catch (error) {
      console.error('Error updating return:', error);
      toast.error('حدث خطأ أثناء تحديث المرتجع');
      return false;
    }
  }
  
  /**
   * Confirm a return, updating inventory and financial records
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      console.log(`Confirming return: ${returnId}`);
      return await this.returnProcessor.confirmReturn(returnId);
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  /**
   * Cancel a return, reversing inventory and financial changes
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      console.log(`Cancelling return: ${returnId}`);
      return await this.returnProcessor.cancelReturn(returnId);
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
  
  /**
   * Delete a return and its items
   */
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      // Check if the return is in draft state
      const { data, error: fetchError } = await supabase
        .from('returns')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (data.payment_status !== 'draft') {
        toast.error('يمكن حذف المرتجعات في حالة المسودة فقط');
        return false;
      }
      
      const success = await ReturnEntity.delete(id);
      
      if (success) {
        toast.success('تم حذف المرتجع بنجاح');
      } else {
        toast.error('فشل حذف المرتجع');
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
      return false;
    }
  }
  
  /**
   * Get return statistics for reporting
   */
  public async getReturnStats(startDate?: string, endDate?: string): Promise<any> {
    try {
      let query = supabase
        .from('returns')
        .select('return_type, payment_status, amount');
      
      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calculate statistics
      const stats = {
        totalReturns: data.length,
        salesReturns: data.filter(r => r.return_type === 'sales_return').length,
        purchaseReturns: data.filter(r => r.return_type === 'purchase_return').length,
        confirmedReturns: data.filter(r => r.payment_status === 'confirmed').length,
        pendingReturns: data.filter(r => r.payment_status === 'draft').length,
        cancelledReturns: data.filter(r => r.payment_status === 'cancelled').length,
        totalAmount: data.reduce((sum, r) => sum + Number(r.amount), 0),
        salesReturnAmount: data
          .filter(r => r.return_type === 'sales_return')
          .reduce((sum, r) => sum + Number(r.amount), 0),
        purchaseReturnAmount: data
          .filter(r => r.return_type === 'purchase_return')
          .reduce((sum, r) => sum + Number(r.amount), 0)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting return stats:', error);
      return null;
    }
  }
}

export default ReturnsService;
