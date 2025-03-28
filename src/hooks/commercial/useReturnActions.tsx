
import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import CommercialService from '@/services/CommercialService';
import { Return } from '@/types/returns';

export const useReturnActions = () => {
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [viewingReturn, setViewingReturn] = useState<Return | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const commercialService = CommercialService.getInstance();

  const handleCreateReturn = async (returnData: Omit<Return, 'id' | 'created_at'>): Promise<void> => {
    try {
      setIsProcessing(true);
      console.log('Creating return with data:', returnData);
      
      const result = await commercialService.createReturn({
        ...returnData,
        payment_status: 'draft'
      });
      
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        toast.success('تم إنشاء المرتجع بنجاح');
        return result;
      } else {
        toast.error('حدث خطأ أثناء إنشاء المرتجع');
        throw new Error('فشل إنشاء المرتجع');
      }
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReturn = async (): Promise<void> => {
    if (!selectedReturnId) return;
    
    try {
      setIsProcessing(true);
      console.log('Confirming return:', selectedReturnId);
      const success = await commercialService.confirmReturn(selectedReturnId);
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        
        toast.success('تم تأكيد المرتجع بنجاح');
      } else {
        toast.error('حدث خطأ أثناء تأكيد المرتجع');
      }
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
    } finally {
      setIsConfirmDialogOpen(false);
      setSelectedReturnId(null);
      setIsProcessing(false);
      setIsDetailsOpen(false);
    }
  };

  const handleCancelReturn = async (): Promise<void> => {
    if (!selectedReturnId) return;
    
    try {
      setIsProcessing(true);
      console.log('Cancelling return:', selectedReturnId);
      const success = await commercialService.cancelReturn(selectedReturnId);
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        queryClient.invalidateQueries({ queryKey: ['parties'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        
        toast.success('تم إلغاء المرتجع بنجاح');
      } else {
        toast.error('حدث خطأ أثناء إلغاء المرتجع');
      }
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
    } finally {
      setIsCancelDialogOpen(false);
      setSelectedReturnId(null);
      setIsProcessing(false);
      setIsDetailsOpen(false);
    }
  };

  const handleDeleteReturn = async (): Promise<void> => {
    if (!selectedReturnId) return;
    
    try {
      setIsProcessing(true);
      console.log('Deleting return:', selectedReturnId);
      const success = await commercialService.deleteReturn(selectedReturnId);
      
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['returns'] });
        toast.success('تم حذف المرتجع بنجاح');
      } else {
        toast.error('حدث خطأ أثناء حذف المرتجع');
      }
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedReturnId(null);
      setIsProcessing(false);
      setIsDetailsOpen(false);
    }
  };

  const handleViewDetails = async (returnId: string): Promise<void> => {
    try {
      console.log('Viewing return details:', returnId);
      const returnData = await commercialService.getReturnById(returnId);
      if (returnData) {
        setViewingReturn(returnData as Return);
        setSelectedReturnId(returnId);
        setIsDetailsOpen(true);
      } else {
        toast.error('لم يتم العثور على بيانات المرتجع');
      }
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجع');
    }
  };

  return {
    selectedReturnId,
    viewingReturn,
    isDetailsOpen,
    isProcessing,
    isConfirmDialogOpen,
    isCancelDialogOpen,
    isDeleteDialogOpen,
    setSelectedReturnId,
    setViewingReturn,
    setIsDetailsOpen,
    setIsConfirmDialogOpen,
    setIsCancelDialogOpen,
    setIsDeleteDialogOpen,
    handleCreateReturn,
    handleConfirmReturn,
    handleCancelReturn,
    handleDeleteReturn,
    handleViewDetails
  };
};
