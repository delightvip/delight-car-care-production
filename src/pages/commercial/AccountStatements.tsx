
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
import CommercialService from '@/services/CommercialService';

const formSchema = z.object({
  startDate: z.date({
    required_error: "Please select a start date.",
  }),
  endDate: z.date({
    required_error: "Please select an end date.",
  }),
  partyType: z.string({
    required_error: "Please select a party type.",
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
      const statements = await commercialService.generateAccountStatement(
        params.startDate,
        params.endDate,
        params.partyType
      );
      setReportData(statements);
    } catch (error) {
      console.error('Error generating account statements:', error);
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
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Generate Account Statements</CardTitle>
            <CardDescription>
              Select the date range and party type to generate account statements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
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
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
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
                      <FormLabel>Party Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a party type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? "Generating..." : "Generate Statements"}
                </Button>
              </form>
            </Form>

            {reportData && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold">Report:</h3>
                <p>{reportData.statements?.length || 0} account statements generated.</p>
                {reportData.statements?.map((statement: any, index: number) => (
                  <div key={index} className="mt-4 p-4 border rounded-md">
                    <p><strong>Party:</strong> {statement.party_name}</p>
                    <p><strong>Opening Balance:</strong> {statement.opening_balance.toFixed(2)}</p>
                    <p><strong>Closing Balance:</strong> {statement.closing_balance.toFixed(2)}</p>
                    <p><strong>Total Transactions:</strong> {statement.entries.length}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default AccountStatements;
