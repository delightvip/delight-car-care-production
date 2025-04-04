
/**
 * Utility functions for formatting inventory data
 */

/**
 * Ensures a value is a valid number
 * 
 * @param value - Any value that should be a number
 * @returns The numeric value, or 0 if invalid
 */
export const ensureNumericValue = (value: any): number => {
  // If null or undefined, return 0
  if (value === null || value === undefined) return 0;
  
  // If already a number, return it
  if (typeof value === 'number') return value;
  
  // If it's an object
  if (typeof value === 'object') {
    try {
      // Convert to string and try to find a number pattern
      const valueStr = JSON.stringify(value);
      const match = valueStr.match(/\d+(\.\d+)?/);
      if (match) {
        return parseFloat(match[0]);
      }
    } catch (e) {
      console.error("Error processing object value:", e);
    }
    return 0;
  }
  
  // Try to parse as number
  const num = parseFloat(value);
  return !isNaN(num) ? num : 0;
};

/**
 * Formats a numeric value as currency
 * 
 * @param value - The numeric value to format
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number): string => {
  // Ensure we have a valid number
  const numValue = ensureNumericValue(value);
  
  // Format with 2 decimal places
  return `${numValue.toFixed(2)} ج.م`;
};

/**
 * Converts raw inventory data for display
 * 
 * @param data - Raw inventory data from API
 * @returns Formatted data for display
 */
export const formatInventoryData = (data: any[]): any[] => {
  return data.map(item => {
    const quantity = ensureNumericValue(item.quantity);
    const unitCost = ensureNumericValue(item.unit_cost);
    const totalValue = quantity * unitCost;
    
    return {
      ...item,
      quantity,
      unit_cost: unitCost,
      totalValue,
      // If sales_price exists, convert it to number
      ...(item.sales_price !== undefined && { sales_price: ensureNumericValue(item.sales_price) })
    };
  });
};

/**
 * Format a value for display, preventing [object Object] string.
 * 
 * @param value - The value to format for display
 * @returns A string safe for display
 */
export const formatDisplayValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
