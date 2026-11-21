import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Empty, Input, Modal, Space, Spin, Table, Typography, message } from 'antd';
import { PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { financeService } from '../../services/api/finance.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import { BillingStatusTag, billingDate, billingNote, invoiceCollectionLink, isCollectibleInvoice } from './billingStatus';
import { paymentMethodLabels, paymentTime, printReceipt } from './printReceipt';

const money = (value: unknown) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const itemLabels: Record<string, string> = { tuition: 'Học phí', registration: 'Đăng ký', material: 'Tài liệu', exam: 'Thi', other: 'Khác' };

export function InvoiceDetailDrawer({ invoiceId, onClose, onChanged }: {
  invoiceId: number | null; onClose: () => void; onChanged?: () => void;
}) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const key = `${user?.id}:${user?.role}:${token}:${invoiceId}`;
  const currentKey = useRef(key); currentKey.current = key;
  const [owner, setOwner] = useState('');
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [printing, setPrinting] = useState<number | null>(null);
  const printRef = useRef(false);

  useEffect(() => () => { currentKey.current = ''; }, []);
  useEffect(() => {
    setCancelOpen(false); setReason('');
  }, [key]);
  useEffect(() => {
    setInvoice(null); setError(''); setOwner(key);
    if (!invoiceId || !user) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    financeService.getInvoiceById(invoiceId, controller.signal).then(result => {
      if (!controller.signal.aborted) setInvoice(result.data);
    }).catch(err => {
      if (!controller.signal.aborted) setError(err.message || 'Không tải được chi tiết khoản phải thu');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [key, reload]);

  const visible = owner === key ? invoice : null;
  const canCancel = user?.role === 'admin' && visible && ['pending', 'overdue'].includes(visible.status)
    && !visible.payments?.length && !visible.receipts?.length;

  const cancel = async () => {
    if (!invoiceId || savingRef.current || !reason.trim()) return;
    const actionKey = key;
    savingRef.current = true; setSaving(true);
    try {
      await financeService.cancelInvoice(invoiceId, reason.trim());
      if (currentKey.current !== actionKey) return;
      message.success('Đã hủy khoản phải thu'); setCancelOpen(false); setReload(value => value + 1); onChanged?.();
    } catch (err: any) {
      if (currentKey.current === actionKey) {
        message.error(err.message || 'Hủy thất bại');
        if ([404, 409].includes(err.status)) { setCancelOpen(false); setReload(value => value + 1); onChanged?.(); }
      }
    } finally { savingRef.current = false; setSaving(false); }
  };

  const print = async (receiptId: number) => {
    if (!invoiceId || printRef.current) return;
    const actionKey = key;
    printRef.current = true; setPrinting(receiptId);
    try {
      const result = await financeService.getReceipt(invoiceId, receiptId);
      if (currentKey.current === actionKey) printReceipt(result.data);
    } catch (err: any) { if (currentKey.current === actionKey) message.error(err.message || 'Không tải được phiếu thu'); }
    finally { printRef.current = false; setPrinting(null); }
  };

  return <>
    <Drawer title="Chi tiết khoản phải thu" open={!!invoiceId} onClose={onClose} size={760}
      closable={!saving} maskClosable={!saving} keyboard={!saving}
      extra={<Button icon={<ReloadOutlined />} disabled={loading || saving} onClick={() => setReload(value => value + 1)}>Tải lại</Button>}>
      {loading || owner !== key ? <Spin /> : error ? <Alert type="error" showIcon message={error}
        action={<Button onClick={() => setReload(value => value + 1)}>Thử lại</Button>} /> : visible ? <Space direction="vertical" size={20} className="w-full">
        <Descriptions column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Mã khoản thu">{visible.invoice_no}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái"><BillingStatusTag status={visible.collection_status} /></Descriptions.Item>
          <Descriptions.Item label="Học viên">{visible.student?.full_name}</Descriptions.Item>
          <Descriptions.Item label="Lớp">{visible.class?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Hạn thu">{billingDate(visible.due_date)}</Descriptions.Item>
        </Descriptions>
        <Table<any> size="small" rowKey="id" pagination={false} dataSource={visible.items || []} scroll={{ x: 450 }} columns={[
          { title: 'Khoản phí', dataIndex: 'description' },
          { title: 'Loại', dataIndex: 'type', render: value => itemLabels[value] || value },
          { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: money },
        ]} />
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Tổng phí">{money(visible.total_amount)}</Descriptions.Item>
          <Descriptions.Item label="Giảm giá">{money(visible.discount_amount)}</Descriptions.Item>
          <Descriptions.Item label="Sau giảm giá">{money(visible.payable_amount)}</Descriptions.Item>
          <Descriptions.Item label="Đã thu">{money(visible.paid_amount)}</Descriptions.Item>
          <Descriptions.Item label="Còn phải thu"><Typography.Text strong>{money(visible.remaining_amount)}</Typography.Text></Descriptions.Item>
        </Descriptions>
        {visible.notes && <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{billingNote(visible.notes)}</Typography.Paragraph>}
        <div className="w-full">
          <Typography.Title level={5}>Lịch sử thanh toán</Typography.Title>
          <Table<any> size="small" rowKey="id" pagination={false} dataSource={visible.payments || []} scroll={{ x: 650 }} columns={[
            { title: 'Ngày thu', dataIndex: 'paid_at', render: paymentTime },
            { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: money },
            { title: 'Phương thức', dataIndex: 'method', render: value => paymentMethodLabels[value] || value },
            { title: 'Người thu', render: (_, row) => row.receiver?.full_name || '—' },
            { title: 'Mã đối soát', dataIndex: 'reference_code', render: value => value || '—' },
            { title: 'Ghi chú', dataIndex: 'notes', render: value => value || '—' },
          ]} locale={{ emptyText: 'Chưa ghi nhận thanh toán' }} />
        </div>
        <div className="w-full">
          <Typography.Title level={5}>Phiếu thu</Typography.Title>
          <Table<any> size="small" rowKey="id" pagination={false} dataSource={visible.receipts || []} columns={[
            { title: 'Số phiếu', dataIndex: 'receipt_no' },
            { title: 'Ngày lập', dataIndex: 'issued_at', render: paymentTime },
            { title: '', render: (_, row) => <Button icon={<PrinterOutlined />} loading={printing === row.id}
              disabled={printing !== null || !row.transaction_id} onClick={() => print(row.id)}>In phiếu</Button> },
          ]} locale={{ emptyText: 'Chưa có phiếu thu' }} />
          {visible.receipts?.some((row: any) => !row.transaction_id) && <Typography.Text type="secondary">Phiếu cũ chưa liên kết giao dịch cần được kiểm tra trước khi in.</Typography.Text>}
        </div>
        <Space wrap>
          {['admin', 'sale'].includes(user?.role || '') && isCollectibleInvoice(visible) && <Button type="primary"
            onClick={() => { onClose(); navigate(invoiceCollectionLink(visible.id)); }}>Đến màn hình thu tiền</Button>}
          {canCancel && <Button danger onClick={() => setCancelOpen(true)}>Hủy khoản phải thu</Button>}
        </Space>
      </Space> : <Empty />}
    </Drawer>
    <Modal title="Hủy khoản phải thu chưa thanh toán" open={cancelOpen && !!canCancel} onCancel={() => setCancelOpen(false)}
      onOk={cancel} okText="Xác nhận hủy" okButtonProps={{ danger: true, disabled: !reason.trim() }} confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} keyboard={!saving}>
      <Typography.Paragraph>Khoản thu sẽ ngừng tính công nợ. Lịch sử và lý do hủy vẫn được lưu.</Typography.Paragraph>
      <Input.TextArea value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} showCount rows={3} placeholder="Lý do hủy (bắt buộc)" />
    </Modal>
  </>;
}
