
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportPackagingMaterialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PackagingMaterialImport {
  name: string;
  unit: string;
  unit_cost: number;
  quantity: number;
  min_stock: number;
}

const ImportPackagingMaterialsDialog: React.FC<ImportPackagingMaterialsDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();
  
  const importMutation = useMutation({
    mutationFn: async (materials: PackagingMaterialImport[]) => {
      // Generate codes for the materials
      const { data: maxCodeData } = await supabase
        .from('packaging_materials')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
      
      let lastNum = 0;
      if (maxCodeData && maxCodeData.length > 0) {
        const codeParts = maxCodeData[0].code.split('-');
        if (codeParts.length > 1) {
          lastNum = parseInt(codeParts[1]);
        }
      }
      
      // Prepare the materials with codes
      const materialsWithCodes = materials.map((material, index) => {
        const codeNum = lastNum + index + 1;
        return {
          ...material,
          code: `PKG-${String(codeNum).padStart(5, '0')}`,
          importance: 0
        };
      });
      
      // Insert the materials
      const { data, error } = await supabase
        .from('packaging_materials')
        .insert(materialsWithCodes)
        .select();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success(`تم استيراد ${data.length} مستلزم بنجاح`);
      setFile(null);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`حدث خطأ أثناء الاستيراد: ${error.message}`);
    },
    onSettled: () => {
      setImporting(false);
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleImport = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً');
      return;
    }
    
    setImporting(true);
    
    try {
      const data = await readExcelFile(file);
      importMutation.mutate(data);
    } catch (error) {
      toast.error(`حدث خطأ أثناء قراءة الملف: ${(error as Error).message}`);
      setImporting(false);
    }
  };
  
  const readExcelFile = (file: File): Promise<PackagingMaterialImport[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Map Excel column names to our schema
          const materials = jsonData.map((row: any) => ({
            name: row['اسم المستلزم'] || row['name'] || '',
            unit: row['وحدة القياس'] || row['unit'] || '',
            unit_cost: Number(row['سعر الوحدة'] || row['unit_cost'] || 0),
            quantity: Number(row['الكمية'] || row['quantity'] || 0),
            min_stock: Number(row['الحد الأدنى'] || row['min_stock'] || 0)
          }));
          
          // Validate the data
          const validMaterials = materials.filter(m => 
            m.name && m.unit && !isNaN(m.unit_cost) && !isNaN(m.quantity) && !isNaN(m.min_stock)
          );
          
          if (validMaterials.length === 0) {
            reject(new Error('لم يتم العثور على بيانات صالحة في الملف'));
            return;
          }
          
          resolve(validMaterials);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsBinaryString(file);
    });
  };
  
  const downloadTemplate = () => {
    // Create a template workbook
    const worksheet = XLSX.utils.json_to_sheet([{
      'اسم المستلزم': 'علبة بلاستيك',
      'وحدة القياس': 'قطعة',
      'سعر الوحدة': 5,
      'الكمية': 100,
      'الحد الأدنى': 20
    }]);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'مستلزمات التعبئة');
    
    // Generate the Excel file
    XLSX.writeFile(workbook, 'نموذج_استيراد_مستلزمات_التعبئة.xlsx');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>استيراد مستلزمات التعبئة</DialogTitle>
          <DialogDescription>
            قم بتحميل ملف Excel يحتوي على بيانات مستلزمات التعبئة
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="border rounded-md p-6 text-center">
            <div className="mb-4">
              <FileUp className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                {file ? file.name : 'اختر ملف Excel أو CSV لاستيراده'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                يجب أن يحتوي الملف على الأعمدة التالية: اسم المستلزم، وحدة القياس، سعر الوحدة، الكمية، الحد الأدنى للمخزون
              </p>
            </div>
            
            {!file && (
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="mt-2">
                  <Button variant="outline" className="w-full max-w-xs mx-auto" size="sm">
                    <FileUp size={16} className="mr-2" />
                    اختيار ملف
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </label>
            )}
            
            {file && (
              <div className="mt-2 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? 'جاري الاستيراد...' : 'استيراد'}
                </Button>
              </div>
            )}
          </div>
          
          <div className="bg-muted/50 rounded-md p-4">
            <h4 className="text-sm font-medium mb-2">تنسيق الملف</h4>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>يجب أن يكون الملف بتنسيق Excel (.xlsx, .xls) أو CSV (.csv)</li>
              <li>يجب أن يحتوي الصف الأول على أسماء الأعمدة</li>
              <li>سيتم توليد كود المستلزم تلقائيًا لكل مستلزم جديد</li>
              <li>يتم تعيين قيمة الأهمية تلقائيًا إلى 0 للمستلزمات الجديدة</li>
            </ul>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">تحميل نموذج</h4>
              <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadTemplate}>
                تحميل ملف نموذجي (.xlsx)
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportPackagingMaterialsDialog;
