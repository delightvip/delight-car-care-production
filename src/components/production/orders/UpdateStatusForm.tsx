
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { ProductionOrder, PackagingOrder } from '@/services/production/ProductionTypes';
import { statusTranslations } from '@/services/production/ProductionTypes';
import { motion } from 'framer-motion';

type UpdateStatusFormProps = {
  order: ProductionOrder | PackagingOrder;
  onSubmit: (newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled') => Promise<void>;
  onCancel: () => void;
};

const UpdateStatusForm = ({ order, onSubmit, onCancel }: UpdateStatusFormProps) => {
  const [newStatus, setNewStatus] = useState<string>(order.status);

  const handleSubmit = async () => {
    await onSubmit(newStatus as 'pending' | 'inProgress' | 'completed' | 'cancelled');
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="status">الحالة</Label>
        <Select 
          value={newStatus} 
          onValueChange={setNewStatus}
        >
          <SelectTrigger id="status" className="bg-background">
            <SelectValue placeholder="اختر الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{statusTranslations.pending}</SelectItem>
            <SelectItem value="inProgress">{statusTranslations.inProgress}</SelectItem>
            <SelectItem value="completed">{statusTranslations.completed}</SelectItem>
            <SelectItem value="cancelled">{statusTranslations.cancelled}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {newStatus === 'completed' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 p-4 rounded-md text-yellow-800 border border-yellow-200"
        >
          <h4 className="font-medium mb-1 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" /> تنبيه
          </h4>
          <p className="text-sm">
            عند تحديث الحالة إلى "مكتمل"، سيتم خصم {order.hasOwnProperty('ingredients') ? 'المواد الأولية' : 'المنتج النصف مصنع ومواد التعبئة'} من المخزون 
            وإضافة {order.hasOwnProperty('ingredients') ? 'المنتج النصف مصنع' : 'المنتج النهائي'}.
          </p>
        </motion.div>
      )}
      
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button onClick={handleSubmit} className="px-6">
          تحديث
        </Button>
      </div>
    </div>
  );
};

export default UpdateStatusForm;
