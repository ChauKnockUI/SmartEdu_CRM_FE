import { useState } from 'react';
import { Form, Input, Modal, Select, Space, message } from 'antd';
import { leadService } from '@/services/api/lead.service';

interface MarkLostModalProps {
  open: boolean;
  lead: any;
  onCancel: () => void;
  onSuccess: () => void;
}

const LOST_REASONS = [
  { label: 'Học phí cao / Chưa đủ khả năng tài chính', value: 'Học phí cao / Chưa đủ tài chính' },
  { label: 'Lịch học không phù hợp (trùng giờ làm/học)', value: 'Lịch học không phù hợp' },
  { label: 'Đã đăng ký học tại trung tâm khác', value: 'Đã chọn trung tâm khác' },
  { label: 'Không liên lạc được (Thuê bao, sai số, không nghe máy)', value: 'Không liên lạc được' },
  { label: 'Chưa có nhu cầu học lúc này / Cần cân nhắc thêm', value: 'Chưa có nhu cầu học' },
  { label: 'Lý do khác', value: 'Khác' },
];

export function MarkLostModal({ open, lead, onCancel, onSuccess }: MarkLostModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: any) => {
    if (!lead?.id) return;
    try {
      setSubmitting(true);
      const lostReason = values.reason === 'Khác' && values.customReason
        ? `Khác: ${values.customReason}`
        : values.reason;

      await leadService.update(String(lead.id), {
        status: 'lost',
        lost_reason: lostReason,
        notes: values.notes,
      });

      message.success(`Đã chuyển lead "${lead.full_name}" sang trạng thái Thất bại (Lost)`);
      form.resetFields();
      onSuccess();
    } catch (err: any) {
      message.error(err.message || 'Không thể cập nhật trạng thái thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Đánh dấu Lead thất bại (Lost)"
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      okText="Xác nhận Lost"
      okButtonProps={{ danger: true, loading: submitting }}
      cancelText="Hủy"
      onOk={() => form.submit()}
      destroyOnClose
    >
      <div className="mb-4 text-sm text-gray-500">
        Thu thập lý do mất lead giúp hệ thống phân tích điểm nghẽn phễu bán hàng và tối ưu chiến lược tuyển sinh.
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="reason"
          label="Lý do thất bại chính"
          rules={[{ required: true, message: 'Vui lòng chọn lý do thất bại' }]}
        >
          <Select
            placeholder="Chọn lý do chính"
            options={LOST_REASONS}
          />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.reason !== curr.reason}
        >
          {({ getFieldValue }) =>
            getFieldValue('reason') === 'Khác' ? (
              <Form.Item
                name="customReason"
                label="Chi tiết lý do khác"
                rules={[{ required: true, message: 'Vui lòng nhập lý do cụ thể' }]}
              >
                <Input placeholder="Nhập lý do cụ thể..." />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        <Form.Item name="notes" label="Ghi chú thêm (Tùy chọn)">
          <Input.TextArea
            rows={3}
            placeholder="Ghi chú thêm về phản hồi của khách hàng hoặc đề xuất follow-up lại trong tương lai..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
