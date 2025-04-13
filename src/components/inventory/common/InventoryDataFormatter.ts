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

/**
 * Calculate the total cost of a semi-finished product based on its ingredients
 * 
 * @param ingredients - List of ingredients with percentage and cost
 * @param quantity - Total quantity of the semi-finished product
 * @returns Total cost of the semi-finished product
 */
export const calculateSemiFinishedCost = (ingredients: any[], quantity: number = 1): number => {
  if (!ingredients || ingredients.length === 0) return 0;
  
  let totalCost = 0;
  
  ingredients.forEach(ingredient => {
    const rawMaterialCost = ensureNumericValue(ingredient.raw_materials?.unit_cost || ingredient.unit_cost);
    const percentage = ensureNumericValue(ingredient.percentage);
    
    // Calculate cost contribution of this ingredient
    // The percentage is out of 100, so we divide by 100
    const contributionPerUnit = (percentage / 100) * rawMaterialCost;
    totalCost += contributionPerUnit;
  });
  
  // Return the total cost multiplied by quantity
  return totalCost * quantity;
};

/**
 * Calculate the total cost of a finished product based on its components
 * 
 * @param semiFinishedData - Semi-finished product data (with quantity and cost)
 * @param packagingMaterials - List of packaging materials (with quantity and cost)
 * @param quantity - Total quantity of the finished product
 * @returns Total cost of the finished product
 */
export const calculateFinishedProductCost = (
  semiFinishedData: any,
  packagingMaterials: any[],
  semiFinishedQuantity: number = 1
): number => {
  if (!semiFinishedData && (!packagingMaterials || packagingMaterials.length === 0)) return 0;
  
  let totalCost = 0;
  
  // Add semi-finished product cost
  if (semiFinishedData) {
    const semiFinishedCost = ensureNumericValue(semiFinishedData.unit_cost);
    // استخدام كمية المنتج النصف مصنع المطلوبة فعلياً في المنتج النهائي
    totalCost += semiFinishedCost * semiFinishedQuantity;
  }
    // Add packaging materials cost
  if (packagingMaterials && packagingMaterials.length > 0) {
    packagingMaterials.forEach(material => {
      const materialCost = ensureNumericValue(material.packaging_material?.unit_cost || material.unit_cost);
      const materialQuantity = ensureNumericValue(material.quantity || 1);
      totalCost += materialCost * materialQuantity;
    });
  }
  
  // Return the total cost (no need to multiply again as we already accounted for quantities)
  return totalCost;
};
