// util functions for exporting and printing account statements with Arabic support

/**
 * Export statement as CSV file (UTF-8 BOM for Arabic support)
 */
export function exportStatementToCSV(statement: any) {
  const headers = [
    'التاريخ',
    'الوصف',
    'مدين',
    'دائن',
    'الرصيد'
  ];
  let csv = headers.join(',') + '\n';
  statement.entries.forEach((entry: any) => {
    csv += [
      entry.date,
      '"' + (entry.description || '') + '"',
      entry.debit ? entry.debit.toFixed(2) : '-',
      entry.credit ? entry.credit.toFixed(2) : '-',
      entry.balance ? entry.balance.toFixed(2) : '-'
    ].join(',') + '\n';
  });
  // Add BOM for Excel Arabic support
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${statement.party_name}_كشف_الحساب.csv`;
  link.click();
}

/**
 * Print statement in a new window with RTL and Arabic font
 */
export function printStatement(statement: any) {
  let html = `<html dir="rtl" lang="ar"><head><meta charset='utf-8'><title>كشف حساب</title><style>
    body { font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif; direction: rtl; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #333; padding: 8px; text-align: right; }
    th { background: #f3f3f3; }
    h2 { text-align: center; }
  </style></head><body>`;
  html += `<h2>كشف حساب: ${statement.party_name}</h2>`;
  html += `<p>نوع الطرف: ${statement.party_type === 'customer' ? 'عميل' : statement.party_type === 'supplier' ? 'مورّد' : 'آخر'}</p>`;
  html += `<p>الرصيد الافتتاحي: ${statement.opening_balance.toFixed(2)}</p>`;
  html += `<table><thead><tr><th>التاريخ</th><th>الوصف</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>`;
  statement.entries.forEach((entry: any) => {
    html += `<tr>`;
    html += `<td>${entry.date}</td>`;
    html += `<td>${entry.description || ''}</td>`;
    html += `<td>${entry.debit ? entry.debit.toFixed(2) : '-'}</td>`;
    html += `<td>${entry.credit ? entry.credit.toFixed(2) : '-'}</td>`;
    html += `<td>${entry.balance ? entry.balance.toFixed(2) : '-'}</td>`;
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  html += `<p>الرصيد الختامي: ${statement.closing_balance.toFixed(2)}</p>`;
  html += `</body></html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}
