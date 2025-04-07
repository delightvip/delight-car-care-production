
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateDownloadButtonProps {
  templateType: 'raw_materials' | 'semi_finished' | 'packaging' | 'finished_products';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const TemplateDownloadButton: React.FC<TemplateDownloadButtonProps> = ({
  templateType,
  variant = 'outline',
  size = 'sm'
}) => {
  const getTemplateData = () => {
    // Define column headers based on item type
    let headers: string[] = [];
    let sampleData: string[][] = [];
    
    switch (templateType) {
      case 'raw_materials':
        headers = ['code', 'name', 'unit', 'quantity', 'min_stock', 'unit_cost'];
        sampleData = [
          ['RM001', 'مادة خام 1', 'كجم', '100', '20', '15.5'],
          ['RM002', 'مادة خام 2', 'لتر', '50', '10', '25.75']
        ];
        break;
      case 'semi_finished':
        headers = ['code', 'name', 'unit', 'quantity', 'min_stock', 'unit_cost'];
        sampleData = [
          ['SF001', 'منتج نصف مصنع 1', 'كجم', '30', '10', '50.0'],
          ['SF002', 'منتج نصف مصنع 2', 'قطعة', '25', '5', '45.25']
        ];
        break;
      case 'packaging':
        headers = ['code', 'name', 'unit', 'quantity', 'min_stock', 'unit_cost'];
        sampleData = [
          ['PK001', 'عبوة 1', 'قطعة', '200', '50', '2.5'],
          ['PK002', 'غلاف كرتون', 'قطعة', '150', '30', '3.75']
        ];
        break;
      case 'finished_products':
        headers = ['code', 'name', 'unit', 'quantity', 'min_stock', 'unit_cost', 'sales_price'];
        sampleData = [
          ['FP001', 'منتج نهائي 1', 'قطعة', '20', '5', '75.0', '125.0'],
          ['FP002', 'منتج نهائي 2', 'عبوة', '15', '3', '85.5', '150.0']
        ];
        break;
    }
    
    // Create CSV format
    const csvData = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');
    
    return {
      data: csvData,
      filename: `قالب_${getTemplateTypeName()}.csv`
    };
  };
  
  const getTemplateTypeName = () => {
    switch (templateType) {
      case 'raw_materials':
        return 'المواد_الخام';
      case 'semi_finished':
        return 'المنتجات_النصف_مصنعة';
      case 'packaging':
        return 'مستلزمات_التعبئة';
      case 'finished_products':
        return 'المنتجات_النهائية';
    }
  };
  
  const handleDownload = () => {
    const { data, filename } = getTemplateData();
    
    // Create a blob and trigger download
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`تم تحميل قالب ${getTemplateTypeName()} بنجاح`);
  };
  
  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleDownload}
      className="flex items-center gap-2"
    >
      <Download size={16} />
      <span>تحميل القالب</span>
    </Button>
  );
};

export default TemplateDownloadButton;
