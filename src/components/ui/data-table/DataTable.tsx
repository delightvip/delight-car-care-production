
import React, { useState, useEffect } from 'react';
import { Table } from "@/components/ui/table";
import { useSidebar } from '../../layout/SidebarContext';
import TableSearch from './TableSearch';
import TablePagination from './TablePagination';
import TableHeader from './TableHeader';
import TableBodyComponent from './TableBody';
import { DataTableProps } from './types';

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
  className = "",
  emptyState,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { isExpanded } = useSidebar();

  const safeData = Array.isArray(data) ? data : [];

  const filteredData = searchable && searchTerm 
    ? safeData.filter(item => {
        return (searchKeys.length > 0 ? searchKeys : Object.keys(item)).some(key => {
          const value = item[key];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });
      })
    : safeData;

  const pageCount = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = pagination 
    ? filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) 
    : filteredData;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, data]);

  return (
    <div className={`space-y-4 w-full ${containerClassName} ${className}`}>
      {searchable && (
        <TableSearch 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          placeholder={searchPlaceholder} 
        />
      )}
      
      <div className="rounded-md border overflow-hidden">
        <div 
          className="overflow-x-auto" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%'
          }}
        >
          <Table className="min-w-full">
            <TableHeader 
              columns={columns} 
              onSort={onSort} 
              sortConfig={sortConfig} 
              stickyHeader={stickyHeader}
              hasActions={!!actions}
            />
            <TableBodyComponent 
              columns={columns} 
              data={paginatedData} 
              actions={actions}
              noDataMessage={noDataMessage}
              emptyState={emptyState}
            />
          </Table>
        </div>
      </div>
      
      {pagination && pageCount > 1 && (
        <TablePagination 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage} 
          totalPages={pageCount}
          pageCount={pageCount} 
          itemCount={filteredData.length} 
          itemsPerPage={itemsPerPage} 
        />
      )}
    </div>
  );
};

// Add default export for backward compatibility
export default DataTable;

// Also add named export for more modern import style
export { DataTable };
