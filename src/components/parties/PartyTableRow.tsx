
import React from 'react';
import { 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  FileText 
} from 'lucide-react';
import { Party } from '@/services/PartyService';

interface PartyTableRowProps {
  party: Party;
  onEdit: (party: Party) => void;
  onDelete: (party: Party) => void;
  onViewDetails: (party: Party) => void;
}

export function PartyTableRow({ 
  party, 
  onEdit, 
  onDelete, 
  onViewDetails 
}: PartyTableRowProps) {
  return (
    <TableRow key={party.id}>
      <TableCell className="font-medium">{party.name}</TableCell>
      <TableCell>
        {party.type === 'customer' ? 'عميل' : 
         party.type === 'supplier' ? 'مورّد' : 'أخرى'}
      </TableCell>
      <TableCell>{party.phone || '-'}</TableCell>
      <TableCell className="text-right">
        <span className={party.balance > 0 ? 'text-red-600' : party.balance < 0 ? 'text-green-600' : ''}>
          {Math.abs(party.balance).toFixed(2)} {party.balance > 0 ? '(مدين)' : party.balance < 0 ? '(دائن)' : ''}
        </span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">فتح القائمة</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewDetails(party)}>
              <FileText className="mr-2 h-4 w-4" />
              <span>عرض التفاصيل</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(party)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>تعديل</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(party)}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>حذف</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
