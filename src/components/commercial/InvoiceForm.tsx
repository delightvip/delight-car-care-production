
// Fix the status type in InvoiceForm.tsx
// Update the status value assignment
// Replace 'unpaid' with 'pending' and 'partial' with 'partially_paid'

const formValues = {
  party_id: values.party_id,
  date: format(values.date, 'yyyy-MM-dd'),
  invoice_type: values.invoice_type,
  total_amount: values.total_amount,
  payment_status: 'draft' as const,
  status: values.invoice_type === 'sale' ? 'pending' as const : 'pending' as const, // Changed from 'unpaid' to 'pending'
  notes: values.notes,
  party_name: selectedParty?.name,
  items: selectedItems.map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    item_type: item.item_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.quantity * item.unit_price
  }))
};
