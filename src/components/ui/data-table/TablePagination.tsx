
import React from 'react';
import { Button } from '../button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  pageCount?: number;
  itemCount?: number;
  itemsPerPage?: number;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  setCurrentPage,
  pageCount,
  itemCount,
  itemsPerPage,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    setCurrentPage(Math.max(1, currentPage - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-2">
      {itemCount && itemsPerPage && (
        <div className="text-sm text-muted-foreground">
          عرض {Math.min(itemCount, (currentPage - 1) * itemsPerPage! + 1)} إلى{' '}
          {Math.min(itemCount, currentPage * itemsPerPage!)} من أصل {itemCount} عنصر
        </div>
      )}
      <div className="flex items-center space-x-2 space-x-reverse rtl:space-x-reverse">
        <Button
          variant="outline"
          size="sm"
          onClick={goToFirstPage}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToLastPage}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Add default export for compatibility
export default TablePagination;
