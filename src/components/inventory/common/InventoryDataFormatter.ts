
// Helper utility for formatting inventory data and calculating costs

/**
 * Ensures a value is a valid number
 */
export const ensureNumericValue = (value: any): number => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 0;
  }
  return Number(value);
};

/**
 * Formats inventory data for display in tables
 */
export const formatInventoryData = (data: any[]): any[] => {
  return data.map(item => ({
    ...item,
    quantity: ensureNumericValue(item.quantity),
    min_stock: ensureNumericValue(item.min_stock),
    unit_cost: ensureNumericValue(item.unit_cost),
    totalValue: ensureNumericValue(item.quantity) * ensureNumericValue(item.unit_cost)
  }));
};

/**
 * Calculate the cost of a finished product based on the semi-finished product and packaging materials
 */
export const calculateFinishedProductCost = (
  semiFinished: any, 
  packagingMaterials: any[], 
  quantity: number = 1
): number => {
  try {
    // Calculate semi-finished product cost
    const semiFinishedCost = semiFinished ? 
      ensureNumericValue(semiFinished.unit_cost) * quantity : 0;
    
    // Calculate packaging materials cost
    const packagingCost = packagingMaterials.reduce((sum, pkg) => {
      const packageQuantity = ensureNumericValue(pkg.quantity);
      const packageUnitCost = ensureNumericValue(pkg.unit_cost);
      return sum + (packageQuantity * packageUnitCost);
    }, 0);
    
    // Calculate total cost
    const totalCost = semiFinishedCost + packagingCost;
    
    // Print for debugging
    console.log('Cost calculation:', {
      semiFinishedCost,
      packagingCost,
      totalCost,
      semiFinished,
      packagingMaterials
    });
    
    return totalCost;
  } catch (error) {
    console.error('Error calculating finished product cost:', error);
    return 0;
  }
};

/**
 * Checks if an item is low in stock
 */
export const isLowStock = (item: any): boolean => {
  const quantity = ensureNumericValue(item.quantity);
  const minStock = ensureNumericValue(item.min_stock);
  
  return quantity <= minStock;
};

/**
 * Formats currency value
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('ar-EG') + ' ج.م';
};

/**
 * Formats date for display
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
  } catch (error) {
    return '-';
  }
};

/**
 * Get total inventory value
 */
export const calculateTotalInventoryValue = (items: any[]): number => {
  return items.reduce((sum, item) => {
    const quantity = ensureNumericValue(item.quantity);
    const unitCost = ensureNumericValue(item.unit_cost);
    return sum + (quantity * unitCost);
  }, 0);
};
