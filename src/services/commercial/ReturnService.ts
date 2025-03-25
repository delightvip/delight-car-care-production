import BaseCommercialService from './BaseCommercialService';
import { Return, ReturnItem } from '../CommercialTypes';
import { toast } from "sonner";
import { format } from 'date-fns';

class ReturnService extends BaseCommercialService {
  private static instance: ReturnService;
  
  private constructor() {
    super();
  }
  
  public static getInstance(): ReturnService {
    if (!ReturnService.instance) {
      ReturnService.instance = new ReturnService();
    }
    return ReturnService.instance;
  }
  
  public async getReturns(): Promise<Return[]> {
    try {
      let { data, error } = await this.supabase
        .from('returns')
        .select(`
          *,
          parties (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const returnsWithParties = data.map(returnItem => ({
        id: returnItem.id,
        invoice_id: returnItem.invoice_id,
        party_id: returnItem.party_id,
        party_name: returnItem.parties?.name,
        date: returnItem.date,
        return_type: returnItem.return_type,
        amount: returnItem.amount,
        payment_status: returnItem.payment_status || 'draft',
        notes: returnItem.notes,
        created_at: returnItem.created_at
      }));
      
      return returnsWithParties;
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      const { data: returnData, error: returnError } = await this.supabase
        .from('returns')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', id)
        .single();
      
      if (returnError) throw returnError;
      
      const { data: items, error: itemsError } = await this.supabase
        .from('return_items')
        .select('*')
        .eq('return_id', id);
      
      if (itemsError) throw itemsError;
      
      return {
        id: returnData.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: returnData.parties?.name,
        date: returnData.date,
        return_type: returnData.return_type,
        amount: returnData.amount,
        payment_status: returnData.payment_status || 'draft',
        notes: returnData.notes,
        created_at: returnData.created_at,
        items: items
      };
    } catch (error) {
      console.error(`Error fetching return with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجع');
      return null;
    }
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      const formattedDate = typeof returnData.date === 'object' ? 
        format(returnData.date, 'yyyy-MM-dd') : 
        returnData.date;
      
      const paymentStatus = returnData.payment_status || 'draft';
      
      const { data: returnRecord, error } = await this.supabase
        .from('returns')
        .insert({
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: formattedDate,
          return_type: returnData.return_type,
          amount: returnData.amount,
          payment_status: paymentStatus,
          notes: returnData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (returnData.items && returnData.items.length > 0) {
        const returnItems = returnData.items.map(item => ({
          return_id: returnRecord.id,
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price
        }));
        
        const { error: itemsError } = await this.supabase
          .from('return_items')
          .insert(returnItems);
        
        if (itemsError) throw itemsError;
      }
      
      const party = await this.partyService.getPartyById(returnData.party_id || '');
      
      toast.success('تم تسجيل المرتجع بنجاح');
      
      return {
        id: returnRecord.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: party?.name,
        date: returnRecord.date,
        return_type: returnData.return_type,
        amount: returnData.amount,
        payment_status: paymentStatus,
        notes: returnData.notes,
        created_at: returnRecord.created_at,
        items: returnData.items
      };
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
      return null;
    }
  }
  
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      const { data: returnRecord, error: fetchError } = await this.supabase
        .from('returns')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (returnRecord.payment_status !== 'draft') {
        toast.error('يمكن تعديل المرتجعات في حالة المسودة فقط');
        return false;
      }
      
      const formattedDate = returnData.date && typeof returnData.date === 'object' ? 
        format(returnData.date, 'yyyy-MM-dd') : 
        returnData.date;
        
      const { error } = await this.supabase
        .from('returns')
        .update({
          ...returnData,
          date: formattedDate
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating return:', error);
      toast.error('حدث خطأ أثناء تحديث المرتجع');
      return false;
    }
  }
  
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status === 'confirmed') {
        toast.info('المرتجع مؤكد بالفعل');
        return true;
      }
      
      if (returnData.return_type === 'sales_return') {
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false,
            'مرتجع مبيعات',
            'sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true,
            'مرتجع مشتريات',
            'purchase_return',
            returnData.id
          );
        }
      }
      
      const { error } = await this.supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);
      
      if (error) throw error;
      
      toast.success('تم تأكيد المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء المرتجعات المؤكدة فقط');
        return false;
      }
      
      if (returnData.return_type === 'sales_return') {
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true,
            'إلغاء مرتجع مبيعات',
            'cancel_sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false,
            'إلغاء مرتجع مشتريات',
            'cancel_purchase_return',
            returnData.id
          );
        }
      }
      
      const { error } = await this.supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', returnId);
      
      if (error) throw error;
      
      toast.success('تم إلغاء المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
  
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(id);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'draft') {
        toast.error('يمكن حذف المرتجعات في حالة المسودة فقط');
        return false;
      }
      
      const { error: itemsError } = await this.supabase
        .from('return_items')
        .delete()
        .eq('return_id', id);
      
      if (itemsError) throw itemsError;
      
      const { error } = await this.supabase
        .from('returns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
      return false;
    }
  }
}

export default ReturnService;
