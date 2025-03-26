
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { returnFormSchema, ReturnFormValues, ReturnFormItem } from '@/components/commercial/ReturnFormTypes';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import PartyService from '@/services/PartyService';
import CommercialService from '@/services/CommercialService';
import InventoryService from '@/services/InventoryService';
import { useQuery } from '@tanstack/react-query';

interface ReturnsFormProps {
  onSubmit: (values: ReturnFormValues) => Promise<void>;
}

const ReturnsForm: React.FC<ReturnsFormProps> = ({ onSubmit }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<ReturnFormItem[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<ReturnFormItem[]>([]);
  const [isInvoiceRequired, setIsInvoiceRequired] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  
  // Use the imported InventoryService directly (it's a singleton instance)
  const inventoryService = InventoryService;
  const partyService = PartyService.getInstance();
  const commercialService = CommercialService.getInstance();
  
  const { data: rawMaterials } = useQuery({
    queryKey: ['raw_materials'],
    queryFn: () => inventoryService.getRawMaterials(),
  });
  
  const { data: packagingMaterials } = useQuery({
    queryKey: ['packaging_materials'],
    queryFn: () => inventoryService.getPackagingMaterials(),
  });
  
  const { data: semiFinishedProducts } = useQuery({
    queryKey: ['semi_finished_products'],
    queryFn: () => inventoryService.getSemiFinishedProducts(),
  });
  
  const { data: finishedProducts } = useQuery({
    queryKey: ['finished_products'],
    queryFn: () => inventoryService.getFinishedProducts(),
  });
  
  const { data: parties } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
  });
  
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => commercialService.getInvoices(),
  });

  useEffect(() => {
    if (rawMaterials && packagingMaterials && semiFinishedProducts && finishedProducts) {
      const allItems = [
        ...rawMaterials.map(item => ({ 
          item_type: 'raw_materials' as const, 
          item_name: item.name, 
          item_id: item.id,
          quantity: 0,
          unit_price: item.unit_cost || 0,
          selected: false
        })),
        ...packagingMaterials.map(item => ({ 
          item_type: 'packaging_materials' as const, 
          item_name: item.name, 
          item_id: item.id,
          quantity: 0,
          unit_price: item.unit_cost || 0,
          selected: false
        })),
        ...semiFinishedProducts.map(item => ({ 
          item_type: 'semi_finished_products' as const, 
          item_name: item.name, 
          item_id: item.id,
          quantity: 0,
          unit_price: item.unit_cost || 0,
          selected: false
        })),
        ...finishedProducts.map(item => ({ 
          item_type: 'finished_products' as const, 
          item_name: item.name, 
          item_id: item.id,
          quantity: 0,
          unit_price: item.unit_cost || 0,
          selected: false
        }))
      ];
      
      setItems(allItems);
    }
  }, [rawMaterials, packagingMaterials, semiFinishedProducts, finishedProducts]);

  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      return_type: 'sales_return',
      date: new Date(),
      amount: 0,
      items: []
    }
  });

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'return_type') {
        setIsInvoiceRequired(value.return_type === 'sales_return');
        form.setValue('invoice_id', undefined);
        form.setValue('party_id', undefined);
        setInvoiceItems([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleInvoiceChange = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    if (invoiceId) {
      try {
        const invoice = await commercialService.getInvoiceById(invoiceId);
        if (invoice) {
          form.setValue('party_id', invoice.party_id);
          const itemsWithMaxQuantity = invoice.items.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            item_type: item.item_type,
            quantity: 0,
            unit_price: item.unit_price,
            selected: false,
            max_quantity: item.quantity,
            invoice_quantity: item.quantity
          }));
          setInvoiceItems(itemsWithMaxQuantity);
        } else {
          toast({
            title: "خطأ",
            description: "الفاتورة غير موجودة",
            variant: "destructive"
          });
          form.setValue('party_id', undefined);
          setInvoiceItems([]);
        }
      } catch (error) {
        console.error("Failed to fetch invoice:", error);
        toast({
          title: "خطأ",
          description: "فشل في جلب الفاتورة",
          variant: "destructive"
        });
        form.setValue('party_id', undefined);
        setInvoiceItems([]);
      }
    } else {
      form.setValue('party_id', undefined);
      setInvoiceItems([]);
    }
  };

  const onSubmitHandler = async (values: ReturnFormValues) => {
    try {
      const selectedItems = invoiceItems.filter(item => item.selected);
      if (selectedItems.length === 0) {
        toast({
          title: "خطأ",
          description: "يجب اختيار صنف واحد على الأقل",
          variant: "destructive"
        });
        return;
      }
      
      const totalAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const returnData = {
        ...values,
        amount: totalAmount,
        payment_status: 'draft' as const, // Add payment_status to match the Return type
        items: selectedItems.map(item => ({
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };
      
      await onSubmit(returnData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء معالجة النموذج",
        variant: "destructive"
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitHandler)} className="space-y-6">
        <FormField
          control={form.control}
          name="return_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع المرتجع</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع المرتجع" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sales_return">مرتجع مبيعات</SelectItem>
                  <SelectItem value="purchase_return">مرتجع مشتريات</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isInvoiceRequired && (
          <FormField
            control={form.control}
            name="invoice_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الفاتورة المرتبطة</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleInvoiceChange(value);
                  }}
                  defaultValue={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر فاتورة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {invoices?.filter(invoice => invoice.invoice_type === 'sale').map(invoice => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.id.substring(0, 8)}... - {invoice.party_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="party_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الطرف</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || ""}
                disabled={true}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الطرف" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {parties?.map(party => (
                    <SelectItem key={party.id} value={party.id}>
                      {party.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>تاريخ المرتجع</FormLabel>
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
                        format(field.value, "yyyy-MM-dd")
                      ) : (
                        <span>اختر تاريخ</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4">
          <Label htmlFor="items">الأصناف</Label>
          <Separator />
          {invoiceItems.length > 0 ? (
            invoiceItems.map((item, index) => (
              <div key={index} className="grid grid-cols-6 gap-2 items-center">
                <div className="col-span-1">
                  <Checkbox
                    checked={Boolean(item.selected)}
                    onCheckedChange={(checked) => {
                      const updatedItems = [...invoiceItems];
                      updatedItems[index] = { ...item, selected: Boolean(checked) };
                      setInvoiceItems(updatedItems);
                    }}
                  />
                </div>
                <Label htmlFor={`items[${index}].selected`} className="col-span-2 text-right">
                  {item.item_name}
                </Label>
                <div className="col-span-3">
                  <Input
                    type="number"
                    defaultValue="0"
                    min="0"
                    max={item.max_quantity}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      const updatedItems = [...invoiceItems];
                      updatedItems[index] = { ...item, quantity: value };
                      setInvoiceItems(updatedItems);
                    }}
                    disabled={!item.selected}
                  />
                </div>
                <Label className="col-span-6 text-right text-muted-foreground">
                  الكمية المتاحة: {item.max_quantity}
                </Label>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground">
              {isInvoiceRequired ? 'اختر فاتورة لعرض الأصناف' : 'اختر نوع المرتجع لعرض الأصناف'}
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ملاحظات</FormLabel>
              <FormControl>
                <Input type="text" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">إضافة مرتجع</Button>
      </form>
    </Form>
  );
};

export { ReturnsForm };
