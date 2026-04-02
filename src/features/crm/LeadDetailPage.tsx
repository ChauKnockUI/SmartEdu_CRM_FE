import React, { useState } from 'react';
import { Card, Tabs, Descriptions, Tag, Button, Timeline, Progress, Space, Modal, Form, Input, Select, message, Alert, Radio, Divider } from 'antd';
import {
  PhoneOutlined,
  MailOutlined,
  UserAddOutlined,
  EditOutlined,
  PlusOutlined,
  HistoryOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams, useNavigate } from 'react-router';
import { mockLeads } from '../../services/mock/mockData';
import type { LeadInteraction } from '../../shared/types';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuth } from '../../shared/contexts/AuthContext';

const statusColors = {
  new: 'blue',
  contacted: 'cyan',
  qualified: 'green',
  converted: 'success',
  lost: 'default',
};

const statusLabels = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  qualified: 'Đủ điều kiện',
  converted: 'Đã chuyển đổi',
  lost: 'Thất bại',
};

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const permissions = usePermissions();
  const [interactionModalVisible, setInteractionModalVisible] = useState(false);
  const [trialSessionModalVisible, setTrialSessionModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [form] = Form.useForm();

  const lead = mockLeads.find(l => l.id === id);

  if (!lead) {
    return <div>Lead không tồn tại</div>;
  }

  // Check if student role - they shouldn't see leads
  if (role === 'student') {
    return (
      <div className="p-8">
        <Alert
          message="Không có quyền truy cập"
          description="Học viên không có quyền xem thông tin Lead"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  // Mock interactions
  const interactions: LeadInteraction[] = [
    {
      id: '1',
      lead_id: lead.id,
      type: 'call',
      content: 'Gọi điện tư vấn về khóa học IELTS. Khách hàng quan tâm nhưng cần thời gian suy nghĩ.',
      created_by: 'Sale 1',
      createdAt: new Date(2026, 2, 28, 10, 30),
    },
    {
      id: '2',
      lead_id: lead.id,
      type: 'email',
      content: 'Gửi email thông tin chi tiết về khóa học và học phí.',
      created_by: 'Sale 1',
      createdAt: new Date(2026, 2, 27, 15, 0),
    },
    {
      id: '3',
      lead_id: lead.id,
      type: 'note',
      content: 'Lead từ Facebook Ads - Campaign IELTS mùa xuân 2026',
      created_by: 'System',
      createdAt: new Date(2026, 2, 27, 9, 0),
    },
  ];

  const handleAddInteraction = (values: any) => {
    message.success('Đã thêm tương tác');
    setInteractionModalVisible(false);
    form.resetFields();
  };

  const handleTrialSession = (values: any) => {
    message.success('Đã lưu thông tin buổi học thử');
    setTrialSessionModalVisible(false);
  };

  const handleAssign = (values: any) => {
    message.success('Đã phân công lead');
    setAssignModalVisible(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#f5222d';
  };

  const getInteractionIcon = (type: LeadInteraction['type']) => {
    switch (type) {
      case 'call': return <PhoneOutlined className="text-blue-500" />;
      case 'email': return <MailOutlined className="text-green-500" />;
      case 'meeting': return <UserAddOutlined className="text-purple-500" />;
      default: return <EditOutlined className="text-gray-500" />;
    }
  };

  // Build tabs based on role
  const buildTabItems = () => {
    const tabs = [];

    // Overview tab - all roles can see
    tabs.push({
      key: 'overview',
      label: 'Tổng quan',
      children: (
        <Card>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Tên">{lead.name}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusColors[lead.status]}>
                {statusLabels[lead.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{lead.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{lead.email}</Descriptions.Item>
            <Descriptions.Item label="Nguồn">{lead.source}</Descriptions.Item>
            <Descriptions.Item label="Người phụ trách">{lead.assigned_to}</Descriptions.Item>
            {role !== 'teacher' && (
              <>
                <Descriptions.Item label="Ngày tạo">
                  {lead.createdAt.toLocaleDateString('vi-VN')}
                </Descriptions.Item>
                <Descriptions.Item label="Liên hệ gần nhất">
                  {lead.lastContactedAt ? lead.lastContactedAt.toLocaleDateString('vi-VN') : 'Chưa có'}
                </Descriptions.Item>
              </>
            )}
            {role === 'teacher' && (
              <>
                <Descriptions.Item label="Trình độ hiện tại">Beginner</Descriptions.Item>
                <Descriptions.Item label="Mục tiêu học">IELTS 6.5</Descriptions.Item>
                <Descriptions.Item label="Khung giờ rảnh" span={2}>
                  Thứ 2, 4, 6 - Tối 19:00-21:00
                </Descriptions.Item>
              </>
            )}
          </Descriptions>

          {permissions.canViewLeadScore && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Điểm Lead (AI Score)</h3>
              <Progress
                percent={lead.score}
                strokeColor={getScoreColor(lead.score)}
                format={(percent) => `${percent} điểm`}
              />
              <p className="text-gray-600 mt-2">
                {lead.score >= 80 && 'Lead chất lượng cao, nên ưu tiên chăm sóc'}
                {lead.score >= 60 && lead.score < 80 && 'Lead tiềm năng, cần follow-up thường xuyên'}
                {lead.score < 60 && 'Lead cần đánh giá thêm'}
              </p>
            </div>
          )}
        </Card>
      ),
    });

    // Timeline - all roles can see
    if (permissions.canViewLeadTimeline) {
      tabs.push({
        key: 'timeline',
        label: 'Timeline chăm sóc',
        children: (
          <Card
            extra={
              permissions.canAddLeadInteraction && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setInteractionModalVisible(true)}
                >
                  Thêm tương tác
                </Button>
              )
            }
          >
            <Timeline
              items={interactions.map(interaction => ({
                dot: getInteractionIcon(interaction.type),
                children: (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium capitalize">{interaction.type}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">{interaction.created_by}</span>
                    </div>
                    <p className="text-gray-700">{interaction.content}</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {interaction.createdAt.toLocaleString('vi-VN')}
                    </p>
                  </div>
                ),
              }))}
            />
          </Card>
        ),
      });
    }

    // Trial Session tab - for teacher
    if (role === 'teacher') {
      tabs.push({
        key: 'trial',
        label: 'Buổi học thử',
        children: (
          <Card
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setTrialSessionModalVisible(true)}
              >
                Ghi nhận đánh giá
              </Button>
            }
          >
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Thông tin cần chuẩn bị:</h3>
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Trình độ">Beginner (chưa học qua IELTS)</Descriptions.Item>
                  <Descriptions.Item label="Mục tiêu">IELTS 6.5 trong 6 tháng</Descriptions.Item>
                  <Descriptions.Item label="Nhu cầu">Du học Úc - cần Writing và Speaking</Descriptions.Item>
                  <Descriptions.Item label="Khung giờ">Tối thứ 2, 4, 6 (19:00-21:00)</Descriptions.Item>
                </Descriptions>
              </div>

              <Divider />

              <div>
                <h3 className="font-semibold mb-2">Đánh giá từ buổi học thử:</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-gray-600">Chưa có đánh giá. Vui lòng thêm sau buổi học thử.</p>
                </div>
              </div>
            </div>
          </Card>
        ),
      });
    }

    // AI Insights - for admin and sale
    if (role === 'admin' || role === 'sale') {
      tabs.push({
        key: 'ai-insights',
        label: 'Dự đoán AI',
        children: (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Phân tích AI</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Các yếu tố quan trọng:</h4>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Mức độ tương tác (Engagement)</span>
                      <span className="font-medium">90%</span>
                    </div>
                    <Progress percent={90} size="small" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Phù hợp ngân sách</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <Progress percent={85} size="small" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Thời gian phản hồi</span>
                      <span className="font-medium">80%</span>
                    </div>
                    <Progress percent={80} size="small" />
                  </div>
                </div>
              </div>

              {role === 'sale' && (
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-medium mb-2">💡 Gợi ý hành động ngay:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Gọi điện trong vòng 24h để giữ nhiệt</li>
                    <li>Gửi case study về học viên thành công</li>
                    <li>Đề xuất lịch học phù hợp với thời gian của khách</li>
                  </ul>
                </div>
              )}
            </div>
          </Card>
        ),
      });
    }

    // Admin-only: Audit log and management
    if (role === 'admin') {
      tabs.push({
        key: 'admin',
        label: 'Quản trị',
        children: (
          <Card>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Phân công & Ưu tiên</h3>
                <Space>
                  <Button icon={<TeamOutlined />} onClick={() => setAssignModalVisible(true)}>
                    Phân công Sale
                  </Button>
                  <Select
                    placeholder="Độ ưu tiên"
                    style={{ width: 150 }}
                    options={[
                      { label: 'Cao', value: 'high' },
                      { label: 'Trung bình', value: 'medium' },
                      { label: 'Thấp', value: 'low' },
                    ]}
                  />
                </Space>
              </div>

              <Divider />

              <div>
                <h3 className="font-semibold mb-3">Lịch sử thay đổi (Audit Log)</h3>
                <Timeline
                  items={[
                    {
                      children: <div><strong>Admin</strong> phân công cho Sale 1 - {new Date().toLocaleString('vi-VN')}</div>,
                    },
                    {
                      children: <div><strong>System</strong> cập nhật Lead Score: 75 → 85 - {new Date(2026, 2, 28).toLocaleString('vi-VN')}</div>,
                    },
                    {
                      children: <div><strong>Sale 1</strong> thay đổi trạng thái: New → Contacted - {new Date(2026, 2, 27).toLocaleString('vi-VN')}</div>,
                    },
                  ]}
                />
              </div>

              <Divider />

              <div>
                <h3 className="font-semibold mb-3">Thống kê theo nguồn</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p>Nguồn <strong>Facebook Ads</strong>: Tỉ lệ chuyển đổi 35% (15/43 leads)</p>
                  <p className="mt-2 text-gray-600">Thời gian chuyển đổi trung bình: 12 ngày</p>
                </div>
              </div>
            </div>
          </Card>
        ),
      });
    }

    // Sale-only: Quick templates & pipeline
    if (role === 'sale') {
      tabs.push({
        key: 'sales-tools',
        label: 'Công cụ Sale',
        children: (
          <Card>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Kịch bản gọi điện</h3>
                <div className="bg-blue-50 p-4 rounded space-y-2">
                  <p><strong>Mở đầu:</strong> "Chào anh/chị [Tên], em là [Tên] từ EduCRM. Cảm ơn anh/chị đã quan tâm đến khóa học IELTS của chúng em..."</p>
                  <Button type="link" size="small">Sao chép kịch bản đầy đủ</Button>
                </div>
              </div>

              <Divider />

              <div>
                <h3 className="font-semibold mb-3">Checklist chốt sale</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="confirm-goal" />
                    <label htmlFor="confirm-goal">Xác nhận mục tiêu học của khách</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="confirm-budget" />
                    <label htmlFor="confirm-budget">Xác nhận ngân sách phù hợp</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="confirm-schedule" />
                    <label htmlFor="confirm-schedule">Đề xuất lịch học phù hợp</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="trial-booked" />
                    <label htmlFor="trial-booked">Đặt lịch học thử</label>
                  </div>
                </div>
              </div>

              <Divider />

              <div>
                <h3 className="font-semibold mb-3">Lý do Lost (nếu thất bại)</h3>
                <Select
                  placeholder="Chọn lý do"
                  style={{ width: '100%' }}
                  options={[
                    { label: 'Giá quá cao', value: 'price' },
                    { label: 'Không liên lạc được', value: 'no-contact' },
                    { label: 'Chọn đối thủ', value: 'competitor' },
                    { label: 'Không phù hợp thời gian', value: 'schedule' },
                    { label: 'Khác', value: 'other' },
                  ]}
                />
              </div>
            </div>
          </Card>
        ),
      });
    }

    return tabs;
  };

  // Build action buttons based on role
  const buildActions = () => {
    const actions: React.ReactNode[] = [];

    if (role === 'sale') {
      actions.push(
        <Button key="call" icon={<PhoneOutlined />} type="primary">
          Gọi điện ngay
        </Button>,
        <Button key="email" icon={<MailOutlined />}>
          Gửi email
        </Button>,
        <Button key="trial" icon={<CalendarOutlined />}>
          Đặt lịch học thử
        </Button>,
      );
    }

    if (permissions.canEditLeadStatus) {
      actions.push(
        <Select
          key="status"
          defaultValue={lead.status}
          style={{ width: 150 }}
          options={[
            { label: 'Mới', value: 'new', key: 'status-new' },
            { label: 'Đã liên hệ', value: 'contacted', key: 'status-contacted' },
            { label: 'Đủ điều kiện', value: 'qualified', key: 'status-qualified' },
            { label: 'Đã chuyển đổi', value: 'converted', key: 'status-converted' },
            { label: 'Thất bại', value: 'lost', key: 'status-lost' },
          ]}
        />,
      );
    }

    if (permissions.canEditLeadStatus) {
      actions.push(
        <Button key="convert" type="primary" icon={<UserAddOutlined />}>
          Chuyển đổi thành HV
        </Button>,
      );
    }

    if (role === 'teacher') {
      actions.push(
        <Button key="trial-feedback" type="primary" icon={<FileTextOutlined />} onClick={() => setTrialSessionModalVisible(true)}>
          Đánh giá học thử
        </Button>,
      );
    }

    return <Space>{actions}</Space>;
  };

  return (
    <div>
      <PageHeader
        title={lead.name}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'CRM' },
          { title: 'Leads', href: '/crm/leads' },
          { title: lead.name },
        ]}
        actions={buildActions()}
      />

      <Tabs defaultActiveKey="overview" items={buildTabItems()} />

      {/* Add Interaction Modal */}
      <Modal
        title="Thêm tương tác"
        open={interactionModalVisible}
        onCancel={() => setInteractionModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddInteraction}
        >
          <Form.Item
            name="type"
            label="Loại tương tác"
            rules={[{ required: true, message: 'Vui lòng chọn loại tương tác' }]}
          >
            <Select
              options={[
                { label: 'Gọi điện', value: 'call' },
                { label: 'Email', value: 'email' },
                { label: 'Gặp mặt', value: 'meeting' },
                { label: 'Ghi chú', value: 'note' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
          >
            <Input.TextArea rows={4} placeholder="Mô tả chi tiết về tương tác..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Lưu
              </Button>
              <Button onClick={() => setInteractionModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Trial Session Modal */}
      <Modal
        title="Đánh giá buổi học thử"
        open={trialSessionModalVisible}
        onCancel={() => setTrialSessionModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical" onFinish={handleTrialSession}>
          <Form.Item name="level" label="Trình độ thực tế" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="beginner">Beginner</Radio>
              <Radio value="intermediate">Intermediate</Radio>
              <Radio value="advanced">Advanced</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="strengths" label="Điểm mạnh">
            <Input.TextArea rows={2} placeholder="Ví dụ: Phát âm tốt, tự tin giao tiếp..." />
          </Form.Item>

          <Form.Item name="weaknesses" label="Điểm cần cải thiện">
            <Input.TextArea rows={2} placeholder="Ví dụ: Ngữ pháp, từ vựng..." />
          </Form.Item>

          <Form.Item name="recommendation" label="Đề xuất lộ trình">
            <Input.TextArea rows={3} placeholder="Khóa học phù hợp, số buổi/tuần..." />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú khác">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Lưu đánh giá
              </Button>
              <Button onClick={() => setTrialSessionModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Modal - Admin only */}
      <Modal
        title="Phân công Sale"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleAssign}>
          <Form.Item name="saleId" label="Chọn Sale" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn nhân viên Sale"
              options={[
                { label: 'Sale 1 - Nguyễn Văn A', value: 'sale1' },
                { label: 'Sale 2 - Trần Thị B', value: 'sale2' },
                { label: 'Sale 3 - Lê Văn C', value: 'sale3' },
              ]}
            />
          </Form.Item>

          <Form.Item name="priority" label="Độ ưu tiên">
            <Radio.Group>
              <Radio value="high">Cao</Radio>
              <Radio value="medium">Trung bình</Radio>
              <Radio value="low">Thấp</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú cho Sale..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Phân công
              </Button>
              <Button onClick={() => setAssignModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}