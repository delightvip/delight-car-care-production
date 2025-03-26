
// Fix the status type in Invoices.tsx
// Update the formattedData object creation to map status to the correct enum values

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
