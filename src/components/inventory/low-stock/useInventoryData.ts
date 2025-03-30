
import { useMemo } from 'react';
import { InventoryItem } from './types';

export const useInventoryData = (data: InventoryItem[], searchTerm: string, sortOrder: 'asc' | 'desc') => {
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);
  
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const percentA = (a.quantity / a.min_stock) * 100;
      const percentB = (b.quantity / b.min_stock) * 100;
      
      return sortOrder === 'asc' 
        ? percentA - percentB 
        : percentB - percentA;
    });
  }, [filteredData, sortOrder]);
  
  return sortedData;
};
