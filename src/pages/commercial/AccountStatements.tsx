import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Download, Search, FileText, ArrowUpDown } from 'lucide-react';
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
import PartyService from '@/services/PartyService';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AccountStatements = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [partyType, setPartyType] = useState('all');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [ledgerFilters, setLedgerFilters] = useState<any>({});
  const [isFiltering, setIsFiltering] = useState(false);
  
  const navigate = useNavigate();
  const commercialService = CommercialService.getInstance();
  const partyService = PartyService.getInstance();
  
  const { data: parties, isLoading: isLoadingParties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
  });
  
  const { data: ledgerEntries, isLoading } = useQuery({
    queryKey: ['ledger', dateRange, partyType, selectedPartyId, sortDirection, ledgerFilters],
    queryFn: () => commercialService.getLedgerEntries({
      startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      partyType: partyType !== 'all' ? partyType : undefined,
      ...ledgerFilters
    }),
  });
  
  const filteredByParty = React.useMemo(() => {
    if (!ledgerEntries) return [];
    
    if (selectedPartyId) {
      return ledgerEntries.filter(entry => entry.party_id === selectedPartyId);
    }
    
    return ledgerEntries;
  }, [ledgerEntries, selectedPartyId]);
  
  const filteredEntries = React.useMemo(() => {
    if (!filteredByParty) return [];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return filteredByParty.filter(entry => 
        entry.party_name?.toLowerCase().includes(query) ||
        entry.transaction_type.toLowerCase().includes(query) ||
        entry.transaction_id.toLowerCase().includes(query)
      );
    }
    
    return filteredByParty;
  }, [filteredByParty, searchQuery]);
  
  const sortedEntries = React.useMemo(() => {
    if (!filteredEntries) return [];
    
    return [...filteredEntries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - a;
    });
  }, [filteredEntries, sortDirection]);
  
  const accountSummary = React.useMemo(() => {
    if (!sortedEntries || sortedEntries.length === 0) {
      return {
        totalDebit: 0,
        totalCredit: 0,
        balance: 0
      };
    }
    
    const totalDebit = sortedEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = sortedEntries.reduce((sum, entry) => sum + entry.credit, 0);
    const balance = totalDebit - totalCredit;
    
    return {
      totalDebit,
      totalCredit,
      balance
    };
  }, [sortedEntries]);
  
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  const handleResetFilters = () => {
    setDateRange(undefined);
    setPartyType('all');
    setSelectedPartyId(null);
    setSearchQuery('');
    setLedgerFilters({});
    setIsFiltering(false);
  };
  
  const handleExportData = () => {
    toast.info('سيتم دعم تصدير البيانات قريباً');
  };
  
  const getTransactionTypeName = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'فاتورة';
      case 'payment':
        return 'دفعة';
      case 'return':
        return 'مرتجع';
      case 'opening_balance':
        return 'رصيد افتتاحي';
      case 'invoice_cancellation':
        return 'إلغاء فاتورة';
      case 'payment_cancellation':
        return 'إلغاء دفعة';
      case 'return_cancellation':
        return 'إلغاء مرتجع';
      default:
        return type;
    }
  };
  
  const getTransactionLink = (entry: any) => {
    if (!entry.transaction_id) return null;
    
    switch (entry.transaction_type) {
      case 'invoice':
      case 'invoice_cancellation':
        return `/commercial/invoices/${entry.transaction_id}`;
      case 'payment':
      case 'payment_cancellation':
        return `/commercial/payments?id=${entry.transaction_id}`;
      case 'return':
      case 'return_cancellation':
        return `/commercial/returns?id=${entry.transaction_id}`;
      default:
        return null;
    }
  };
  
  const filterLedger = (filters: any) => {
    setLedgerFilters(filters);
    setIsFiltering(true);
    
    if (selectedParty) {
      refetchLedger(selectedParty.id);
    }
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">كشوف الحسابات</h1>
            <p className="text-muted-foreground">متابعة حركة حسابات العملاء والموردين</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleResetFilters}>
              إعادة تعيين الفلاتر
            </Button>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="ml-2 h-4 w-4" />
              تصدير البيانات
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={partyType} onValueChange={setPartyType}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="customer">عملاء</TabsTrigger>
            <TabsTrigger value="supplier">موردين</TabsTrigger>
          </TabsList>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
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
                <Button variant="outline" className="w-full justify-start text-right">
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
            
            <Select value={selectedPartyId || ''} onValueChange={setSelectedPartyId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر طرف محدد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الأطراف</SelectItem>
                {parties && parties.map(party => (
                  <SelectItem key={party.id} value={party.id}>
                    {party.name} ({party.type === 'customer' ? 'عميل' : party.type === 'supplier' ? 'مورد' : 'أخرى'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">
                    {partyType === 'all' ? 'جميع المعاملات' :
                    partyType === 'customer' ? 'معاملات العملاء' : 'معاملات الموردين'}
                  </CardTitle>
                  <CardDescription>
                    {selectedPartyId && parties
                      ? `كشف حساب: ${parties.find(p => p.id === selectedPartyId)?.name || ''}`
                      : 'كشف حساب لجميع الأطراف'}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={toggleSortDirection}
                  className="flex items-center gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  ترتيب {sortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الطرف</TableHead>
                      <TableHead>نوع المعاملة</TableHead>
                      <TableHead>المرجع</TableHead>
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
                    ) : sortedEntries.length > 0 ? (
                      sortedEntries.map((entry) => (
                        <TableRow key={`${entry.id}-${entry.transaction_id}`}>
                          <TableCell>
                            {format(new Date(entry.date), 'yyyy-MM-dd')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{entry.party_name}</span>
                              <Badge variant="outline" className="w-fit mt-1">
                                {entry.party_type === 'customer' ? 'عميل' : 'مورد'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              entry.transaction_type.includes('cancellation') 
                                ? 'destructive'
                                : entry.transaction_type === 'payment'
                                ? 'default'
                                : entry.transaction_type === 'invoice'
                                ? 'secondary'
                                : 'outline'
                            }>
                              {getTransactionTypeName(entry.transaction_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.transaction_id ? (
                              <Button 
                                variant="link" 
                                className="p-0 h-8"
                                onClick={() => {
                                  const link = getTransactionLink(entry);
                                  if (link) navigate(link);
                                }}
                              >
                                <FileText className="mr-1 h-3.5 w-3.5" />
                                {entry.transaction_id.substring(0, 8)}...
                              </Button>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${entry.balance_after > 0 ? 'text-red-600' : entry.balance_after < 0 ? 'text-green-600' : ''}`}>
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
                  {sortedEntries.length > 0 && (
                    <tfoot>
                      <TableRow className="border-t-2 font-bold">
                        <TableCell colSpan={4} className="text-left">الإجمالي</TableCell>
                        <TableCell className="text-right">{accountSummary.totalDebit.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{accountSummary.totalCredit.toFixed(2)}</TableCell>
                        <TableCell className={`text-right ${accountSummary.balance > 0 ? 'text-red-600' : accountSummary.balance < 0 ? 'text-green-600' : ''}`}>
                          {accountSummary.balance.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </tfoot>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default AccountStatements;
