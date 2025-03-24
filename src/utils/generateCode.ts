
/**
 * Generates a unique code for different types of products
 * 
 * @param type - Type of product (raw, semi, packaging, finished)
 * @param currentCount - Current count of items in that category
 * @returns A unique code string
 */
export const generateCode = (type: 'raw' | 'semi' | 'packaging' | 'finished', currentCount: number): string => {
  const prefix = {
    raw: 'RAW',
    semi: 'SEMI',
    packaging: 'PKG',
    finished: 'FIN'
  }[type];
  
  // Pad the counter to 5 digits
  const paddedCount = String(currentCount + 1).padStart(5, '0');
  
  return `${prefix}-${paddedCount}`;
};

/**
 * Generates a unique code for production orders
 */
export const generateOrderCode = (type: 'production' | 'packaging', currentCount: number): string => {
  const prefix = type === 'production' ? 'PROD' : 'PACK';
  const paddedCount = String(currentCount + 1).padStart(5, '0');
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  
  return `${prefix}-${dateStr}-${paddedCount}`;
};
