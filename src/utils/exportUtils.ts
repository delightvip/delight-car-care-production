/**
 * Utility for exporting inventory data to CSV files
 */

// Generic function to export data to CSV
export const exportToCSV = <T extends object>(data: T[], filename: string): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  
  // Get headers from the first object's keys
  const headers = Object.keys(data[0]);
  
  // Create CSV content with headers
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        // Handle special cases for CSV formatting
        const value = (row as any)[header];
        
        // Handle null, undefined
        if (value === null || value === undefined) return '';
        
        // Handle strings that need quotes (if they contain commas or quotes)
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }
        
        // Handle other types
        return String(value);
      }).join(',')
    )
  ].join('\n');
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export raw materials list
export const exportRawMaterials = (materials: any[]) => {
  const formattedData = materials.map(item => ({
    كود: item.code,
    الاسم: item.name,
    الوحدة: item.unit,
    الكمية: item.quantity,
    الحد_الأدنى: item.min_stock,
    التكلفة: item.unit_cost,
    الأهمية: item.importance
  }));
  
  exportToCSV(formattedData, 'raw_materials');
};

// Export packaging materials list
export const exportPackagingMaterials = (materials: any[]) => {
  const formattedData = materials.map(item => ({
    كود: item.code,
    الاسم: item.name,
    الوحدة: item.unit,
    الكمية: item.quantity,
    الحد_الأدنى: item.min_stock,
    التكلفة: item.unit_cost,
    الأهمية: item.importance
  }));
  
  exportToCSV(formattedData, 'packaging_materials');
};

// Export semi-finished products list
export const exportSemiFinishedProducts = (products: any[]) => {
  const formattedData = products.map(item => ({
    كود: item.code,
    الاسم: item.name,
    الوحدة: item.unit,
    الكمية: item.quantity,
    الحد_الأدنى: item.min_stock,
    التكلفة: item.unit_cost,
    عدد_المكونات: item.ingredients?.length || 0
  }));
  
  exportToCSV(formattedData, 'semi_finished_products');
};

// Export finished products list
export const exportFinishedProducts = (products: any[]) => {
  const formattedData = products.map(item => ({
    كود: item.code,
    الاسم: item.name,
    الوحدة: item.unit,
    الكمية: item.quantity,
    الحد_الأدنى: item.min_stock,
    التكلفة: item.unit_cost,
    المنتج_النصف_مصنع: item.semiFinished?.name || '',
    كمية_المنتج_النصف_مصنع: item.semi_finished_quantity || 0
  }));
  
  exportToCSV(formattedData, 'finished_products');
};

// Export audit data
export const exportAuditData = (auditData: any[]) => {
  const formattedData = auditData.map(item => ({
    كود: item.code,
    الاسم: item.name,
    الكمية_النظام: item.systemQuantity,
    الكمية_الفعلية: item.actualQuantity,
    الفرق: item.difference,
    الوحدة: item.unit,
    تاريخ_الجرد: new Date().toISOString().slice(0, 10)
  }));
  
  exportToCSV(formattedData, 'inventory_audit');
};

/**
 * Exports inventory stagnant items or unused items report to CSV
 */
export const exportReportData = <T extends object>(data: T[], filename: string): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }
  
  exportToCSV(data, filename);
};

/**
 * Exports the audit data from inventory count reconciliation
 */
export const exportAuditData = (auditData: any[]): void => {
  if (!auditData || auditData.length === 0) {
    console.warn('No audit data to export');
    return;
  }
  
  exportToCSV(auditData, 'inventory_report');
};
