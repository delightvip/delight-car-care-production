
export interface Column {
  key: string;
  title: string;
  render?: (value: any, record: any) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
}

export interface DataTableProps {
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
  containerClassName?: string;
  className?: string;
}

export interface TableSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder: string;
}

export interface TablePaginationProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageCount: number;
  itemCount: number;
  itemsPerPage: number;
}
