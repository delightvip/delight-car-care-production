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
  FileDown,
  ExternalLink
} from 'lucide-react';
import { Party } from '@/services/PartyService';
import { PartyForm } from './PartyForm';
import { useNavigate } from 'react-router-dom';

interface PartyListProps {
  parties: Party[];
  onAddParty: (party: Omit<Party, 'id' | 'balance' | 'created_at'>) => void;
  onUpdateParty: (id: string, party: Partial<Party>) => void;
  onDeleteParty: (id: string) => void;
  title?: string;
  type?: 'all' | 'customer' | 'supplier' | 'other';
  onTypeChange?: (type: 'all' | 'customer' | 'supplier' | 'other') => void;
}

export function PartyList({ 
  parties, 
  onAddParty, 
  onUpdateParty, 
  onDeleteParty,
  title = 'الأطراف التجارية',
  type = 'all',
  onTypeChange
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
    (party.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    party.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    party.code?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (type === 'all' || party.type === type)
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
    <Card className="shadow-lg rounded-xl border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 pb-2 border-b border-gray-100 dark:border-zinc-800 bg-gradient-to-l from-gray-50 via-white to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
        <CardTitle className="text-2xl font-bold text-primary-700 dark:text-primary-300 tracking-tight">{title}</CardTitle>
        <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
          <Input
            placeholder="بحث بالاسم، الهاتف، البريد، الكود..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-xs border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-primary-200"
            dir="rtl"
          />
          <select
            value={type}
            onChange={e => onTypeChange?.(e.target.value as 'all' | 'customer' | 'supplier' | 'other')}
            className="border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm bg-background focus:ring-2 focus:ring-primary-200"
            style={{ minWidth: 120 }}
            disabled={!onTypeChange}
          >
            <option value="all">كل الأنواع</option>
            <option value="customer">العملاء</option>
            <option value="supplier">الموردين</option>
            <option value="other">أخرى</option>
          </select>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-green-200 hover:bg-green-300 text-green-900 font-bold rounded-lg shadow border-2 border-green-300 focus:ring-2 focus:ring-green-100 focus:border-green-400 px-4 py-2 flex items-center gap-2"
            style={{ backgroundColor: '#bbf7d0', color: '#166534', borderColor: '#86efac' }}
          >
            <Plus className="h-5 w-5" />
            إضافة طرف جديد
          </Button>
        </div>
      </CardHeader>
      <CardContent className="bg-white dark:bg-zinc-900 px-0 pb-0">
        <div className="overflow-x-auto rounded-b-xl">
          <ScrollArea className="h-[450px]">
            <Table className="min-w-[900px] text-sm rtl text-right">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-zinc-800">
                  <TableHead className="font-bold text-gray-700 dark:text-gray-300">الكود</TableHead>
                  <TableHead className="font-bold text-gray-700 dark:text-gray-300">الاسم</TableHead>
                  <TableHead className="font-bold text-gray-700 dark:text-gray-300">النوع</TableHead>
                  <TableHead className="font-bold text-gray-700 dark:text-gray-300">الهاتف</TableHead>
                  <TableHead className="font-bold text-gray-700 dark:text-gray-300">البريد الإلكتروني</TableHead>
                  <TableHead className="font-bold text-gray-700 dark:text-gray-300">العنوان</TableHead>
                  <TableHead className="font-bold text-gray-700 dark:text-gray-300 text-right">الرصيد</TableHead>
                  <TableHead className="font-bold text-gray-700 dark:text-gray-300">تاريخ الإضافة</TableHead>
                  <TableHead className="font-bold text-gray-700 dark:text-gray-300">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParties.length > 0 ? (
                  filteredParties.map(party => (
                    <TableRow key={party.id} className="hover:bg-primary-50/40 dark:hover:bg-zinc-800/40 transition-colors">
                      <TableCell className="font-mono text-xs">{party.code || '-'}</TableCell>
                      <TableCell className="font-semibold">{party.name}</TableCell>
                      <TableCell>
                        <span className={
                          party.type === 'customer' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full text-xs' :
                          party.type === 'supplier' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full text-xs' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-300 px-2 py-1 rounded-full text-xs'
                        }>
                          {party.type === 'customer' ? 'عميل' : party.type === 'supplier' ? 'مورد' : 'أخرى'}
                        </span>
                      </TableCell>
                      <TableCell>{party.phone || '-'}</TableCell>
                      <TableCell>{party.email || '-'}</TableCell>
                      <TableCell>{party.address || '-'}</TableCell>
                      <TableCell className="text-right">
                        <span className={party.balance > 0 ? 'text-red-600 font-bold' : party.balance < 0 ? 'text-green-600 font-bold' : ''}>
                          {Math.abs(party.balance).toFixed(2)} {party.balance > 0 ? '(مدين)' : party.balance < 0 ? '(دائن)' : ''}
                        </span>
                      </TableCell>
                      <TableCell>{party.created_at ? new Date(party.created_at).toLocaleDateString('ar-EG') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-row gap-2 justify-center items-center">
                          <Button
                            variant="outline"
                            size="icon"
                            className="hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                            title="عرض التفاصيل"
                            onClick={() => handleViewDetails(party)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="hover:bg-yellow-100 dark:hover:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700"
                            title="تعديل"
                            onClick={() => handleEditClick(party)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700"
                            title="حذف"
                            onClick={() => handleDeleteClick(party)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      لا توجد بيانات للعرض
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
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
        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
      </CardContent>
    </Card>
  );
}
