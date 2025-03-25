
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { useQuery } from '@tanstack/react-query';
import CommercialService, { LedgerEntry } from '@/services/CommercialService';
import PartyService, { Party } from '@/services/PartyService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const AccountStatements = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    partyType: 'all'
  });
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setDate(1)));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  const commercialService = CommercialService.getInstance();
  const partyService = PartyService.getInstance();
  
  const { data: ledgerEntries, isLoading: isLoadingLedger, refetch: refetchLedger } = useQuery({
    queryKey: ['ledger', filters],
    queryFn: () => commercialService.getLedgerEntries(filters),
    enabled: true,
  });
  
  const { data: parties, isLoading: isLoadingParties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
  });
  
  const filteredEntries = React.useMemo(() => {
    if (!ledgerEntries) return [];
    
    if (searchQuery.trim() === '') {
      return ledgerEntries;
    }
    
    const query = searchQuery.toLowerCase();
    return ledgerEntries.filter(entry => 
      entry.party_name?.toLowerCase().includes(query) ||
      entry.transaction_type?.toLowerCase().includes(query) ||
      String(entry.debit).includes(query) ||
      String(entry.credit).includes(query)
    );
  }, [ledgerEntries, searchQuery]);
  
  const applyFilters = () => {
    if (startDate) {
      filters.startDate = format(startDate, 'yyyy-MM-dd');
    }
    if (endDate) {
      filters.endDate = format(endDate, 'yyyy-MM-dd');
    }
    
    setFilters({ ...filters });
    refetchLedger();
  };
  
  const getTransactionTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'sale_invoice': 'فاتورة مبيعات',
      'purchase_invoice': 'فاتورة مشتريات',
      'payment_received': 'دفعة مستلمة',
      'payment_made': 'دفعة مدفوعة',
      'sales_return': 'مرتجع مبيعات',
      'purchase_return': 'مرتجع مشتريات',
      'opening_balance': 'رصيد افتتاحي',
      'cancel_sale_invoice': 'إلغاء فاتورة مبيعات',
      'cancel_purchase_invoice': 'إلغاء فاتورة مشتريات',
      'invoice_amount_adjustment': 'تعديل قيمة فاتورة',
      'opening_balance_update': 'تعديل الرصيد الافتتاحي'
    };
    
    return types[type] || type;
  };
  
  if (isLoadingLedger || isLoadingParties) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-row items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">كشوف الحسابات</h1>
              <p className="text-muted-foreground">عرض وتصفية حركات الحسابات</p>
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">كشوف الحسابات</h1>
            <p className="text-muted-foreground">عرض وتصفية حركات الحسابات</p>
          </div>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold">سجل الحركات المالية</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الحركات المالية..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="ml-2 h-4 w-4" />
                    تصفية
                  </Button>
                </SheetTrigger>
                <SheetContent position="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>تصفية البيانات</SheetTitle>
                    <SheetDescription>
                      حدد الفترة الزمنية ونوع الحسابات لعرض كشف الحساب
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="party-type">نوع الحساب</Label>
                      <Select
                        value={filters.partyType}
                        onValueChange={(value) => setFilters({...filters, partyType: value})}
                      >
                        <SelectTrigger id="party-type">
                          <SelectValue placeholder="اختر نوع الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الجميع</SelectItem>
                          <SelectItem value="customer">العملاء</SelectItem>
                          <SelectItem value="supplier">الموردين</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>من تاريخ</Label>
                      <DatePicker date={startDate} setDate={setStartDate} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>إلى تاريخ</Label>
                      <DatePicker date={endDate} setDate={setEndDate} />
                    </div>
                  </div>
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button onClick={applyFilters}>تطبيق الفلتر</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
              
              <Button variant="outline" size="icon">
                <FileDown className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الطرف</TableHead>
                    <TableHead>نوع المعاملة</TableHead>
                    <TableHead>المرجع</TableHead>
                    <TableHead className="text-center">مدين</TableHead>
                    <TableHead className="text-center">دائن</TableHead>
                    <TableHead className="text-left">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.date), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="font-medium">{entry.party_name}</TableCell>
                        <TableCell>{getTransactionTypeLabel(entry.transaction_type)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.transaction_id ? entry.transaction_id.substring(0, 8) + '...' : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-left font-medium">
                          {entry.balance_after.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        لا توجد حركات مالية للعرض
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default AccountStatements;
