import { billingNote } from './billingStatus';

export const paymentMethodLabels: Record<string, string> = {
  cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', momo: 'MoMo', vnpay: 'VNPay', other: 'Khác',
};
export const paymentTime = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

// Only print the persisted receipt and its linked transaction, never the invoice's current balance.
export function printReceipt(receipt: any) {
  if (!receipt.transaction) throw new Error('Phiếu thu chưa liên kết giao dịch.');
  document.getElementById('crm-receipt-print')?.remove();
  const frame = document.createElement('iframe');
  frame.id = 'crm-receipt-print'; frame.title = 'In phiếu thu';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;bottom:0;right:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument, win = frame.contentWindow;
  if (!doc || !win) { frame.remove(); throw new Error('Không mở được bản in.'); }
  doc.open();
  doc.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu thu</title><style>body{font:15px Arial,sans-serif;color:#111;margin:32px;line-height:1.6}h1{text-align:center;font-size:24px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}.amount{font-size:20px;font-weight:bold;border-block:1px solid #ddd;padding:12px 0}@page{margin:18mm}</style></head><body></body></html>');
  doc.close();
  const add = (tag: string, text: string, className?: string) => {
    const element = doc.createElement(tag);
    element.textContent = text; if (className) element.className = className;
    doc.body.appendChild(element);
  };
  const tx = receipt.transaction;
  add('p', receipt.center_name || ''); add('h1', 'PHIẾU THU');
  add('p', `Số phiếu: ${receipt.receipt_no}`);
  add('p', `Ngày lập: ${paymentTime(receipt.issued_at)}`);
  add('p', `Học viên: ${receipt.invoice.student?.full_name || '—'}`);
  add('p', `Lớp: ${receipt.invoice.class?.name || '—'}`);
  add('p', `Khoản phải thu: ${receipt.invoice.invoice_no}`);
  add('p', `Đã nhận: ${Number(tx.amount).toLocaleString('vi-VN')} đ`, 'amount');
  add('p', `Phương thức: ${paymentMethodLabels[tx.method] || tx.method}`);
  add('p', `Ngày thu: ${paymentTime(tx.paid_at)}`);
  if (tx.reference_code) add('p', `Mã giao dịch: ${tx.reference_code}`);
  add('p', `Người thu: ${tx.receiver?.full_name || 'Chưa có thông tin'}`);
  add('p', `Người lập phiếu: ${receipt.issuer?.full_name || 'Chưa có thông tin'}`);
  if (tx.notes) add('p', `Ghi chú giao dịch: ${billingNote(tx.notes)}`);
  if (receipt.notes) add('p', `Ghi chú phiếu: ${billingNote(receipt.notes)}`);
  win.onafterprint = () => frame.remove();
  // Some browsers do not dispatch afterprint on cancellation.
  window.setTimeout(() => frame.remove(), 600_000);
  try { win.focus(); win.print(); } catch (error) { frame.remove(); throw error; }
}
