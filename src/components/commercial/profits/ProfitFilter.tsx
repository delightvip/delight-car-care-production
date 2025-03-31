
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ProfitFilter as ProfitFilterType } from '@/services/commercial/profit/ProfitService';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PartyService from '@/services/PartyService';

interface ProfitFilterProps {
  onFilterChange: (filters: ProfitFilterType) => void;
}

const ProfitFilter = ({ onFilterChange }: ProfitFilterProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [partyId, setPartyId] = useState<string>('');
  const [minProfit, setMinProfit] = useState<string>('');
  const [maxProfit, setMaxProfit] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'profit_amount' | 'profit_percentage'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Fetch parties for customer selection
  const { data: parties = [] } = useQuery({
    queryKey: ['parties', 'customer'],
    queryFn: async () => {
      const partyService = PartyService.getInstance();
      const parties = await partyService.getPartiesByType('customer');
      return parties;
    }
  });
  
  const handleApplyFilter = () => {
    const filters: ProfitFilterType = {};
    
    if (dateRange?.from) {
      filters.startDate = dateRange.from.toISOString().split('T')[0];
    }
    
    if (dateRange?.to) {
      filters.endDate = dateRange.to.toISOString().split('T')[0];
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
    
    filters.sortBy = sortBy;
    filters.sortOrder = sortOrder;
    
    onFilterChange(filters);
  };
  
  const handleReset = () => {
    setDateRange(undefined);
    setPartyId('');
    setMinProfit('');
    setMaxProfit('');
    setSortBy('date');
    setSortOrder('desc');
    onFilterChange({});
  };
  
  return (
    <Card className="mb-4 shadow-sm border-border/40">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="تحديد فترة الأرباح"
              className="w-full"
            />
          </div>
          
          <div>
            <Button 
              variant="outline" 
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {isFilterExpanded ? "إخفاء الخيارات المتقدمة" : "خيارات متقدمة"}
            </Button>
          </div>
          
          <Button variant="default" onClick={handleApplyFilter} className="gap-2">
            <Search className="h-4 w-4" />
            تصفية
          </Button>
          
          <Button variant="ghost" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            إعادة ضبط
          </Button>
        </div>
        
        {isFilterExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label htmlFor="customer">العميل</Label>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="جميع العملاء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع العملاء</SelectItem>
                  {parties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="minProfit">الحد الأدنى للربح</Label>
              <Input
                id="minProfit"
                type="number"
                value={minProfit}
                onChange={(e) => setMinProfit(e.target.value)}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label htmlFor="maxProfit">الحد الأقصى للربح</Label>
              <Input
                id="maxProfit"
                type="number"
                value={maxProfit}
                onChange={(e) => setMaxProfit(e.target.value)}
                placeholder="أقصى ربح"
              />
            </div>
            
            <div>
              <Label htmlFor="sortBy">ترتيب حسب</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">التاريخ</SelectItem>
                  <SelectItem value="profit_amount">مبلغ الربح</SelectItem>
                  <SelectItem value="profit_percentage">نسبة الربح</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="sortOrder">اتجاه الترتيب</Label>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
                <SelectTrigger id="sortOrder">
                  <SelectValue placeholder="اتجاه الترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">تنازلي</SelectItem>
                  <SelectItem value="asc">تصاعدي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfitFilter;
