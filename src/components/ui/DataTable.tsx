import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowDown, ArrowUp } from 'lucide-react';
import { useSidebar } from '../layout/SidebarContext';

interface Column {
  key: string;
  title: string;
  render?: (value: any, record: any) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  searchable?: boolean;
  searchKeys?: string[];
  pagination?: boolean;
  itemsPerPage?: number;
  actions?: (record: any) => React.ReactNode;
  searchPlaceholder?: string;
  noDataMessage?: string;
  onSort?: (key: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  stickyHeader?: boolean;
  containerClassName?: string; // إضافة خاصية للتحكم بتنسيق الحاوية الخارجية
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  searchable = true,
  searchKeys = [],
  pagination = true,
  itemsPerPage = 10,
  actions,
  searchPlaceholder = "بحث...",
  noDataMessage = "لا توجد بيانات للعرض",
  onSort,
  sortConfig,
  stickyHeader = true,
  containerClassName = "",
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { isExpanded } = useSidebar(); // استدعاء سياق القائمة الجانبية لمعرفة حالتها
  
  // Ensure data is an array
  const safeData = Array.isArray(data) ? data : [];
  
  // Handle search
  const filteredData = searchable && searchTerm 
    ? safeData.filter(item => {
        return (searchKeys.length > 0 ? searchKeys : Object.keys(item)).some(key => {
          const value = item[key];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });
      })
    : safeData;
    
  // Handle pagination
  const pageCount = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = pagination 
    ? filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) 
    : filteredData;
  
  // إعادة ضبط رقم الصفحة الحالية عند تغيير البيانات أو شروط البحث
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, data]);

  return (
    <div className={`space-y-4 w-full ${containerClassName}`}>
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>
      )}
      
      {/* تحسين التمرير الأفقي وتغليف الجدول */}
      <div className="rounded-md border overflow-hidden">
        <div 
          className="overflow-x-auto" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            // التأكد من أن منطقة تمرير الجدول كافية حتى مع تغير حالة القائمة الجانبية
            maxWidth: '100%'
          }}
        >
          <Table className="min-w-full">
            <TableHeader className={stickyHeader ? "sticky top-0 z-10" : ""}>
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key} 
                    className="bg-muted font-semibold"
                    style={{
                      width: column.width || 'auto', 
                      minWidth: column.minWidth || '100px',
                      position: 'relative',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <div className="flex items-center">
                      {column.title}
                      {column.sortable && (
                        <div className="mr-1 flex flex-col">
                          <ArrowUp
                            onClick={() => onSort?.(column.key)}
                            className={`h-4 w-4 cursor-pointer ${sortConfig?.key === column.key && sortConfig?.direction === 'asc' ? 'text-primary' : 'text-muted-foreground'}`}
                          />
                          <ArrowDown
                            onClick={() => onSort?.(column.key)}
                            className={`h-4 w-4 cursor-pointer ${sortConfig?.key === column.key && sortConfig?.direction === 'desc' ? 'text-primary' : 'text-muted-foreground'}`}
                          />
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
                {actions && (
                  <TableHead 
                    className="bg-muted sticky right-0 z-20 shadow-md" 
                    style={{ 
                      minWidth: '120px',
                      // إضافة خلفية للتأكد من أن عمود الإجراءات يبقى مرئيًا عند التمرير الأفقي
                      backgroundColor: 'var(--muted)'
                    }}
                  >
                    الإجراءات
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((record, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    {columns.map((column) => (
                      <TableCell 
                        key={`${index}-${column.key}`}
                        style={{
                          width: column.width || 'auto',
                          minWidth: column.minWidth || '100px'
                        }}
                      >
                        {column.render 
                          ? column.render(record[column.key], record) 
                          : record[column.key]}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell 
                        className="sticky right-0 z-20 bg-background shadow-md" 
                        style={{ 
                          minWidth: '120px',
                          // إضافة خلفية للتأكد من أن خلية الإجراءات تبقى مرئية دائمًا
                          backgroundColor: 'var(--background)'
                        }}
                      >
                        {actions(record)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
                    {noDataMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {pagination && pageCount > 1 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            عرض {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)} إلى{' '}
            {Math.min(filteredData.length, currentPage * itemsPerPage)} من أصل {filteredData.length} عنصر
          </div>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border bg-muted/50 disabled:opacity-50"
            >
              السابق
            </button>
            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
              // Show pages around current page
              let pageNum;
              if (pageCount <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= pageCount - 2) {
                pageNum = pageCount - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded border ${
                    currentPage === pageNum ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
              disabled={currentPage === pageCount}
              className="px-3 py-1 rounded border bg-muted/50 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
