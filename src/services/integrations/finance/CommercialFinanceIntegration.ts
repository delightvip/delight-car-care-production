
import { FinanceIntegrationBase } from './FinanceIntegrationBase';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * خدمة التكامل بين نظام الحركات التجارية والنظام المالي
 */
export class CommercialFinanceIntegration extends FinanceIntegrationBase {
  private static instance: CommercialFinanceIntegration;
  
  private constructor() {
    super();
  }

  public static getInstance(): CommercialFinanceIntegration {
    if (!CommercialFinanceIntegration.instance) {
      CommercialFinanceIntegration.instance = new CommercialFinanceIntegration();
    }
    return CommercialFinanceIntegration.instance;
  }

  /**
   * تسجيل معاملة في سجل الحساب
   * @param ledgerEntry بيانات المعاملة
   */
  public async recordLedgerEntry(ledgerEntry: {
    party_id: string;
    transaction_id: string;
    transaction_type: string;
    date: string;
    debit: number;
    credit: number;
    notes?: string;
  }): Promise<boolean> {
    try {
      // الحصول على رصيد الطرف الحالي
      const { data: partyBalance, error: balanceError } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', ledgerEntry.party_id)
        .maybeSingle();

      if (balanceError) {
        console.error('Error fetching party balance:', balanceError);
        return false;
      }

      // حساب الرصيد الجديد
      const currentBalance = partyBalance?.balance || 0;
      const balanceAfter = currentBalance + (ledgerEntry.debit - ledgerEntry.credit);

      // إنشاء قيد محاسبي جديد
      const { error } = await supabase
        .from('ledger')
        .insert({
          party_id: ledgerEntry.party_id,
          transaction_id: ledgerEntry.transaction_id,
          transaction_type: ledgerEntry.transaction_type,
          date: ledgerEntry.date,
          debit: ledgerEntry.debit,
          credit: ledgerEntry.credit,
          balance_after: balanceAfter,
          notes: ledgerEntry.notes || ''
        });

      if (error) {
        console.error('Error recording ledger entry:', error);
        return false;
      }

      // تحديث رصيد الطرف
      if (partyBalance) {
        // تحديث الرصيد الحالي
        const { error: updateError } = await supabase
          .from('party_balances')
          .update({ balance: balanceAfter })
          .eq('party_id', ledgerEntry.party_id);

        if (updateError) {
          console.error('Error updating party balance:', updateError);
          return false;
        }
      } else {
        // إنشاء سجل رصيد جديد
        const { error: insertError } = await supabase
          .from('party_balances')
          .insert({
            party_id: ledgerEntry.party_id,
            balance: balanceAfter
          });

        if (insertError) {
          console.error('Error creating party balance:', insertError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in recordLedgerEntry:', error);
      return false;
    }
  }

  /**
   * حساب الأرباح من فاتورة مبيعات
   * @param invoiceId معرف الفاتورة
   * @param itemsData بيانات عناصر الفاتورة
   */
  public async calculateInvoiceProfit(
    invoiceId: string,
    itemsData: Array<{
      item_id: number;
      item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
      quantity: number;
      unit_price: number;
      cost_price?: number;
    }>
  ): Promise<{
    totalCost: number;
    totalPrice: number;
    profit: number;
    profitMargin: number;
  }> {
    try {
      let totalCost = 0;
      let totalPrice = 0;

      // حساب التكلفة والسعر لكل عنصر
      for (const item of itemsData) {
        const itemPrice = item.quantity * item.unit_price;
        totalPrice += itemPrice;

        // إذا كانت تكلفة العنصر متوفرة مباشرة
        if (item.cost_price) {
          totalCost += item.quantity * item.cost_price;
        } else {
          // الحصول على تكلفة العنصر من قاعدة البيانات
          const cost = await this.getItemCost(item.item_id, item.item_type);
          totalCost += item.quantity * cost;
        }
      }

      // حساب الربح وهامش الربح
      const profit = totalPrice - totalCost;
      const profitMargin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

      return {
        totalCost,
        totalPrice,
        profit,
        profitMargin
      };
    } catch (error) {
      console.error('Error calculating invoice profit:', error);
      toast.error('حدث خطأ أثناء حساب أرباح الفاتورة');
      
      // إرجاع قيم افتراضية في حالة الخطأ
      return {
        totalCost: 0,
        totalPrice: 0,
        profit: 0,
        profitMargin: 0
      };
    }
  }

  /**
   * الحصول على تكلفة عنصر من المخزون
   * @param itemId معرف العنصر
   * @param itemType نوع العنصر
   * @returns تكلفة الوحدة
   */
  private async getItemCost(
    itemId: number,
    itemType: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products"
  ): Promise<number> {
    try {
      let tableName: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
      
      switch (itemType) {
        case "raw_materials":
          tableName = "raw_materials";
          break;
        case "packaging_materials":
          tableName = "packaging_materials";
          break;
        case "semi_finished_products":
          tableName = "semi_finished_products";
          break;
        case "finished_products":
          tableName = "finished_products";
          break;
        default:
          return 0;
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .select('unit_cost')
        .eq('id', itemId)
        .maybeSingle();
        
      if (error) {
        console.error(`Error fetching ${itemType} cost:`, error);
        return 0;
      }
      
      return data?.unit_cost || 0;
    } catch (error) {
      console.error('Error getting item cost:', error);
      return 0;
    }
  }
}

export default CommercialFinanceIntegration;
