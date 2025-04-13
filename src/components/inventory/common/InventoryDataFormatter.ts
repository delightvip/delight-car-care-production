
// تحقق إذا كان هذا الملف موجود ونضيف الدالة الخاصة بحساب تكلفة المنتج النهائي أو نعدلها إذا كانت موجودة

export const calculateFinishedProductCost = (
  semiFinished: { unit_cost: number } | null | undefined, 
  packagingMaterials: { quantity: number; unit_cost: number }[],
  semiFinishedQuantity: number = 1
): number => {
  let totalCost = 0;
  
  // حساب تكلفة المنتج النصف مصنع
  if (semiFinished && typeof semiFinished.unit_cost === 'number') {
    totalCost += semiFinished.unit_cost * Number(semiFinishedQuantity);
  }
  
  // حساب تكلفة مواد التعبئة
  if (packagingMaterials && packagingMaterials.length > 0) {
    for (const material of packagingMaterials) {
      const materialQuantity = Number(material.quantity);
      const materialUnitCost = Number(material.unit_cost);
      
      if (!isNaN(materialQuantity) && !isNaN(materialUnitCost)) {
        totalCost += materialQuantity * materialUnitCost;
      }
    }
  }
  
  return totalCost;
};

// Updated to support an optional field name parameter
export const ensureNumericValue = (value: any, fieldName?: string): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatInventoryData = (data: any[], columns: any[]) => {
  return data.map(item => {
    const formattedItem: any = {};
    columns.forEach(column => {
      if (column.key) {
        formattedItem[column.key] = item[column.key];
      }
    });
    return formattedItem;
  });
};

export const formatDisplayValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  
  if (typeof value === 'number') {
    return formatCurrency(value);
  }
  
  return String(value);
};
