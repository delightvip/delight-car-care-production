
import React, { useState } from 'react';
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
import { Upload, Download, Info } from 'lucide-react';
import { ImportItemType, processImportFile } from '@/utils/importUtils';
import { exportTemplate } from '@/utils/exportUtils';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (file: File) => void;
  title: string;
  description: string;
  acceptedFileTypes?: string;
  itemType?: ImportItemType;
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  title,
  description,
  acceptedFileTypes = ".xlsx,.xls,.csv",
  itemType = 'raw-materials'
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    if (itemType) {
      exportTemplate(itemType);
      enhancedToast.info('تم تنزيل نموذج الاستيراد');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      if (onImport) {
        await onImport(file);
        setIsLoading(false);
        onClose();
        return;
      }
      
      // Process the file using our utility
      const importData = await processImportFile(file, itemType);
      
      if (importData.length === 0) {
        setIsLoading(false);
        return; // Error already shown in processImportFile
      }
      
      // Based on item type, insert into appropriate table
      let result;
      
      switch (itemType) {
        case 'raw-materials':
          result = await supabase
            .from('raw_materials')
            .upsert(importData, { onConflict: 'code' });
          
          if (result.error) throw result.error;
          queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
          break;
          
        case 'packaging-materials':
          result = await supabase
            .from('packaging_materials')
            .upsert(importData, { onConflict: 'code' });
          
          if (result.error) throw result.error;
          queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
          break;
          
        case 'semi-finished':
          result = await supabase
            .from('semi_finished_products')
            .upsert(importData, { onConflict: 'code' });
          
          if (result.error) throw result.error;
          queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
          break;
          
        case 'finished-products':
          result = await supabase
            .from('finished_products')
            .upsert(importData, { onConflict: 'code' });
          
          if (result.error) throw result.error;
          queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
          break;
      }
      
      enhancedToast.success(`تم استيراد ${importData.length} عنصر بنجاح`);
      
      setIsLoading(false);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      enhancedToast.error({
        message: 'حدث خطأ أثناء استيراد البيانات',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              يمكنك تنزيل نموذج ملف الاستيراد عن طريق الضغط على زر "تنزيل النموذج"
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">الملف</label>
            <Input
              type="file"
              accept={acceptedFileTypes}
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              الملفات المدعومة: Excel أو CSV
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadTemplate} 
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Download size={16} />
            تنزيل النموذج
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || isLoading}
              className="flex items-center gap-2 flex-1"
            >
              <Upload size={16} />
              {isLoading ? "جاري المعالجة..." : "استيراد"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
