
/**
 * Utility functions for formatting inventory data
 */

/**
 * Ensures a value is a valid number
 * 
 * @param value - Any value that should be a number
 * @param fieldName - Optional field name to extract specific property from object
 * @returns The numeric value, or 0 if invalid
 */
export const ensureNumericValue = (value: any, fieldName?: string): number => {
  // If null or undefined, return 0
  if (value === null || value === undefined) return 0;
  
  // If already a number, return it
  if (typeof value === 'number') return value;
  
  // If a specific field is requested and value is an object
  if (fieldName && typeof value === 'object') {
    // Try to get the specific field
    if (fieldName in value && typeof value[fieldName] === 'number') {
      return value[fieldName];
    }
  }
  
  // If it's an object with numeric properties (like unit_cost or sales_price)
  if (typeof value === 'object') {
    // Use different extraction logic based on context
    // For sales_price column, prioritize sales_price property
    if (fieldName === 'sales_price') {
      if ('sales_price' in value && typeof value.sales_price === 'number') return value.sales_price;
      if ('price' in value && typeof value.price === 'number') return value.price;
    }
    // For unit_cost column, prioritize unit_cost property
    else if (fieldName === 'unit_cost') {
      if ('unit_cost' in value && typeof value.unit_cost === 'number') return value.unit_cost;
      if ('cost' in value && typeof value.cost === 'number') return value.cost;
    }
    // General fallback order for other fields
    else {
      // Generic check for known numeric properties
      if ('sales_price' in value && typeof value.sales_price === 'number') return value.sales_price;
      if ('price' in value && typeof value.price === 'number') return value.price;
      if ('unit_cost' in value && typeof value.unit_cost === 'number') return value.unit_cost;
      if ('cost' in value && typeof value.cost === 'number') return value.cost;
      if ('value' in value && typeof value.value === 'number') return value.value;
    }
    
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
      quantity: quantity,
      unit_cost: unitCost,
      totalValue: totalValue
    };
  });
};

/**
 * Calculate the cost of a finished product based on components
 * 
 * @param semiFinished - The semi-finished product data
 * @param packaging - Array of packaging materials
 * @param quantity - Quantity of finished product to calculate for (typically 1 for unit cost)
 * @returns The calculated unit cost
 */
export const calculateFinishedProductCost = (
  semiFinished: any,
  packaging: any[],
  quantity: number = 1
): number => {
  // Get the semi-finished product cost, accounting for the quantity used
  const semiFinishedCost = ensureNumericValue(semiFinished.unit_cost) * 
                           ensureNumericValue(semiFinished.quantity);
  
  // Calculate total cost of packaging materials
  const packagingCost = packaging.reduce((total, item) => {
    const itemCost = ensureNumericValue(item.unit_cost, 'unit_cost') * 
                     ensureNumericValue(item.quantity);
    return total + itemCost;
  }, 0);
  
  // Total cost is semi-finished cost plus packaging cost
  const totalCost = semiFinishedCost + packagingCost;
  
  // Return the unit cost by dividing by quantity
  return quantity > 0 ? totalCost / quantity : 0;
};
