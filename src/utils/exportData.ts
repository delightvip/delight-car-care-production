/**
 * وظائف تصدير البيانات إلى Excel أو CSV
 */

/**
 * تصدير البيانات إلى ملف CSV
 * @param data البيانات المراد تصديرها
 * @param fileName اسم الملف
 */
export const exportToCSV = (data: any[], fileName: string) => {
  // تحويل البيانات إلى صيغة CSV
  const replacer = (_: any, value: any) => value === null ? '' : value;
  const header = Object.keys(data[0]);
  const csv = [
    header.join(','),
    ...data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
  ].join('\r\n');
  // إضافة BOM (Byte Order Mark) لدعم اللغة العربية
  const BOM = "\uFEFF"; // إضافة علامة ترتيب البايت لدعم الحروف العربية
  const csvWithBOM = BOM + csv;
  
  // إنشاء Blob وتنزيل الملف
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}-${new Date().toLocaleDateString('ar-EG')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * تصدير البيانات إلى ملف Excel
 * @param data البيانات المراد تصديرها
 * @param fileName اسم الملف
 * @param sheetName اسم ورقة العمل
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  // تحويل البيانات إلى صيغة CSV ثم تنزيله كملف Excel
  // ملاحظة: هذه طريقة مبسطة، للتنفيذ الكامل يمكن استخدام مكتبة مثل xlsx أو exceljs
  const replacer = (_: any, value: any) => value === null ? '' : value;
  const header = Object.keys(data[0]);
  const csv = [
    header.join(','),
    ...data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
  ].join('\r\n');
  // إضافة BOM لدعم اللغة العربية في ملف Excel
  const BOM = "\uFEFF";
  const csvWithBOM = BOM + csv;
  
  // إنشاء Blob وتنزيل الملف
  const blob = new Blob([csvWithBOM], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}-${new Date().toLocaleDateString('ar-EG')}.xls`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * تحضير البيانات للتصدير من خلال تحويلها إلى الصيغة المناسبة
 * @param data البيانات الخام
 * @param columns تعريف الأعمدة
 * @returns البيانات المعدة للتصدير
 */
export const prepareDataForExport = (data: any[], columns: any[]) => {
  return data.map(item => {
    const exportItem: any = {};
    
    // استخدام عناوين الأعمدة المعروضة كأسماء حقول في ملف التصدير
    columns.forEach(column => {
      if (column.key && column.title) {
        // استخدام القيمة الأصلية إذا كانت موجودة
        exportItem[column.title] = item[column.key];
      }
    });
    
    return exportItem;
  });
};
