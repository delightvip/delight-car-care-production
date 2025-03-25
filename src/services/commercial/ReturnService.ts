
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
      // Set default payment status to draft if not provided
      const paymentStatus = returnData.payment_status || 'draft';
      
      // Format date if needed
      const formattedDate = returnData.date instanceof Date ? 
        format(returnData.date, 'yyyy-MM-dd') : 
        returnData.date;
      
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
      
      // If there are items for this return, insert them
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
      
      // Get party details for response
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
      const { data: existingReturn, error: fetchError } = await this.supabase
        .from('returns')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (existingReturn.payment_status !== 'draft') {
        toast.error('يمكن تعديل المرتجعات في حالة المسودة فقط');
        return false;
      }
      
      // Format date if it's a Date object
      const formattedDate = returnData.date instanceof Date ? 
        format(returnData.date, 'yyyy-MM-dd') : 
        returnData.date;
      
      const updateData: any = {};
      if (returnData.invoice_id) updateData.invoice_id = returnData.invoice_id;
      if (returnData.party_id) updateData.party_id = returnData.party_id;
      if (formattedDate) updateData.date = formattedDate;
      if (returnData.return_type) updateData.return_type = returnData.return_type;
      if (returnData.amount) updateData.amount = returnData.amount;
      if (returnData.notes !== undefined) updateData.notes = returnData.notes;
      
      const { error } = await this.supabase
        .from('returns')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // If there are updated items, handle them
      if (returnData.items && returnData.items.length > 0) {
        // Delete existing items
        await this.supabase
          .from('return_items')
          .delete()
          .eq('return_id', id);
        
        // Insert new items
        const returnItems = returnData.items.map(item => ({
          return_id: id,
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
      // Get the return with items
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      // Check if the return is already confirmed
      if (returnData.payment_status === 'confirmed') {
        toast.info('المرتجع مؤكد بالفعل');
        return true;
      }
      
      // Update inventory based on return type
      if (returnData.return_type === 'sales_return') {
        // Increase inventory for sales returns (customer returning items)
        if (returnData.items) {
          for (const item of returnData.items) {
            switch (item.item_type) {
              case 'raw_materials':
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
                break;
              case 'packaging_materials':
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
                break;
              case 'semi_finished_products':
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
                break;
              case 'finished_products':
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
                break;
            }
          }
        }
        
        // Update customer financial records for sales returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // credit for sales returns (reduce customer's debt)
            'مرتجع مبيعات',
            'sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        // Decrease inventory for purchase returns (returning items to supplier)
        if (returnData.items) {
          for (const item of returnData.items) {
            switch (item.item_type) {
              case 'raw_materials':
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
                break;
              case 'packaging_materials':
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
                break;
              case 'semi_finished_products':
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
                break;
              case 'finished_products':
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
                break;
            }
          }
        }
        
        // Update supplier financial records for purchase returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // debit for purchase returns (reduce our debt)
            'مرتجع مشتريات',
            'purchase_return',
            returnData.id
          );
        }
      }
      
      // Update return status to confirmed
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
  
  private async getNewQuantity(itemType: string, itemId: number, quantityChange: number): Promise<number> {
    try {
      let currentQuantity = 0;
      
      switch (itemType) {
        case 'raw_materials':
          const { data: rawMaterial } = await this.supabase
            .from('raw_materials')
            .select('quantity')
            .eq('id', itemId)
            .single();
          currentQuantity = rawMaterial?.quantity || 0;
          break;
        case 'packaging_materials':
          const { data: packagingMaterial } = await this.supabase
            .from('packaging_materials')
            .select('quantity')
            .eq('id', itemId)
            .single();
          currentQuantity = packagingMaterial?.quantity || 0;
          break;
        case 'semi_finished_products':
          const { data: semiFinishedProduct } = await this.supabase
            .from('semi_finished_products')
            .select('quantity')
            .eq('id', itemId)
            .single();
          currentQuantity = semiFinishedProduct?.quantity || 0;
          break;
        case 'finished_products':
          const { data: finishedProduct } = await this.supabase
            .from('finished_products')
            .select('quantity')
            .eq('id', itemId)
            .single();
          currentQuantity = finishedProduct?.quantity || 0;
          break;
      }
      
      return currentQuantity + quantityChange;
    } catch (error) {
      console.error('Error getting current quantity:', error);
      throw error;
    }
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      // Get the return with items
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      // Only confirmed returns can be cancelled
      if (returnData.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء المرتجعات المؤكدة فقط');
        return false;
      }
      
      // Reverse inventory updates based on return type
      if (returnData.return_type === 'sales_return') {
        // Decrease inventory for cancelled sales returns
        if (returnData.items) {
          for (const item of returnData.items) {
            switch (item.item_type) {
              case 'raw_materials':
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
                break;
              case 'packaging_materials':
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
                break;
              case 'semi_finished_products':
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
                break;
              case 'finished_products':
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
                break;
            }
          }
        }
        
        // Reverse customer financial records for cancelled sales returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // debit for cancelled sales returns (add back customer's debt)
            'إلغاء مرتجع مبيعات',
            'cancel_sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        // Increase inventory for cancelled purchase returns
        if (returnData.items) {
          for (const item of returnData.items) {
            switch (item.item_type) {
              case 'raw_materials':
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
                break;
              case 'packaging_materials':
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
                break;
              case 'semi_finished_products':
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
                break;
              case 'finished_products':
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
                break;
            }
          }
        }
        
        // Reverse supplier financial records for cancelled purchase returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // credit for cancelled purchase returns (add back our debt)
            'إلغاء مرتجع مشتريات',
            'cancel_purchase_return',
            returnData.id
          );
        }
      }
      
      // Update return status to cancelled
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
      
      // Only draft returns can be deleted
      if (returnData.payment_status !== 'draft') {
        toast.error('لا يمكن حذف المرتجعات المؤكدة، يمكن إلغاءها فقط');
        return false;
      }
      
      // Delete return items first
      const { error: itemsError } = await this.supabase
        .from('return_items')
        .delete()
        .eq('return_id', id);
      
      if (itemsError) throw itemsError;
      
      // Delete the return
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
