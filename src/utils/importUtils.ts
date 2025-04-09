import { read, utils, WritingOptions } from 'xlsx';
import { enhancedToast } from '@/components/ui/enhanced-toast';

/**
 * Types of inventory items that can be imported
 */
export type ImportItemType = 'raw-materials' | 'packaging-materials' | 'semi-finished' | 'finished-products';

/**
 * Interface for raw materials import data
 */
export interface RawMaterialImport {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  importance?: number;
}

/**
 * Interface for packaging materials import data
 */
export interface PackagingMaterialImport {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  importance?: number;
}

/**
 * Interface for semi-finished products import data
 */
export interface SemiFinishedImport {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
}

/**
 * Interface for finished products import data
 */
export interface FinishedProductImport {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  semi_finished_id: number;
  semi_finished_quantity: number;
}

/**
 * Reads data from an Excel or CSV file
 */
export const readFileData = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          reject(new Error('فشل قراءة الملف'));
          return;
        }
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = utils.sheet_to_json(worksheet, { defval: '' });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Maps column headers from Arabic to English
 */
export const mapColumnHeaders = (data: any[], itemType: ImportItemType): any[] => {
  // Define mappings from Arabic to English field names
  const headerMappings: Record<string, Record<string, string>> = {
    'raw-materials': {
      'الكود': 'code',
      'الاسم': 'name',
      'الوحدة': 'unit',
      'الكمية': 'quantity',
      'الحد_الأدنى': 'min_stock',
      'التكلفة': 'unit_cost',
      'الأهمية': 'importance'
    },
    'packaging-materials': {
      'الكود': 'code',
      'الاسم': 'name',
      'الوحدة': 'unit',
      'الكمية': 'quantity',
      'الحد_الأدنى': 'min_stock',
      'التكلفة': 'unit_cost',
      'الأهمية': 'importance'
    },
    'semi-finished': {
      'الكود': 'code',
      'الاسم': 'name',
      'الوحدة': 'unit',
      'الكمية': 'quantity',
      'الحد_الأدنى': 'min_stock',
      'التكلفة': 'unit_cost'
    },
    'finished-products': {
      'الكود': 'code',
      'الاسم': 'name',
      'الوحدة': 'unit',
      'الكمية': 'quantity',
      'الحد_الأدنى': 'min_stock',
      'التكلفة': 'unit_cost',
      'كود_المنتج_النصف_مصنع': 'semi_finished_id',
      'كمية_المنتج_النصف_مصنع': 'semi_finished_quantity'
    }
  };
  
  const mapping = headerMappings[itemType];
  
  // Transform data by mapping Arabic column names to English property names
  return data.map(item => {
    const mappedItem: Record<string, any> = {};
    
    // Process each property in the original item
    for (const arabicKey in item) {
      // Find the English equivalent for this Arabic key
      const englishKey = mapping[arabicKey];
      
      if (englishKey) {
        // Convert numeric values from strings
        let value = item[arabicKey];
        
        if (['quantity', 'min_stock', 'unit_cost', 'importance', 'semi_finished_id', 'semi_finished_quantity'].includes(englishKey)) {
          value = value === '' ? 0 : Number(value);
        }
        
        mappedItem[englishKey] = value;
      } else {
        // Keep the original key if no mapping found
        mappedItem[arabicKey] = item[arabicKey];
      }
    }
    
    return mappedItem;
  });
};

/**
 * Validates imported data
 */
export const validateImportData = (data: any[], itemType: ImportItemType): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Define required fields for each type
  const requiredFields: Record<ImportItemType, string[]> = {
    'raw-materials': ['code', 'name', 'unit'],
    'packaging-materials': ['code', 'name', 'unit'],
    'semi-finished': ['code', 'name', 'unit'],
    'finished-products': ['code', 'name', 'unit', 'semi_finished_id', 'semi_finished_quantity']
  };
  
  // Check if data is empty
  if (data.length === 0) {
    errors.push('الملف لا يحتوي على بيانات');
    return { isValid: false, errors };
  }
  
  // Validate each record
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const rowNumber = i + 1;
    
    // Check required fields
    for (const field of requiredFields[itemType]) {
      if (item[field] === undefined || item[field] === '') {
        errors.push(`الصف ${rowNumber}: الحقل "${field}" مطلوب`);
      }
    }
    
    // Validate code format (must be alphanumeric)
    if (item.code && !/^[a-zA-Z0-9-_]+$/.test(item.code)) {
      errors.push(`الصف ${rowNumber}: الكود يجب أن يحتوي على أحرف وأرقام فقط`);
    }
    
    // Validate numeric fields
    ['quantity', 'min_stock', 'unit_cost', 'importance', 'semi_finished_id', 'semi_finished_quantity'].forEach(field => {
      if (item[field] !== undefined && item[field] !== '' && isNaN(Number(item[field]))) {
        errors.push(`الصف ${rowNumber}: الحقل "${field}" يجب أن يكون رقم`);
      }
    });
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Processes import data with validation
 */
export const processImportFile = async (file: File, itemType: ImportItemType): Promise<any[]> => {
  try {
    // Read file data
    const rawData = await readFileData(file);
    
    // Map column headers from Arabic to English
    const mappedData = mapColumnHeaders(rawData, itemType);
    
    // Validate data
    const validation = validateImportData(mappedData, itemType);
    
    if (!validation.isValid) {
      enhancedToast.error({
        message: 'خطأ في ملف الاستيراد',
        details: validation.errors.join('\n')
      });
      return [];
    }
    
    return mappedData;
  } catch (error) {
    console.error('Error processing import file:', error);
    enhancedToast.error('فشل معالجة ملف الاستيراد');
    return [];
  }
};
