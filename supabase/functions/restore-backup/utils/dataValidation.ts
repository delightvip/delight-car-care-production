
// UUID validation regex
export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validate if a value is a valid UUID
export function isValidUuid(value: any): boolean {
  // Skip validation if value is not a string (e.g., integer id)
  if (typeof value !== 'string') return true;
  // Skip validation if value is set to '1' for special cases like financial_balance
  if (value === '1') return true;
  
  // Validate UUID format for all other string IDs
  return uuidRegex.test(value);
}

// Clean potentially invalid UUIDs in data
export function cleanUuids(data: any[], uuidFields: string[]): any[] {
  return data.filter(item => {
    // Skip if id is not a string or is set to '1' for special cases
    if (typeof item.id !== 'string' || item.id === '1') return true;
    
    // Filter out invalid UUIDs
    return isValidUuid(item.id);
  }).map(item => {
    // Process all potential UUID fields
    uuidFields.forEach(field => {
      if (item[field] !== undefined && item[field] !== null) {
        // If a string doesn't match UUID format, set to null
        if (typeof item[field] === 'string' && 
            item[field] !== '1' && 
            !isValidUuid(item[field])) {
          console.log(`Invalid UUID in ${field}: ${item[field]}`);
          item[field] = null;
        }
      }
    });
    return item;
  });
}

// Remove computed fields from data
export function removeComputedFields(data: any[], fieldsToRemove: string[]): any[] {
  return data.map(item => {
    const newItem = { ...item };
    fieldsToRemove.forEach(field => {
      delete newItem[field];
    });
    return newItem;
  });
}
