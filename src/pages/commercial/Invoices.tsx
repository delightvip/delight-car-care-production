import React from 'react';
// Update the import to use the correct types file
import { Invoice } from '@/services/CommercialTypes';
import PageTransition from '@/components/ui/PageTransition';
import { useQuery } from '@tanstack/react-query';
import InvoiceService from '@/services/commercial/invoice/InvoiceService';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton";

const Invoices = () => {
  const invoiceService = InvoiceService.getInstance();
  
  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceService.getInvoices(),
  });
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">الفواتير</h2>
            <p className="text-muted-foreground">
              قائمة بجميع الفواتير الصادرة والواردة
            </p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:rtl:space-x-reverse">
            <Button asChild>
              <Link to="/commercial/invoices/create" className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة فاتورة جديدة
              </Link>
            </Button>
            <Button
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>الفواتير</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Card>
          <CardHeader>
            <CardTitle>قائمة الفواتير</CardTitle>
            <CardDescription>
              جميع الفواتير المسجلة في النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">رقم الفاتورة</TableHead>
                    <TableHead>العميل/المورد</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-right">الخيارات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <>
                      {/* Skeleton Rows */}
                      {[...Array(5)].map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton className="h-4 w-[100px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[150px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[80px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[80px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[100px]" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="h-4 w-[50px] ml-auto" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : invoices && invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{invoice.party_name}</TableCell>
                        <TableCell>{format(new Date(invoice.date), 'dd MMM yyyy', { locale: ar })}</TableCell>
                        <TableCell>{invoice.total_amount}</TableCell>
                        <TableCell>{invoice.status}</TableCell>
                        <TableCell className="text-right">
                          <Link to={`/commercial/invoices/${invoice.id}`} className="text-blue-500 hover:underline">
                            عرض التفاصيل
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">لا توجد فواتير</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Invoices;
