
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Download, FileText, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import CommercialService from '@/services/CommercialService';

const formSchema = z.object({
  startDate: z.date({
    required_error: "الرجاء اختيار تاريخ البداية",
  }),
  endDate: z.date({
    required_error: "الرجاء اختيار تاريخ النهاية",
  }),
  partyType: z.string({
    required_error: "الرجاء اختيار نوع الطرف التجاري",
  }),
});

interface AccountStatementsProps {
  // Define any props here
}

const AccountStatements: React.FC<AccountStatementsProps> = () => {
  const [activeTab, setActiveTab] = useState("customers");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const commercialService = CommercialService.getInstance();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      partyType: "customer",
    },
  });
  const generateAccountStatements = async (params: { startDate: string; endDate: string; partyType: string }) => {
    try {
      setIsGenerating(true);
      toast.info('جاري توليد كشوف الحساب...');
      const statements = await commercialService.generateAccountStatement(
        params.startDate,
        params.endDate,
        params.partyType
      );
      
      if (statements && statements.statements && statements.statements.length > 0) {
        setReportData(statements);
        toast.success('تم توليد كشوف الحساب بنجاح');
      } else {
        toast.error('لم يتم العثور على بيانات لكشوف الحساب في هذه الفترة');
      }
    } catch (error) {
      console.error('Error generating account statements:', error);
      toast.error('حدث خطأ أثناء توليد كشوف الحساب');
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const formattedStartDate = format(values.startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(values.endDate, 'yyyy-MM-dd');

    generateAccountStatements({
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      partyType: values.partyType,
    });
  };
  return (
    <PageTransition>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">كشوف الحساب</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">توليد كشوف الحساب</CardTitle>
            <CardDescription>
              حدد نطاق التاريخ ونوع الطرف التجاري لتوليد كشوف الحساب.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (                      <FormItem className="flex flex-col">
                        <FormLabel>تاريخ البداية</FormLabel>
                        <FormControl>
                          <DatePicker
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (                      <FormItem className="flex flex-col">
                        <FormLabel>تاريخ النهاية</FormLabel>
                        <FormControl>
                          <DatePicker
                            selected={field.value}
                            onSelect={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="partyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الطرف التجاري</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع الطرف التجاري" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">عميل</SelectItem>
                          <SelectItem value="supplier">مورّد</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                          <SelectItem value="all">الكل</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isGenerating} className="gap-2">
                  {isGenerating ? 
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      جاري التوليد...
                    </> : 
                    <>
                      <FileText className="h-4 w-4" />
                      توليد كشوف الحساب
                    </>
                  }
                </Button>
              </form>
            </Form>            {reportData && reportData.statements && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">نتائج كشوف الحساب:</h3>
                <p className="mb-4">تم توليد {reportData.statements?.length || 0} كشف حساب.</p>
                
                <div className="space-y-8">
                  {reportData.statements?.map((statement: any, index: number) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-lg font-semibold">{statement.party_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {statement.party_type === 'customer' ? 'عميل' : 
                               statement.party_type === 'supplier' ? 'مورّد' : 'آخر'}
                            </p>
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" className="gap-1">
                                <Printer className="h-4 w-4" />
                                <span>طباعة</span>
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1">
                                <Download className="h-4 w-4" />
                                <span>تصدير</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="p-3 bg-muted/30 rounded-md">
                            <p className="text-sm font-medium">الرصيد الافتتاحي</p>
                            <p className={`text-lg font-semibold ${statement.opening_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.abs(statement.opening_balance).toFixed(2)} 
                              {statement.opening_balance >= 0 ? ' (دائن)' : ' (مدين)'}
                            </p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-md">
                            <p className="text-sm font-medium">إجمالي الحركات</p>
                            <p className="text-lg font-semibold">
                              {statement.entries.length} حركة
                            </p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-md">
                            <p className="text-sm font-medium">الرصيد الختامي</p>
                            <p className={`text-lg font-semibold ${statement.closing_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.abs(statement.closing_balance).toFixed(2)} 
                              {statement.closing_balance >= 0 ? ' (دائن)' : ' (مدين)'}
                            </p>
                          </div>
                        </div>
                        
                        {statement.entries.length > 0 ? (
                          <div className="rounded-md border">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-muted/50 border-b">
                                    <th className="px-4 py-2 text-right">التاريخ</th>
                                    <th className="px-4 py-2 text-right">الوصف</th>
                                    <th className="px-4 py-2 text-right">مدين</th>
                                    <th className="px-4 py-2 text-right">دائن</th>
                                    <th className="px-4 py-2 text-right">الرصيد</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {statement.entries.map((entry: any, entryIndex: number) => (
                                    <tr key={entryIndex} className="border-b">
                                      <td className="px-4 py-2">{format(new Date(entry.date), 'yyyy-MM-dd')}</td>
                                      <td className="px-4 py-2">{entry.description}</td>
                                      <td className="px-4 py-2">{entry.debit ? entry.debit.toFixed(2) : '-'}</td>
                                      <td className="px-4 py-2">{entry.credit ? entry.credit.toFixed(2) : '-'}</td>
                                      <td className="px-4 py-2">
                                        <span className={`${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {Math.abs(entry.balance).toFixed(2)} 
                                          {entry.balance >= 0 ? ' (دائن)' : ' (مدين)'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            لا توجد حركات في الفترة المحددة
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default AccountStatements;
