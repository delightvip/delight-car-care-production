
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
import { Upload } from 'lucide-react';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (file: File) => void;
  title: string;
  description: string;
  acceptedFileTypes?: string;
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  title,
  description,
  acceptedFileTypes = ".xlsx,.xls,.csv"
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      if (onImport) {
        await onImport(file);
      } else {
        // Default implementation if no onImport provided
        // In a real application, this would process the file
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setIsLoading(false);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
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
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || isLoading}
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

export default ImportDialog;
