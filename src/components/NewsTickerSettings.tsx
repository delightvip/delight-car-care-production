
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FinancialTicker } from "@/components/ui/news-ticker-fixed";
import { Skeleton } from "@/components/ui/skeleton";
import FinancialService from "@/services/financial/FinancialService";
import InventoryService from "@/services/InventoryService";
import LedgerService from "@/services/commercial/LedgerService";
import { FinancialBalance } from "@/services/financial/FinancialTypes";

interface NewsTickerSettingsProps {
  className?: string;
}

const NewsTickerSettings: React.FC<NewsTickerSettingsProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [inventoryValue, setInventoryValue] = useState<number>(0);
  const [totalReceivables, setTotalReceivables] = useState<number>(0);
  const [totalPayables, setTotalPayables] = useState<number>(0);
  const [financialBalance, setFinancialBalance] = useState<FinancialBalance | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load financial summary
        const financialService = FinancialService.getInstance();
        const summary = await financialService.getFinancialSummary();
        setFinancialSummary(summary);
        
        // Load financial balance
        const balance = await financialService.getFinancialBalance();
        setFinancialBalance(balance);

        // Load inventory value
        const inventoryService = InventoryService.getInstance();
        const rawMaterials = await inventoryService.getRawMaterials();
        const semiFinished = await inventoryService.getSemiFinishedProducts();
        const packaging = await inventoryService.getPackagingMaterials();
        const finished = await inventoryService.getFinishedProducts();
        
        const totalInventoryValue = 
          rawMaterials.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0) +
          semiFinished.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0) +
          packaging.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0) +
          finished.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
        
        setInventoryValue(totalInventoryValue);
        
        // Load receivables and payables
        const ledgerService = LedgerService.getInstance();
        const parties = await ledgerService.generateAccountStatement(
          new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        );
        
        let receivables = 0;
        let payables = 0;
        
        parties.forEach(party => {
          if (party.party_type === 'customer' && party.closing_balance > 0) {
            receivables += party.closing_balance;
          } else if (party.party_type === 'supplier' && party.closing_balance < 0) {
            payables += Math.abs(party.closing_balance);
          }
        });
        
        setTotalReceivables(receivables);
        setTotalPayables(payables);
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-2">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const cashBalance = financialBalance?.cash_balance || 0;
  const bankBalance = financialBalance?.bank_balance || 0;
  const totalLiquidity = cashBalance + bankBalance;
  
  // Calculate total assets and liabilities
  const totalAssets = inventoryValue + totalReceivables + totalLiquidity;
  const totalLiabilities = totalPayables;
  
  // Calculate net worth
  const netWorth = totalAssets - totalLiabilities;
  
  // Calculate debt ratio
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  
  const tickerItems = [
    { 
      label: "القيمة الإجمالية", 
      value: netWorth, 
      isMonetary: true,
      status: netWorth >= 0 ? "positive" : "negative" 
    },
    { 
      label: "قيمة المخزون", 
      value: inventoryValue, 
      isMonetary: true 
    },
    { 
      label: "السيولة النقدية", 
      value: totalLiquidity, 
      isMonetary: true 
    },
    { 
      label: "حسابات مدينة", 
      value: totalReceivables, 
      isMonetary: true,
      status: "positive" 
    },
    { 
      label: "حسابات دائنة", 
      value: totalPayables, 
      isMonetary: true,
      status: "negative" 
    },
    { 
      label: "نسبة الديون", 
      value: debtRatio.toFixed(1), 
      isPercentage: true,
      status: debtRatio < 30 ? "positive" : debtRatio < 60 ? "neutral" : "negative"
    },
  ];

  return (
    <Card className={className}>
      <CardContent className="p-2">
        <FinancialTicker items={tickerItems} />
      </CardContent>
    </Card>
  );
};

export default NewsTickerSettings;
