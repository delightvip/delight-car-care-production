
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Download, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/ui/PageTransition';
import CommercialService from '@/services/CommercialService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';

const AccountStatements = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [partyType, setPartyType] = useState('all');
  
  const commercialService = CommercialService.getInstance();
  
  const { data: ledgerEntries, isLoading } = useQuery({
    queryKey: ['ledger', dateRange, partyType],
    queryFn: () => commercialService.getLedgerEntries({
      startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      partyType: partyType !== 'all' ? partyType : undefined
    }),
  });
  
  const filteredEntries = React.useMemo(() => {
    if (!ledgerEntries) return [];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return ledgerEntries.filter(entry => 
        entry.party_name?.toLowerCase().includes(query) ||
        entry.transaction_type.toLowerCase().includes(query) ||
        entry.transaction_id.toLowerCase().includes(query)
      );
    }
    
    return ledgerEntries;
  }, [ledgerEntries, searchQuery]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">كشوف الحسابات</h1>
            <p className="text-muted-foreground">متابعة حركة حسابات العملاء والموردين</p>
          </div>
          <Button variant="outline">
            <Download className="ml-2 h-4 w-4" />
            تصدير البيانات
          </Button>
        </div>

        <Tabs defaultValue="all" value={partyType} onValueChange={setPartyType}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="customer">عملاء</TabsTrigger>
            <TabsTrigger value="supplier">موردين</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في المعاملات..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[300px] justify-start text-right">
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "yyyy-MM-dd")} إلى{" "}
                        {format(dateRange.to, "yyyy-MM-dd")}
                      </>
                    ) : (
                      format(dateRange.from, "yyyy-MM-dd")
                    )
                  ) : (
                    <span>اختر الفترة</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold">
                {partyType === 'all' ? 'جميع المعاملات' :
                 partyType === 'customer' ? 'معاملات العملاء' : 'معاملات الموردين'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم المعاملة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الطرف</TableHead>
                    <TableHead>نوع المعاملة</TableHead>
                    <TableHead className="text-right">مدين</TableHead>
                    <TableHead className="text-right">دائن</TableHead>
                    <TableHead className="text-right">الرصيد بعد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        جاري تحميل البيانات...
                      </TableCell>
                    </TableRow>
                  ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                      <TableRow key={`${entry.id}-${entry.transaction_id}`}>
                        <TableCell className="font-medium">
                          {entry.transaction_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.date), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{entry.party_name}</span>
                            <Badge variant="outline" className="w-fit mt-1">
                              {entry.party_type === 'customer' ? 'عميل' : 'مورد'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>
                            {entry.transaction_type === 'invoice' && 'فاتورة'}
                            {entry.transaction_type === 'payment' && 'دفعة'}
                            {entry.transaction_type === 'return' && 'مرتجع'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.balance_after.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        لا توجد معاملات للعرض
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default AccountStatements;
