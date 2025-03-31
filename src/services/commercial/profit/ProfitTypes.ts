
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
