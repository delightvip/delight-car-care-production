
/**
 * أنواع بيانات الأرباح
 */

// بيانات الربح الأساسية
export interface ProfitData {
  id: string;
  invoice_id: string;
  invoice_date?: string;
  party_id: string;
  party_name?: string;
  total_sales: number;
  total_cost: number;
  profit_amount: number;
  profit_percentage: number;
  created_at?: string;
}

// مرشحات البحث عن الأرباح
export interface ProfitFilter {
  startDate?: string;
  endDate?: string;
  minProfit?: string;
  maxProfit?: string;
  partyId?: string;
}
