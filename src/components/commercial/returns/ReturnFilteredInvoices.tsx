
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CommercialService from '@/services/CommercialService';

interface ReturnFilteredInvoicesProps {
  returnType: 'sales_return' | 'purchase_return';
  partyId?: string;
  onInvoicesLoaded: (invoices: any[]) => void;
}

export default function ReturnFilteredInvoices({ 
  returnType,
  partyId,
  onInvoicesLoaded
}: ReturnFilteredInvoicesProps) {
  const commercialService = CommercialService.getInstance();

  // استعلام الفواتير
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => commercialService.getInvoices(),
  });

  // تصفية الفواتير حسب نوع المرتجع والطرف
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    
    let filtered = invoices.filter(inv => 
      returnType === 'sales_return' 
        ? inv.invoice_type === 'sale' 
        : inv.invoice_type === 'purchase'
    );
    
    // إذا تم تحديد طرف معين، نقوم بتصفية الفواتير حسب هذا الطرف
    if (partyId) {
      filtered = filtered.filter(inv => inv.party_id === partyId);
    }
    
    return filtered;
  }, [invoices, returnType, partyId]);

  // إرسال الفواتير المصفاة للمكون الأب
  useEffect(() => {
    onInvoicesLoaded(filteredInvoices);
  }, [filteredInvoices, onInvoicesLoaded]);

  return null; // هذا المكون لا يعرض أي واجهة مستخدم، إنه فقط لمعالجة البيانات
}
