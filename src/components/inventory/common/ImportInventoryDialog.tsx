
import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TemplateDownloadButton from './TemplateDownloadButton';
import InventoryService from '@/services/InventoryService';

interface ImportInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'raw_materials' | 'semi_finished' | 'packaging' | 'finished_products';
  title: string;
  description: string;
  onSuccess?: () => void;
}

const ImportInventoryDialog: React.FC<ImportInventoryDialogProps> = ({
  isOpen,
  onClose,
  itemType,
  title,
  description,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [hasValidationErrors, setHasValidationErrors] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  
  const inventoryService = InventoryService.getInstance();

  const resetState = () => {
    setFile(null);
    setPreviewData([]);
    setHasValidationErrors(false);
    setValidationErrors([]);
    setActiveTab('upload');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Parse the file to preview and validate
      parseFile(selectedFile);
    }
  };
  
  const parseFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          // Preview first 5 rows
          const preview = results.data.slice(0, 5);
          setPreviewData(preview);
          
          // Validate the file
          validateData(results.data);
        } else {
          setHasValidationErrors(true);
          setValidationErrors(['الملف فارغ أو لا يحتوي على بيانات صالحة']);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setHasValidationErrors(true);
        setValidationErrors(['حدث خطأ أثناء تحليل الملف. تأكد من أن الملف بتنسيق CSV صالح.']);
      }
    });
  };
  
  const validateData = (data: any[]) => {
    const errors: string[] = [];
    const requiredFields = getRequiredFields();
    
    // Check if all required fields are present
    const firstRow = data[0];
    const missingFields = requiredFields.filter(field => !firstRow.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      errors.push(`الحقول التالية مفقودة: ${missingFields.join(', ')}`);
    }
    
    // Validate data types and required values
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Validate code exists and is unique
      if (!row.code || row.code.trim() === '') {
        errors.push(`الصف ${i + 1}: الكود مطلوب`);
      }
      
      // Validate name exists
      if (!row.name || row.name.trim() === '') {
        errors.push(`الصف ${i + 1}: الاسم مطلوب`);
      }
      
      // Validate unit exists
      if (!row.unit || row.unit.trim() === '') {
        errors.push(`الصف ${i + 1}: الوحدة مطلوبة`);
      }
      
      // Validate numeric fields
      const numericFields = ['quantity', 'min_stock', 'unit_cost'];
      if (itemType === 'finished_products') {
        numericFields.push('sales_price');
      }
      
      for (const field of numericFields) {
        if (row[field] !== undefined) {
          const value = parseFloat(row[field]);
          if (isNaN(value)) {
            errors.push(`الصف ${i + 1}: الحقل ${field} يجب أن يكون رقم`);
          } else if (field !== 'min_stock' && value < 0) {
            errors.push(`الصف ${i + 1}: الحقل ${field} يجب أن يكون أكبر من أو يساوي صفر`);
          }
        }
      }
      
      // Limit to 10 errors to avoid overwhelming the user
      if (errors.length >= 10) {
        errors.push('... وأخطاء أخرى (تم عرض أول 10 أخطاء فقط)');
        break;
      }
    }
    
    setValidationErrors(errors);
    setHasValidationErrors(errors.length > 0);
    
    if (errors.length === 0) {
      setActiveTab('preview');
    }
  };
  
  const getRequiredFields = () => {
    switch (itemType) {
      case 'raw_materials':
      case 'semi_finished':
      case 'packaging':
        return ['code', 'name', 'unit', 'quantity', 'min_stock', 'unit_cost'];
      case 'finished_products':
        return ['code', 'name', 'unit', 'quantity', 'min_stock', 'unit_cost', 'sales_price'];
      default:
        return [];
    }
  };
  
  const handleImport = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      // Parse the full file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const items = results.data;
          
          let importSuccess = false;
          switch (itemType) {
            case 'raw_materials':
              importSuccess = await importRawMaterials(items);
              break;
            case 'semi_finished':
              importSuccess = await importSemiFinished(items);
              break;
            case 'packaging':
              importSuccess = await importPackaging(items);
              break;
            case 'finished_products':
              importSuccess = await importFinishedProducts(items);
              break;
          }
          
          setIsLoading(false);
          
          if (importSuccess) {
            toast.success(`تم استيراد ${items.length} عنصر بنجاح`);
            resetState();
            onClose();
            if (onSuccess) {
              onSuccess();
            }
          } else {
            toast.error('حدث خطأ أثناء استيراد البيانات');
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          toast.error('حدث خطأ أثناء تحليل الملف');
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Import error:', error);
      toast.error('حدث خطأ أثناء استيراد البيانات');
      setIsLoading(false);
    }
  };
  
  const importRawMaterials = async (items: any[]) => {
    let addedCount = 0;
    try {
      for (const item of items) {
        const rawMaterial = {
          code: item.code.trim(),
          name: item.name.trim(),
          unit: item.unit.trim(),
          quantity: parseFloat(item.quantity) || 0,
          min_stock: parseFloat(item.min_stock) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0
        };
        
        const result = await inventoryService.addRawMaterial(rawMaterial);
        if (result) {
          addedCount++;
        }
      }
      
      return addedCount > 0;
    } catch (error) {
      console.error('Error importing raw materials:', error);
      return false;
    }
  };
  
  const importSemiFinished = async (items: any[]) => {
    let addedCount = 0;
    try {
      for (const item of items) {
        const semiFinished = {
          code: item.code.trim(),
          name: item.name.trim(),
          unit: item.unit.trim(),
          quantity: parseFloat(item.quantity) || 0,
          min_stock: parseFloat(item.min_stock) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0
        };
        
        const result = await inventoryService.addSemiFinishedProduct(semiFinished);
        if (result) {
          addedCount++;
        }
      }
      
      return addedCount > 0;
    } catch (error) {
      console.error('Error importing semi-finished products:', error);
      return false;
    }
  };
  
  const importPackaging = async (items: any[]) => {
    let addedCount = 0;
    try {
      for (const item of items) {
        const packaging = {
          code: item.code.trim(),
          name: item.name.trim(),
          unit: item.unit.trim(),
          quantity: parseFloat(item.quantity) || 0,
          min_stock: parseFloat(item.min_stock) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0
        };
        
        const result = await inventoryService.addPackagingMaterial(packaging);
        if (result) {
          addedCount++;
        }
      }
      
      return addedCount > 0;
    } catch (error) {
      console.error('Error importing packaging materials:', error);
      return false;
    }
  };
  
  const importFinishedProducts = async (items: any[]) => {
    // For finished products, we need to implement special handling
    // as they require semi-finished products to be assigned
    toast.info('استيراد المنتجات النهائية يتطلب إعداد إضافي، يرجى إضافتها يدويًا حاليًا');
    return false;
  };
  
  const renderPreviewTable = () => {
    if (!previewData || previewData.length === 0) {
      return <p className="text-center text-muted-foreground">لا توجد بيانات للعرض</p>;
    }
    
    const columns = Object.keys(previewData[0]);
    
    return (
      <div className="overflow-x-auto max-h-[300px] border rounded-md">
        <table className="w-full min-w-full table-auto">
          <thead className="bg-muted sticky top-0">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                {columns.map((column) => (
                  <td key={`${rowIndex}-${column}`} className="px-4 py-2 text-sm border-t">
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="upload">رفع الملف</TabsTrigger>
            <TabsTrigger value="preview" disabled={!file || hasValidationErrors}>
              معاينة البيانات
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">اختر ملف CSV أو Excel للاستيراد</h3>
                <p className="text-xs text-muted-foreground">
                  يجب أن يحتوي الملف على الأعمدة المطلوبة (الكود، الاسم، الوحدة، الكمية، الحد الأدنى، التكلفة)
                </p>
              </div>
              
              <TemplateDownloadButton templateType={itemType} />
            </div>
            
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="mt-2"
            />
            
            {hasValidationErrors && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">توجد أخطاء في الملف:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">معاينة البيانات (أول 5 صفوف)</h3>
              {renderPreviewTable()}
              <p className="text-xs text-muted-foreground mt-2">
                * هذه معاينة أولية للبيانات. سيتم استيراد كافة البيانات عند النقر على زر "استيراد".
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || hasValidationErrors || isLoading}
            className="flex items-center gap-2"
          >
            <Upload size={16} />
            {isLoading ? "جاري المعالجة..." : "استيراد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportInventoryDialog;
