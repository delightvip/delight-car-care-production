import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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
  notes?: string;
  code?: string;
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
  transaction_type?: string;
  transaction_id?: string;
}

class PartyService {
  private static instance: PartyService;
  private supabase: SupabaseClient;

  private constructor() {
    this.supabase = supabase;
  }
  
  public static getInstance(): PartyService {
    if (!PartyService.instance) {
      PartyService.instance = new PartyService();
    }
    return PartyService.instance;
  }
  
  public async getParties(): Promise<Party[]> {
    try {
      const { data, error } = await this.supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data.map(party => {
        const balance = party.party_balances && party.party_balances.length > 0 
          ? party.party_balances[0]?.balance 
          : this.calculateDefaultBalance(party.opening_balance || 0, party.balance_type as 'credit' | 'debit');
          
        return {
          id: party.id,
          name: party.name,
          type: party.type as 'customer' | 'supplier' | 'other',
          phone: party.phone || '',
          email: party.email || '',
          address: party.address || '',
          opening_balance: party.opening_balance || 0,
          balance_type: party.balance_type as 'credit' | 'debit',
          balance: balance || 0,
          created_at: party.created_at,
          notes: party.notes || '',
          code: party.code || ''
        };
      });
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب الأطراف التجارية');
      return [];
    }
  }
  
  private calculateDefaultBalance(openingBalance: number, balanceType: 'credit' | 'debit'): number {
    return balanceType === 'credit' ? -openingBalance : openingBalance;
  }
  
  public async getPartyById(id: string): Promise<Party | null> {
    try {
      const { data, error } = await this.supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      const balance = data.party_balances && data.party_balances.length > 0 
        ? data.party_balances[0]?.balance 
        : this.calculateDefaultBalance(data.opening_balance || 0, data.balance_type as 'credit' | 'debit');
      
      if (!data.party_balances || data.party_balances.length === 0) {
        console.log(`لم يتم العثور على رصيد للطرف ${data.name}. جاري إنشاء سجل رصيد جديد...`);
        
        try {
          const initialBalance = this.calculateDefaultBalance(data.opening_balance || 0, data.balance_type as 'credit' | 'debit');
          
          const { error: createBalanceError } = await this.supabase
            .from('party_balances')
            .insert({
              party_id: id,
              balance: initialBalance,
              last_updated: new Date().toISOString()
            });
            
          if (createBalanceError) {
            console.error(`خطأ في إنشاء رصيد للطرف ${id}:`, createBalanceError);
          } else {
            console.log(`تم إنشاء رصيد للطرف ${data.name} بنجاح بقيمة ${initialBalance}`);
          }
        } catch (balanceError) {
          console.error(`خطأ أثناء إنشاء رصيد للطرف ${id}:`, balanceError);
        }
      }
      
      return {
        id: data.id,
        name: data.name,
        type: data.type as 'customer' | 'supplier' | 'other',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        opening_balance: data.opening_balance || 0,
        balance_type: data.balance_type as 'credit' | 'debit',
        balance: balance || 0,
        created_at: data.created_at,
        notes: data.notes || '',
        code: data.code || ''
      };
    } catch (error) {
      console.error(`Error fetching party with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الطرف التجاري');
      return null;
    }
  }
  
  public async getPartiesByType(type: 'customer' | 'supplier' | 'other'): Promise<Party[]> {
    try {
      const { data, error } = await this.supabase
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
        created_at: party.created_at,
        notes: party.notes || '',
        code: party.code || ''
      }));
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      toast.error(`حدث خطأ أثناء جلب ${type === 'customer' ? 'العملاء' : type === 'supplier' ? 'الموردين' : 'الأطراف الأخرى'}`);
      return [];
    }
  }
  
  public async addParty(party: Omit<Party, 'id' | 'balance' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await this.supabase
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
      
      const { data: partyWithBalance, error: balanceError } = await this.supabase
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
        created_at: partyWithBalance.created_at,
        notes: partyWithBalance.notes || '',
        code: partyWithBalance.code || ''
      };
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('حدث خطأ أثناء إضافة الطرف التجاري');
      return null;
    }
  }
  
  public async updateParty(id: string, partyData: Partial<Omit<Party, 'id' | 'created_at' | 'balance'>>): Promise<boolean> {
    try {
      const { error } = await this.supabase
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
  
  public async updatePartyBalance(
    partyId: string, 
    amount: number, 
    isDebit: boolean,
    description: string,
    transactionType: string,
    reference?: string
  ): Promise<boolean> {
    try {
      const currentParty = await this.getPartyById(partyId);
      if (!currentParty) throw new Error('الطرف التجاري غير موجود');
      
      const currentBalance = currentParty.balance;
      
      let newBalance = currentBalance;
      if (isDebit) {
        newBalance += amount;
      } else {
        newBalance -= amount;
      }
      
      const { data: existingBalance, error: balanceCheckError } = await this.supabase
        .from('party_balances')
        .select('id')
        .eq('party_id', partyId)
        .maybeSingle();
      
      if (balanceCheckError) {
        console.error(`خطأ في التحقق من رصيد الطرف ${partyId}:`, balanceCheckError);
        throw balanceCheckError;
      }
      
      if (existingBalance) {
        const { error: balanceError } = await this.supabase
          .from('party_balances')
          .update({ balance: newBalance, last_updated: new Date().toISOString() })
          .eq('id', existingBalance.id);
        
        if (balanceError) throw balanceError;
      } else {
        const { error: createBalanceError } = await this.supabase
          .from('party_balances')
          .insert({
            party_id: partyId,
            balance: newBalance,
            last_updated: new Date().toISOString()
          });
          
        if (createBalanceError) throw createBalanceError;
      }
      
      const returnRelatedTypes = [
        'sales_return',                // مرتجع مبيعات
        'purchase_return',             // مرتجع مشتريات
        'cancel_sales_return',         // إلغاء مرتجع مبيعات
        'cancel_purchase_return',      // إلغاء مرتجع مشتريات
        'return_cancellation',         // نوع عام لإلغاء المرتجع
        'return_confirmation',         // نوع عام لتأكيد المرتجع
        'sales_return_cancellation',   // إلغاء مرتجع مبيعات
        'purchase_return_cancellation' // إلغاء مرتجع مشتريات
      ];
      
      const isReturnRelatedTransaction = returnRelatedTypes.includes(transactionType) ||
                                        transactionType.includes('return_cancellation');
      
      const { error: ledgerError } = await this.supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          date: new Date().toISOString().split('T')[0],
          transaction_type: transactionType,
          debit: isDebit ? amount : 0,
          credit: !isDebit ? amount : 0,
          balance_after: newBalance,
          transaction_id: reference || undefined,
          description: description + (isReturnRelatedTransaction ? ' (لا يظهر في لوحة التحكم المالية)' : '')
        });
      
      if (ledgerError) throw ledgerError;
      
      if (!isReturnRelatedTransaction && amount > 0) {
        const type = isDebit ? 'expense' : 'income';
        const category_id = type === 'income' ? 'c69949b5-2969-4984-9f99-93a377fca8ff' : 'd4439564-5a92-4e95-a889-19c449989181';
        
        console.log(`إنشاء معاملة مالية للمعاملة ${transactionType}، نوع: ${type}، القيمة: ${amount}`);
        
        const { error: financialError } = await this.supabase
          .from('financial_transactions')
          .insert({
            type: type,
            amount: amount,
            category_id: category_id,
            date: new Date().toISOString().split('T')[0],
            payment_method: 'other',
            notes: description,
            reference_id: reference || partyId,
            reference_type: transactionType
          });
          
        if (financialError) {
          console.warn('خطأ في إنشاء المعاملة المالية، ولكن تم تحديث رصيد العميل بنجاح:', financialError);
        }
      } else if (isReturnRelatedTransaction) {
        console.log(`تم تجاهل إنشاء معاملة مالية للمعاملة ${transactionType} لأنها متعلقة بالمرتجعات`);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating party balance:', error);
      toast.error('حدث خطأ أثناء تحديث رصيد الطرف التجاري');
      return false;
    }
  }
  
  public async deleteParty(id: string): Promise<boolean> {
    try {
      const { count: invoiceCount, error: invoiceError } = await this.supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('party_id', id);
        
      if (invoiceError) throw invoiceError;
      
      if (invoiceCount && invoiceCount > 0) {
        toast.error('لا يمكن حذف هذا الطرف لوجود فواتير مرتبطة به');
        return false;
      }
      
      const { count: paymentCount, error: paymentError } = await this.supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('party_id', id);
        
      if (paymentError) throw paymentError;
      
      if (paymentCount && paymentCount > 0) {
        toast.error('لا يمكن حذف هذا الطرف لوجود مدفوعات مرتبطة به');
        return false;
      }
      
      const { error: balanceError } = await this.supabase
        .from('party_balances')
        .delete()
        .eq('party_id', id);
      
      if (balanceError) throw balanceError;
      
      const { error: ledgerError } = await this.supabase
        .from('ledger')
        .delete()
        .eq('party_id', id);
      
      if (ledgerError) throw ledgerError;
      
      const { error } = await this.supabase
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
  
  public async getPartyTransactions(partyId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
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
        transaction_type: item.transaction_type
      }));
    } catch (error) {
      console.error('Error fetching party transactions:', error);
      toast.error('حدث خطأ أثناء جلب الحركات المالية');
      return [];
    }
  }
  
  public async getLedgerEntries(partyId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      const ledgerEntries = data.map(entry => ({
        id: entry.id,
        party_id: entry.party_id,
        transaction_id: entry.transaction_id,
        transaction_type: entry.transaction_type,
        date: entry.date,
        debit: entry.debit,
        credit: entry.credit,
        balance_after: entry.balance_after,
        created_at: entry.created_at,
        notes: ''
      }));
      
      return ledgerEntries;
    } catch (error) {
      console.error('Error fetching party ledger:', error);
      toast.error('فشل في جلب سجل الحساب');
      return [];
    }
  }
  
  public async updateOpeningBalance(
    partyId: string, 
    newOpeningBalance: number, 
    balanceType: 'credit' | 'debit'
  ): Promise<boolean> {
    try {
      const currentParty = await this.getPartyById(partyId);
      if (!currentParty) throw new Error('الطرف التجاري غير موجود');
      
      const oldOpeningValue = currentParty.opening_balance * (currentParty.balance_type === 'debit' ? 1 : -1);
      const newOpeningValue = newOpeningBalance * (balanceType === 'debit' ? 1 : -1);
      const balanceDifference = newOpeningValue - oldOpeningValue;
      
      const { error } = await this.supabase
        .from('parties')
        .update({
          opening_balance: newOpeningBalance,
          balance_type: balanceType
        })
        .eq('id', partyId);
      
      if (error) throw error;
      
      const newBalance = currentParty.balance + balanceDifference;
      
      const { data: existingBalance, error: balanceCheckError } = await this.supabase
        .from('party_balances')
        .select('id')
        .eq('party_id', partyId)
        .maybeSingle();
      
      if (balanceCheckError) {
        console.error(`خطأ في التحقق من رصيد الطرف ${partyId}:`, balanceCheckError);
        throw balanceCheckError;
      }
      
      if (existingBalance) {
        const { error: balanceError } = await this.supabase
          .from('party_balances')
          .update({ 
            balance: newBalance,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingBalance.id);
        
        if (balanceError) throw balanceError;
      } else {
        const { error: createBalanceError } = await this.supabase
          .from('party_balances')
          .insert({
            party_id: partyId,
            balance: newBalance,
            last_updated: new Date().toISOString()
          });
          
        if (createBalanceError) throw createBalanceError;
      }
      
      const { error: ledgerError } = await this.supabase
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
  
  private getTransactionDescription(transaction_type: string): string {
    const descriptions: { [key: string]: string } = {
      'sale_invoice': 'فاتورة مبيعات',
      'purchase_invoice': 'فاتورة مشتريات',
      'payment_received': 'دفعة مستلمة',
      'payment_made': 'دفعة مدفوعة',
      'sales_return': 'مرتجع مبيعات',
      'purchase_return': 'مرتجع مشتريات',
      'opening_balance': 'رصيد افتتاحي'
    };
    
    return descriptions[transaction_type] || transaction_type;
  }
}

export default PartyService;
