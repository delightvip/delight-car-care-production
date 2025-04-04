
/**
 * Formats inventory data to ensure proper numeric value display and calculation
 */
export const formatInventoryData = <T extends { quantity: number; unit_cost: number }>(items: T[]): (T & { totalValue: number })[] => {
  return items.map(item => {
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unit_cost);
    const totalValue = quantity * unitCost;
    
    return {
      ...item,
      quantity,
      unit_cost: unitCost,
      totalValue
    };
  });
};

/**
 * Formats a number as currency (with 2 decimal places)
 */
export const formatCurrency = (value: number): string => {
  return value.toFixed(2) + " ج.م";
};

/**
 * Safely extracts numeric values from objects or strings
 */
export const ensureNumericValue = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value === 'object') {
    // Try to convert object to number if possible
    const str = String(value);
    return Number(str) || 0;
  }
  return 0;
};
