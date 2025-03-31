import { ReactNode } from "react";

export interface Column {
  key: string;
  title: string;
  render?: (record: any) => ReactNode;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  // Keep older properties for backward compatibility
  accessorKey?: string;
  cell?: ({ row }: any) => ReactNode;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps {
  columns: Column[];
  data: any[];
  searchable?: boolean;
  searchKeys?: string[];
  pagination?: boolean;
  itemsPerPage?: number;
  actions?: (record: any) => ReactNode;
  searchPlaceholder?: string;
  noDataMessage?: string;
  onSort?: (key: string) => void;
  sortConfig?: SortConfig | null;
  stickyHeader?: boolean;
  containerClassName?: string;
  className?: string;
  emptyState?: ReactNode;
}

export interface TableSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
}
