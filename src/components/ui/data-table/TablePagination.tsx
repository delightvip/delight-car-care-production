
import React from 'react';
import { TablePaginationProps } from './types';

const TablePagination: React.FC<TablePaginationProps> = ({ 
  currentPage, 
  setCurrentPage, 
  pageCount, 
  itemCount, 
  itemsPerPage 
}) => {
  if (pageCount <= 1) return null;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
      <div className="text-sm text-muted-foreground">
        عرض {Math.min(itemCount, (currentPage - 1) * itemsPerPage + 1)} إلى{' '}
        {Math.min(itemCount, currentPage * itemsPerPage)} من أصل {itemCount} عنصر
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
  );
};

export default TablePagination;
