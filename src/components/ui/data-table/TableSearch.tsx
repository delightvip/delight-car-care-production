
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { TableSearchProps } from './types';

const TableSearch: React.FC<TableSearchProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  placeholder 
}) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 pr-4"
      />
    </div>
  );
};

export default TableSearch;
