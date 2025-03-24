
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from 'lucide-react';

interface Column {
  key: string;
  title: string;
  render?: (value: any, record: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  searchable?: boolean;
  searchKeys?: string[];
  pagination?: boolean;
  itemsPerPage?: number;
  actions?: (record: any) => React.ReactNode;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  searchable = true,
  searchKeys = [],
  pagination = true,
  itemsPerPage = 10,
  actions
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
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
  
  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>
      )}
      
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className="bg-muted">
                  {column.title}
                </TableHead>
              ))}
              {actions && <TableHead className="bg-muted">الإجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((record, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  {columns.map((column) => (
                    <TableCell key={`${index}-${column.key}`}>
                      {column.render 
                        ? column.render(record[column.key], record) 
                        : record[column.key]}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      {actions(record)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8">
                  لا توجد بيانات للعرض
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {pagination && pageCount > 1 && (
        <div className="flex items-center justify-between">
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
