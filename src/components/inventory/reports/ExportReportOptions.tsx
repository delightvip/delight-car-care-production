import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface ExportOptionsProps {
  inventoryType?: string;
  itemId?: string;
  timeRange?: string;
  reportType?: string;
}

export const ExportReportOptions: React.FC<ExportOptionsProps> = ({
  inventoryType,
  itemId,
  timeRange,
  reportType
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  const formatDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  };
  
  const handleExport = async (format: string) => {
    setIsExporting(true);
    
    try {
      // تحضير معلمات الاستعلام
      const queryParams = {
        inventory_type: inventoryType || 'all',
        item_id: itemId || null,
        time_range: timeRange || 'month',
        report_type: reportType || 'summary'
      };
      
      // في الحالة الحقيقية، هنا سنقوم بإجراء استعلام للحصول على بيانات التقرير
      // ثم تحويلها إلى التنسيق المطلوب
      
      // محاكاة تأخير الاستعلام
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // استخدام toast للإشعار بنجاح التصدير
      const fileName = `inventory_report_${queryParams.inventory_type}_${formatDate()}.${format}`;
      
      toast.success(`تم تصدير التقرير بنجاح: ${fileName}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          تصدير التقرير
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleExport('xlsx')}
          disabled={isExporting}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="ml-2 h-4 w-4" />
          <span>تصدير كملف Excel</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="cursor-pointer"
        >
          <FileText className="ml-2 h-4 w-4" />
          <span>تصدير كملف PDF</span>
        </DropdownMenuItem>      </DropdownMenuContent>
    </DropdownMenu>
  );
};
