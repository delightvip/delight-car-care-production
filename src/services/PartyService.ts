
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  opening_balance: number;
  balance_type?: 'credit' | 'debit';
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  party_id: string;
  transaction_date: string;
  type: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
  created_at: string;
  // Adding these fields to match the actual usage in PartyDetails.tsx
  transaction_type?: string;
  transaction_id?: string;
}

class PartyService {
  private static instance: PartyService;
  
  private constructor() {}
  
  public static getInstance(): PartyService {
    if (!PartyService.instance) {
      PartyService.instance = new PartyService();
    }
    return PartyService.instance;
  }
  
  // جلب جميع الأطراف التجارية
  public async getParties(): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data.map(party => ({
        id: party.id,
        name: party.name,
        type: party.type as 'customer' | 'supplier' | 'other',
        phone: party.phone || '',
        email: party.email || '',
        address: party.address || '',
        opening_balance: party.opening_balance || 0,
        balance_type: party.balance_type as 'credit' | 'debit',
        balance: party.party_balances[0]?.balance || 0,
        created_at: party.created_at
      }));
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب الأطراف التجارية');
      return [];
    }
  }
  
  // جلب طرف تجاري محدد بالمعرف
  public async getPartyById(id: string): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        type: data.type as 'customer' | 'supplier' | 'other',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        opening_balance: data.opening_balance || 0,
        balance_type: data.balance_type as 'credit' | 'debit',
        balance: data.party_balances[0]?.balance || 0,
        created_at: data.created_at
      };
    } catch (error) {
      console.error(`Error fetching party with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الطرف التجاري');
      return null;
    }
  }
  
  // جلب الأطراف حسب النوع
  public async getPartiesByType(type: 'customer' | 'supplier' | 'other'): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .eq('type', type)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data.map(party => ({
        id: party.id,
        name: party.name,
        type: party.type as 'customer' | 'supplier' | 'other',
        phone: party.phone || '',
        email: party.email || '',
        address: party.address || '',
        opening_balance: party.opening_balance || 0,
        balance_type: party.balance_type as 'credit' | 'debit',
        balance: party.party_balances[0]?.balance || 0,
        created_at: party.created_at
      }));
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      toast.error(`حدث خطأ أثناء جلب ${type === 'customer' ? 'العملاء' : type === 'supplier' ? 'الموردين' : 'الأطراف الأخرى'}`);
      return [];
    }
  }
  
  // إضافة طرف تجاري جديد
  public async addParty(party: Omit<Party, 'id' | 'balance' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert({
          name: party.name,
          type: party.type,
          phone: party.phone,
          email: party.email,
          address: party.address,
          opening_balance: party.opening_balance || 0,
          balance_type: party.balance_type || 'debit'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`تم إضافة ${party.name} بنجاح`);
      
      // الحصول على البيانات المحدثة بما في ذلك رصيد الطرف
      const { data: partyWithBalance, error: balanceError } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .eq('id', data.id)
        .single();
      
      if (balanceError) throw balanceError;
      
      return {
        id: partyWithBalance.id,
        name: partyWithBalance.name,
        type: partyWithBalance.type as 'customer' | 'supplier' | 'other',
        phone: partyWithBalance.phone || '',
        email: partyWithBalance.email || '',
        address: partyWithBalance.address || '',
        opening_balance: partyWithBalance.opening_balance || 0,
        balance_type: partyWithBalance.balance_type as 'credit' | 'debit',
        balance: partyWithBalance.party_balances[0]?.balance || 0,
        created_at: partyWithBalance.created_at
      };
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('حدث خطأ أثناء إضافة الطرف التجاري');
      return null;
    }
  }
  
  // تحديث طرف تجاري
  public async updateParty(id: string, partyData: Partial<Omit<Party, 'id' | 'created_at' | 'balance'>>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parties')
        .update(partyData)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث بيانات الطرف التجاري بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating party:', error);
      toast.error('حدث خطأ أثناء تحديث بيانات الطرف التجاري');
      return false;
    }
  }
  
  // تحديث رصيد طرف تجاري مباشرة (مع إضافة سجل في الحركات المالية)
  public async updatePartyBalance(
    partyId: string, 
    amount: number, 
    isDebit: boolean,
    description: string,
    transactionType: string,
    reference?: string
  ): Promise<boolean> {
    try {
      // 1. الحصول على رصيد الطرف الحالي
      const currentParty = await this.getPartyById(partyId);
      if (!currentParty) throw new Error('الطرف التجاري غير موجود');
      
      const currentBalance = currentParty.balance;
      
      // 2. حساب الرصيد الجديد
      let newBalance = currentBalance;
      if (isDebit) {
        newBalance += amount; // زيادة المديونية على الطرف
      } else {
        newBalance -= amount; // تخفيض المديونية على الطرف (دفع)
      }
      
      // 3. تحديث رصيد الطرف في جدول party_balances
      const { error: balanceError } = await supabase
        .from('party_balances')
        .update({ balance: newBalance, last_updated: new Date().toISOString() })
        .eq('party_id', partyId);
      
      if (balanceError) throw balanceError;
      
      // 4. إضافة سجل في جدول ledger
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          date: new Date().toISOString().split('T')[0],
          transaction_type: transactionType,
          debit: isDebit ? amount : 0,
          credit: !isDebit ? amount : 0,
          balance_after: newBalance,
          transaction_id: reference || undefined
        });
      
      if (ledgerError) throw ledgerError;
      
      return true;
    } catch (error) {
      console.error('Error updating party balance:', error);
      toast.error('حدث خطأ أثناء تحديث رصيد الطرف التجاري');
      return false;
    }
  }
  
  // حذف طرف تجاري
  public async deleteParty(id: string): Promise<boolean> {
    try {
      // 1. التحقق من عدم وجود فواتير أو مدفوعات مرتبطة بالطرف
      const { count: invoiceCount, error: invoiceError } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('party_id', id);
        
      if (invoiceError) throw invoiceError;
      
      if (invoiceCount && invoiceCount > 0) {
        toast.error('لا يمكن حذف هذا الطرف لوجود فواتير مرتبطة به');
        return false;
      }
      
      const { count: paymentCount, error: paymentError } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('party_id', id);
        
      if (paymentError) throw paymentError;
      
      if (paymentCount && paymentCount > 0) {
        toast.error('لا يمكن حذف هذا الطرف لوجود مدفوعات مرتبطة به');
        return false;
      }
      
      // 2. حذف سجلات الرصيد المرتبطة بالطرف
      const { error: balanceError } = await supabase
        .from('party_balances')
        .delete()
        .eq('party_id', id);
      
      if (balanceError) throw balanceError;
      
      // 3. حذف سجلات الحركات المالية المرتبطة بالطرف
      const { error: ledgerError } = await supabase
        .from('ledger')
        .delete()
        .eq('party_id', id);
      
      if (ledgerError) throw ledgerError;
      
      // 4. حذف الطرف نفسه
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف الطرف التجاري بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting party:', error);
      toast.error('حدث خطأ أثناء حذف الطرف التجاري');
      return false;
    }
  }
  
  // جلب الحركات المالية للطرف التجاري
  public async getPartyTransactions(partyId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Map the ledger data to match our Transaction interface
      return data.map(item => ({
        id: item.id,
        party_id: item.party_id,
        transaction_date: item.date,
        type: item.transaction_type,
        description: item.description || '',
        reference: item.transaction_id,
        debit: item.debit || 0,
        credit: item.credit || 0,
        balance: item.balance_after,
        created_at: item.created_at,
        transaction_type: item.transaction_type // Add this to satisfy the component usage
      }));
    } catch (error) {
      console.error('Error fetching party transactions:', error);
      toast.error('حدث خطأ أثناء جلب الحركات المالية');
      return [];
    }
  }
  
  // تحديث رصيد افتتاحي للطرف
  public async updateOpeningBalance(
    partyId: string, 
    newOpeningBalance: number, 
    balanceType: 'credit' | 'debit'
  ): Promise<boolean> {
    try {
      const currentParty = await this.getPartyById(partyId);
      if (!currentParty) throw new Error('الطرف التجاري غير موجود');
      
      // حساب الفرق بين الرصيد الافتتاحي الجديد والقديم
      const oldOpeningValue = currentParty.opening_balance * (currentParty.balance_type === 'debit' ? 1 : -1);
      const newOpeningValue = newOpeningBalance * (balanceType === 'debit' ? 1 : -1);
      const balanceDifference = newOpeningValue - oldOpeningValue;
      
      // تحديث بيانات الطرف
      const { error } = await supabase
        .from('parties')
        .update({
          opening_balance: newOpeningBalance,
          balance_type: balanceType
        })
        .eq('id', partyId);
      
      if (error) throw error;
      
      // تحديث رصيد الطرف
      const newBalance = currentParty.balance + balanceDifference;
      
      const { error: balanceError } = await supabase
        .from('party_balances')
        .update({ 
          balance: newBalance,
          last_updated: new Date().toISOString()
        })
        .eq('party_id', partyId);
      
      if (balanceError) throw balanceError;
      
      // إضافة حركة مالية لتعكس التغيير في الرصيد الافتتاحي
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          date: new Date().toISOString().split('T')[0],
          transaction_type: 'opening_balance_update',
          description: 'تعديل الرصيد الافتتاحي',
          debit: balanceDifference > 0 ? Math.abs(balanceDifference) : 0,
          credit: balanceDifference < 0 ? Math.abs(balanceDifference) : 0,
          balance_after: newBalance,
          transaction_id: undefined
        });
      
      if (ledgerError) throw ledgerError;
      
      toast.success('تم تحديث الرصيد الافتتاحي بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating opening balance:', error);
      toast.error('حدث خطأ أثناء تحديث الرصيد الافتتاحي');
      return false;
    }
  }
}

export default PartyService;
