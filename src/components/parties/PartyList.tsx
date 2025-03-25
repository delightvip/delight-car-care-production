
import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  FileText, 
  Plus, 
  Search,
  FileDown
} from 'lucide-react';
import { Party } from '@/services/PartyService';
import { PartyForm } from './PartyForm';

interface PartyListProps {
  parties: Party[];
  onAddParty: (party: Omit<Party, 'id' | 'balance' | 'created_at'>) => void;
  onUpdateParty: (id: string, party: Partial<Party>) => void;
  onDeleteParty: (id: string) => void;
  onViewDetails?: (party: Party) => void;
  title?: string;
  type?: 'all' | 'customer' | 'supplier' | 'other';
}

export function PartyList({ 
  parties, 
  onAddParty, 
  onUpdateParty, 
  onDeleteParty,
  onViewDetails,
  title = 'الأطراف التجارية',
  type = 'all'
}: PartyListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <Plus className="h-4 w-4" /> إضافة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>إضافة طرف جديد</DialogTitle>
                <DialogDescription>
                  أدخل بيانات الطرف التجاري الجديد.
                </DialogDescription>
              </DialogHeader>
              <PartyForm onSubmit={handleAddSubmit} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4">
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث حسب الاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
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
                  <TableRow key={party.id}>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell>
                      {party.type === 'customer' ? 'عميل' : 
                       party.type === 'supplier' ? 'مورّد' : 'أخرى'}
                    </TableCell>
                    <TableCell>{party.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <span className={party.balance < 0 ? 'text-red-600' : 'text-green-600'}>
                        {party.balance.toFixed(2)}
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
                          {onViewDetails && (
                            <DropdownMenuItem onClick={() => onViewDetails(party)}>
                              <FileText className="mr-2 h-4 w-4" />
                              <span>عرض التفاصيل</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEditClick(party)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>تعديل</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(party)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>حذف</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
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
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف الطرف التجاري "{partyToDelete?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>تعديل بيانات الطرف</DialogTitle>
              <DialogDescription>
                تعديل بيانات الطرف التجاري.
              </DialogDescription>
            </DialogHeader>
            {editingParty && (
              <PartyForm 
                onSubmit={handleEditSubmit} 
                initialData={editingParty} 
                isEditing={true} 
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
