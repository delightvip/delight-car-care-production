
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { ProductionOrder, PackagingOrder } from '@/services/production/ProductionTypes';
import { motion } from 'framer-motion';

type DeleteOrderConfirmProps = {
  order: ProductionOrder | PackagingOrder;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

const DeleteOrderConfirm = ({ order, onConfirm, onCancel }: DeleteOrderConfirmProps) => {
  return (
    <motion.div 
      className="py-4 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-start space-x-4 rtl:space-x-reverse">
        <div className="p-2 bg-red-100 rounded-full">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <p className="font-medium">هل أنت متأكد من حذف أمر {order.hasOwnProperty('ingredients') ? 'الإنتاج' : 'التعبئة'}؟</p>
          <p className="text-sm text-muted-foreground mt-1">لا يمكن التراجع عن هذا الإجراء.</p>
        </div>
      </div>
      
      <div className="p-3 border rounded-md bg-muted/30">
        <p className="font-medium">{order.code} - {order.productName}</p>
        <p className="text-sm text-muted-foreground mt-1">الكمية: {order.quantity} {order.unit}</p>
      </div>
      
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          حذف
        </Button>
      </div>
    </motion.div>
  );
};

export default DeleteOrderConfirm;
