import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon } from '@radix-ui/react-icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { useForm } from "react-hook-form"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Party } from '@/services/PartyService';
import PartyService from '@/services/PartyService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import LedgerService from '@/services/commercial/LedgerService';
import LedgerReportService from '@/services/commercial/LedgerReportService';

const formSchema = z.object({
  startDate: z.date({
    required_error: "A date is required.",
  }),
  endDate: z.date({
    required_error: "A date is required.",
  }),
})

const CommercialLedger = () => {
  const [partyId, setPartyId] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  const ledgerService = LedgerService.getInstance();
  const ledgerReportService = LedgerReportService.getInstance();
  const partyService = PartyService.getInstance();
  
  const { data: parties, isLoading: isLoadingParties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
    },
  })
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    setStartDate(values.startDate);
    setEndDate(values.endDate);
    loadLedgerData(partyId, values.startDate, values.endDate);
  }
  
  useEffect(() => {
    if (partyId && startDate && endDate) {
      loadLedgerData(partyId, startDate, endDate);
    }
  }, [partyId]);
  
  const loadLedgerData = async (partyId: string, startDate: Date, endDate: Date) => {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const data = await ledgerService.getLedgerEntries(partyId, formattedStartDate, formattedEndDate);
      setLedgerData(data);
    } catch (error) {
      console.error('Error loading ledger data:', error);
      toast.error('Failed to load ledger data');
    }
  };
  
  const handlePartyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPartyId(e.target.value);
    if (startDate && endDate) {
      loadLedgerData(e.target.value, startDate, endDate);
    }
  };
  
  const exportToCSV = async () => {
    if (!partyId) {
      toast.error('Please select a party to export ledger data.');
      return;
    }
    
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates to export ledger data.');
      return;
    }
    
    setIsExporting(true);
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const csvData = await ledgerReportService.exportLedgerToCSV(partyId, formattedStartDate, formattedEndDate);
      
      if (!csvData) {
        toast.error('No data to export.');
        return;
      }
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Ledger data exported to CSV.');
    } catch (error) {
      console.error('Error exporting ledger to CSV:', error);
      toast.error('Failed to export ledger data to CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>سجل الحسابات</CardTitle>
          <CardDescription>
            عرض وتصدير سجل الحسابات لطرف تجاري محدد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="party">الطرف التجاري</Label>
                <select
                  id="party"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={partyId}
                  onChange={handlePartyChange}
                >
                  <option value="">اختر طرف تجاري</option>
                  {parties?.map((party: Party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
              </div>
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ البداية</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", {locale: ar})
                            ) : (
                              <span>اختر تاريخ البداية</span>
                            )}
                            <CalendarIcon className="mr-4 h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          locale={ar}
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      اختر تاريخ بداية الفترة.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ النهاية</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", {locale: ar})
                            ) : (
                              <span>اختر تاريخ النهاية</span>
                            )}
                            <CalendarIcon className="mr-4 h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          locale={ar}
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      اختر تاريخ نهاية الفترة.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit">تحديث السجل</Button>
          </form>
          
          {ledgerData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full leading-normal">
                <thead>
                  <tr>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      التاريخ
                    </th>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      نوع المعاملة
                    </th>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      مدين
                    </th>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      دائن
                    </th>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      الرصيد
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.map((entry, index) => (
                    <tr key={index}>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        {format(new Date(entry.date), 'yyyy-MM-dd')}
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        {entry.transaction_type}
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        {entry.debit}
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        {entry.credit}
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        {entry.balance_after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <div className="p-4">
          <Button 
            onClick={exportToCSV} 
            disabled={isExporting}
            variant="outline"
          >
            {isExporting ? "جاري التصدير..." : (
              <>
                <FileDown className="h-4 w-4 ml-2" />
                تصدير CSV
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CommercialLedger;
