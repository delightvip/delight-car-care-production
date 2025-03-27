
import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Party } from '@/services/PartyService';
import { useNavigate } from 'react-router-dom';
import { PartyTableRow } from './PartyTableRow';
import { AddPartyDialog, DeleteConfirmationDialog, EditPartyDialog } from './PartyDialogs';
import { PartySearch } from './PartySearch';

interface PartyListProps {
  parties: Party[];
  onAddParty: (party: Omit<Party, 'id' | 'balance' | 'created_at'>) => void;
  onUpdateParty: (id: string, party: Partial<Party>) => void;
  onDeleteParty: (id: string) => void;
  title?: string;
  type?: 'all' | 'customer' | 'supplier' | 'other';
}

export function PartyList({ 
  parties, 
  onAddParty, 
  onUpdateParty, 
  onDeleteParty,
  title = 'الأطراف التجارية',
  type = 'all'
}: PartyListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const navigate = useNavigate();

  // تصفية الأطراف حسب البحث
  const filteredParties = parties.filter(party => 
    party.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    party.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (party: Party) => {
    setPartyToDelete(party);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (partyToDelete) {
      onDeleteParty(partyToDelete.id);
      setIsDeleteDialogOpen(false);
      setPartyToDelete(null);
    }
  };

  const handleEditClick = (party: Party) => {
    setEditingParty(party);
    setIsEditDialogOpen(true);
  };

  const handleAddSubmit = (data: Omit<Party, 'id' | 'balance' | 'created_at'>) => {
    onAddParty(data);
    setIsAddDialogOpen(false);
  };

  const handleEditSubmit = (data: Partial<Party>) => {
    if (editingParty) {
      onUpdateParty(editingParty.id, data);
      setIsEditDialogOpen(false);
      setEditingParty(null);
    }
  };
  
  const handleViewDetails = (party: Party) => {
    navigate(`/commercial/parties/${party.id}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" /> إضافة
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <PartySearch 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
        />
        
        <ScrollArea className="h-[450px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">الاسم</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>رقم الهاتف</TableHead>
                <TableHead className="text-right">الرصيد</TableHead>
                <TableHead className="text-center w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParties.length > 0 ? (
                filteredParties.map((party) => (
                  <PartyTableRow
                    key={party.id}
                    party={party}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onViewDetails={handleViewDetails}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    لا توجد بيانات للعرض
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {/* Dialogs */}
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          party={partyToDelete}
          onConfirm={confirmDelete}
        />
        
        <AddPartyDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSubmit={handleAddSubmit}
        />
        
        <EditPartyDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          party={editingParty}
          onSubmit={handleEditSubmit}
        />
      </CardContent>
    </Card>
  );
}
