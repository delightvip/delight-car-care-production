
import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface PartySearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function PartySearch({ searchQuery, setSearchQuery }: PartySearchProps) {
  return (
    <div className="flex items-center mb-4">
      <Search className="mr-2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="البحث حسب الاسم أو رقم الهاتف..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />
    </div>
  );
}
