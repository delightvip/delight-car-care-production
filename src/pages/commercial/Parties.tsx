
import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import PartyService, { Party } from '@/services/PartyService';
import { PartyList } from '@/components/parties/PartyForm';
import { PartyForm } from '@/components/parties/PartyForm';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const Parties = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const partyService = PartyService.getInstance();

  // استعلام جلب بيانات الأطراف التجارية
  const { data: parties, isLoading, error, refetch } = useQuery({
    queryKey: ['parties'],
    queryFn: () => partyService.getParties(),
    refetchInterval: 60000, // تحديث كل دقيقة
    refetchOnWindowFocus: false,
  });

  // تصفية البيانات حسب النوع المحدد
  const filteredParties = React.useMemo(() => {
    if (!parties) return [];
    
    if (activeTab === 'all') return parties;
    return parties.filter(party => party.type === activeTab);
  }, [parties, activeTab]);

  const handleAddParty = async (party: Omit<Party, 'id' | 'balance' | 'created_at'>) => {
    await partyService.addParty(party);
    refetch();
    setIsAddDialogOpen(false);
  };

  const handleUpdateParty = async (id: string, party: Partial<Party>) => {
    await partyService.updateParty(id, party);
    refetch();
  };

  const handleDeleteParty = async (id: string) => {
    await partyService.deleteParty(id);
    refetch();
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-row items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">الأطراف التجارية</h1>
              <p className="text-muted-foreground">إدارة العملاء والموردين والأطراف الأخرى</p>
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">الأطراف التجارية</h1>
          <div className="bg-destructive/10 p-4 rounded-md text-destructive">
            <p>حدث خطأ أثناء تحميل البيانات. الرجاء المحاولة مرة أخرى.</p>
            <p>{String(error)}</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">الأطراف التجارية</h1>
            <p className="text-muted-foreground">إدارة العملاء والموردين والأطراف الأخرى</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> إضافة طرف جديد
          </Button>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="customer">العملاء</TabsTrigger>
            <TabsTrigger value="supplier">الموردين</TabsTrigger>
            <TabsTrigger value="other">أخرى</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <PartyList 
              parties={filteredParties}
              onAddParty={handleAddParty}
              onUpdateParty={handleUpdateParty}
              onDeleteParty={handleDeleteParty}
              title={
                activeTab === 'all' ? 'جميع الأطراف' :
                activeTab === 'customer' ? 'العملاء' :
                activeTab === 'supplier' ? 'الموردين' : 'أطراف أخرى'
              }
              type={activeTab as any}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* نافذة إضافة طرف جديد */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>إضافة طرف جديد</DialogTitle>
          </DialogHeader>
          <PartyForm onSubmit={handleAddParty} />
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default Parties;
