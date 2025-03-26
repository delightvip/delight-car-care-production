import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';

const Invoices = () => {
  const [invoiceData, setInvoiceData] = useState({
    status: 'draft',
    date: '2023-01-01',
    invoice_type: 'sale',
    notes: 'Sample notes',
    party_id: '12345',
    total_amount: 100.00,
    party_name: 'Sample Party',
    items: [
      { name: 'Item 1', quantity: 1, price: 50.00 },
      { name: 'Item 2', quantity: 2, price: 25.00 }
    ]
  });

  const formattedData = {
    ...invoiceData,
    payment_status: 'draft' as "draft" | "confirmed" | "cancelled",
    status: (() => {
      // Map the status to the expected enum values
      switch(invoiceData.status) {
        case 'paid': return 'paid';
        case 'partial': return 'partially_paid';
        case 'unpaid': return 'pending';
        default: return 'draft';
      }
    })() as "draft" | "pending" | "paid" | "partially_paid" | "cancelled" | "overdue",
    date: invoiceData.date,
    invoice_type: invoiceData.invoice_type as "sale" | "purchase",
    notes: invoiceData.notes,
    party_id: invoiceData.party_id,
    total_amount: invoiceData.total_amount,
    party_name: invoiceData.party_name,
    items: invoiceData.items
  };

  return (
    <PageTransition>
      {/* Render the formattedData */}
    </PageTransition>
  );
};

export default Invoices;
