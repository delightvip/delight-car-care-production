
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import IngredientItem from './IngredientItem';
import { ProductionOrder, PackagingOrder } from '@/services/production/ProductionTypes';
import { motion } from 'framer-motion';

type EditOrderFormProps = {
  type: 'production' | 'packaging';
  order: ProductionOrder | PackagingOrder;
  products: any[];
  onSubmit: (
    id: number, 
    productCode: string, 
    quantity: number, 
    unit: string
  ) => Promise<void>;
  calculateItems: (productCode: string, quantity: number) => any[];
  calculateTotalCost: (productCode: string, quantity: number) => number;
  onCancel: () => void;
};

const EditOrderForm = ({
  type,
  order,
  products,
  onSubmit,
  calculateItems,
  calculateTotalCost,
  onCancel
}: EditOrderFormProps) => {
  const [formData, setFormData] = useState({
    id: order.id,
    productCode: order.productCode,
    quantity: order.quantity,
    unit: order.unit
  });
  const [items, setItems] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    if (formData.productCode && formData.quantity > 0) {
      const calculatedItems = calculateItems(formData.productCode, formData.quantity);
      setItems(calculatedItems);
      
      const cost = calculateTotalCost(formData.productCode, formData.quantity);
      setTotalCost(cost);
    } else {
      setItems([]);
      setTotalCost(0);
    }
  }, [formData, calculateItems, calculateTotalCost]);

  const handleSubmit = async () => {
    if (!formData.productCode || formData.quantity <= 0) {
      toast.error("يجب اختيار منتج وتحديد كمية صحيحة");
      return;
    }
    
    await onSubmit(
      formData.id,
      formData.productCode,
      formData.quantity,
      formData.unit
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="grid gap-4 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="grid gap-2" variants={itemVariants}>
        <Label htmlFor="edit-product">المنتج</Label>
        <Select 
          value={formData.productCode} 
          onValueChange={value => setFormData({...formData, productCode: value})}
        >
          <SelectTrigger id="edit-product" className="bg-background">
            <SelectValue placeholder="اختر المنتج" />
          </SelectTrigger>
          <SelectContent>
            {products.map(product => (
              <SelectItem key={product.code} value={product.code}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div className="grid gap-2" variants={itemVariants}>
        <Label htmlFor="edit-quantity">الكمية</Label>
        <Input
          id="edit-quantity"
          type="number"
          value={formData.quantity || ''}
          onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
          className="bg-background"
        />
      </motion.div>

      <motion.div className="grid gap-2" variants={itemVariants}>
        <Label htmlFor="edit-unit">الوحدة</Label>
        <Input
          id="edit-unit"
          value={formData.unit}
          onChange={e => setFormData({...formData, unit: e.target.value})}
          className="bg-background"
        />
      </motion.div>
      
      {formData.productCode && formData.quantity > 0 && items.length > 0 && (
        <motion.div 
          className="border-t mt-2 pt-4"
          variants={itemVariants}
        >
          <h4 className="text-sm font-medium mb-2">
            {type === 'production' ? 'المكونات المطلوبة:' : 'مواد التعبئة:'}
          </h4>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <IngredientItem
                key={`${item.code}-${idx}`}
                name={item.name}
                quantity={item.requiredQuantity || item.quantity}
                available={item.available}
                type={item.type}
              />
            ))}
          </div>
          
          <div className="mt-4 p-3 border rounded-md bg-muted/50 hover:bg-muted/80 transition-colors">
            <div className="flex justify-between">
              <span className="font-medium">التكلفة الإجمالية:</span>
              <span className="font-medium text-primary">{totalCost.toFixed(2)} ج.م</span>
            </div>
          </div>
        </motion.div>
      )}
      
      <motion.div 
        className="flex justify-end gap-2 mt-4"
        variants={itemVariants}
      >
        <Button variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button onClick={handleSubmit} className="px-6">
          تحديث
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default EditOrderForm;
