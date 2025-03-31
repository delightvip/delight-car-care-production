
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Filter, Search, X } from 'lucide-react';
import { ProfitFilter as ProfitFilterType } from '@/services/commercial/profit/ProfitService';
import { supabase } from '@/integrations/supabase/client';

interface ProfitFilterProps {
  onFilterChange: (filters: ProfitFilterType) => void;
}

interface Party {
  id: string;
  name: string;
}

const ProfitFilter = ({ onFilterChange }: ProfitFilterProps) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    to: new Date()
  });
  
  const [partyId, setPartyId] = useState<string>('');
  const [minProfit, setMinProfit] = useState<string>('');
  const [maxProfit, setMaxProfit] = useState<string>('');
  const [parties, setParties] = useState<Party[]>([]);
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  
  useEffect(() => {
    const fetchParties = async () => {
      const { data } = await supabase
        .from('parties')
        .select('id, name')
        .order('name');
      
      if (data) {
        setParties(data);
      }
    };
    
    fetchParties();
  }, []);
  
  const handleFilter = () => {
    const filters: ProfitFilterType = {};
    
    if (dateRange.from) {
      filters.startDate = format(dateRange.from, 'yyyy-MM-dd');
    }
    
    if (dateRange.to) {
      filters.endDate = format(dateRange.to, 'yyyy-MM-dd');
    }
    
    if (partyId) {
      filters.partyId = partyId;
    }
    
    if (minProfit) {
      filters.minProfit = parseFloat(minProfit);
    }
    
    if (maxProfit) {
      filters.maxProfit = parseFloat(maxProfit);
    }
    
    if (sortBy) {
      filters.sortBy = sortBy as any;
      filters.sortOrder = sortOrder as any;
    }
    
    onFilterChange(filters);
  };
  
  const handleReset = () => {
    setDateRange({
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date()
    });
    setPartyId('');
    setMinProfit('');
    setMaxProfit('');
    setSortBy('date');
    setSortOrder('desc');
    
    onFilterChange({});
  };
  
  return (
    <Card className="p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="flex-1">
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={({ range }) => setDateRange(range)}
          />
        </div>
        
        <div className="flex-1">
          <Select value={partyId} onValueChange={setPartyId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="اختر العميل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">جميع العملاء</SelectItem>
              {parties.map(party => (
                <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1">
          <Input
            type="number"
            placeholder="الحد الأدنى للربح"
            value={minProfit}
            onChange={e => setMinProfit(e.target.value)}
          />
        </div>
        
        <div className="flex-1">
          <Input
            type="number"
            placeholder="الحد الأقصى للربح"
            value={maxProfit}
            onChange={e => setMaxProfit(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">التاريخ</SelectItem>
              <SelectItem value="profit_amount">قيمة الربح</SelectItem>
              <SelectItem value="profit_percentage">نسبة الربح</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1">
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">تنازلي</SelectItem>
              <SelectItem value="asc">تصاعدي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="default" onClick={handleFilter} className="flex-1 gap-2">
            <Filter size={16} />
            تطبيق الفلتر
          </Button>
          
          <Button variant="ghost" onClick={handleReset} className="gap-2">
            <X size={16} />
            إعادة ضبط
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProfitFilter;
