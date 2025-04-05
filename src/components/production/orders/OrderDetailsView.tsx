
import React from 'react';
import { Button } from '@/components/ui/button';
import StatusBadge from '../common/StatusBadge';
import OrderDetailItem from './OrderDetailItem';
import IngredientItem from './IngredientItem';
import { ProductionOrder, PackagingOrder } from '@/services/production/ProductionTypes';
import { motion } from 'framer-motion';

type OrderDetailsViewProps = {
  order: ProductionOrder | PackagingOrder;
  type: 'production' | 'packaging';
  onClose: () => void;
};

const OrderDetailsView = ({ order, type, onClose }: OrderDetailsViewProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="grid grid-cols-2 gap-x-6 gap-y-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <OrderDetailItem label="كود الأمر" value={order.code} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <OrderDetailItem label="التاريخ" value={order.date} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <OrderDetailItem label="المنتج" value={order.productName} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <OrderDetailItem label="الكمية" value={`${order.quantity} ${order.unit}`} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <OrderDetailItem 
            label="الحالة" 
            value={<StatusBadge status={order.status} />} 
            badge={true} 
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <OrderDetailItem label="التكلفة الإجمالية" value={`${order.totalCost.toFixed(2)} ج.م`} />
        </motion.div>
      </motion.div>
      
      <motion.div 
        className="border-t pt-4"
        variants={containerVariants}
      >
        <motion.h4 
          className="text-sm font-medium mb-3"
          variants={itemVariants}
        >
          {type === 'production' ? 'المكونات المطلوبة:' : 'مكونات التعبئة:'}
        </motion.h4>
        
        <div className="space-y-2">
          {type === 'production' && (order as ProductionOrder).ingredients.map((ingredient) => (
            <motion.div key={ingredient.id} variants={itemVariants}>
              <IngredientItem
                name={ingredient.name}
                quantity={ingredient.requiredQuantity}
                available={ingredient.available}
              />
            </motion.div>
          ))}
          
          {type === 'packaging' && (
            <>
              <motion.div variants={itemVariants}>
                <IngredientItem
                  name={(order as PackagingOrder).semiFinished.name}
                  quantity={(order as PackagingOrder).semiFinished.quantity}
                  available={(order as PackagingOrder).semiFinished.available}
                  type="سائل"
                />
              </motion.div>
              
              {(order as PackagingOrder).packagingMaterials.map((material, index) => (
                <motion.div key={`${material.code}-${index}`} variants={itemVariants}>
                  <IngredientItem
                    name={material.name}
                    quantity={material.quantity}
                    available={material.available}
                    type="تعبئة"
                  />
                </motion.div>
              ))}
            </>
          )}
        </div>
      </motion.div>
      
      <motion.div 
        className="flex justify-end mt-4"
        variants={itemVariants}
      >
        <Button onClick={onClose} className="px-6">
          إغلاق
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default OrderDetailsView;
