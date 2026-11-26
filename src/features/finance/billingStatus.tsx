import { Tag, Tooltip } from 'antd';

export const billingStatusMeta: Record<string, { label: string; color: string }> = {
  none: { label: 'Chưa có khoản phải thu', color: 'default' },
  pending: { label: 'Chưa thanh toán', color: 'orange' },
  partial: { label: 'Thanh toán một phần', color: 'blue' },
  paid: { label: 'Đã thanh toán', color: 'green' },
  overdue: { label: 'Quá hạn', color: 'red' },
  cancelled: { label: 'Đã hủy', color: 'default' },
  refunded: { label: 'Đã hoàn tiền', color: 'default' },
  unknown: { label: 'Chưa xác định', color: 'default' },
};
export const getInvoiceStatus = (invoice: any) => billingStatusMeta[invoice?.collection_status] ? invoice.collection_status as string : 'unknown';
export const isCollectibleInvoice = (invoice: any) => ['pending', 'partial', 'overdue'].includes(getInvoiceStatus(invoice)) && Number(invoice.remaining_amount) > 0;
export const invoiceCollectionLink = (id: number) => `/finance/payments?invoice_id=${id}`;
export const billingDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '—';
// Translate known automatic notes for old records without rewriting stored notes.
export const billingNote = (value?: string | null) => (value || '')
  .replace(/^Auto-created when student was enrolled into class(?=\r?\n|$)/, 'Khoản thu được tạo tự động khi ghi danh vào lớp')
  .replace(/^Auto-created from Lead #(\d+)(?=\r?\n|$)/, 'Khoản thu được tạo tự động từ khách hàng tiềm năng #$1');
export const sumBillingMoney = (items: any[], field: string) => items.reduce((sum, item) => sum + Math.round(Number(item[field] || 0) * 100), 0) / 100;
export function BillingStatusTag({ status, remaining }: { status?: string; remaining?: number }) {
  const meta = billingStatusMeta[status || 'unknown'] || billingStatusMeta.unknown;
  return <Tooltip title={remaining === undefined ? undefined : `Còn phải thu: ${Number(remaining).toLocaleString('vi-VN')} đ`}>
    <Tag color={meta.color}>{meta.label}</Tag>
  </Tooltip>;
}
