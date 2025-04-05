
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import FactoryResetDialog from '../factory-reset/FactoryResetDialog';

const FactoryResetCard = () => {
  const [isFactoryResetDialogOpen, setIsFactoryResetDialogOpen] = useState(false);
  
  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 size={20} />
            <span>إعادة ضبط النظام</span>
          </CardTitle>
          <CardDescription>
            إعادة ضبط النظام إلى الإعدادات الافتراضية وحذف جميع البيانات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            سيؤدي هذا الإجراء إلى إعادة ضبط جميع بيانات النظام وإزالة جميع السجلات. 
            يرجى التأكد من إنشاء نسخة احتياطية قبل المتابعة.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive" 
            className="gap-2"
            onClick={() => setIsFactoryResetDialogOpen(true)}
          >
            <Trash2 size={16} />
            إعادة ضبط المصنع
          </Button>
        </CardFooter>
      </Card>

      <FactoryResetDialog
        open={isFactoryResetDialogOpen}
        onOpenChange={setIsFactoryResetDialogOpen}
      />
    </>
  );
};

export default FactoryResetCard;
