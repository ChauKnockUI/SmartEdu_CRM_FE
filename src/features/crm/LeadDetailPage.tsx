import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Descriptions,
  Tag,
  Button,
  Timeline,
  Progress,
  Space,
  Select,
  Alert,
  Divider,
  Spin,
  Form,
  message,
  Drawer,
  Input,
} from 'antd';
import {
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams } from 'react-router';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuth } from '../../shared/contexts/AuthContext';
import { leadService } from '@/services/api/lead.service';

const statusColors: any = {
  new: 'blue',
  contacted: 'cyan',
  interested: 'gold',
  trial: 'purple',
  enrolled: 'green',
  lost: 'red',
};

const statusLabels: any = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  interested: 'Quan tâm',
  trial: 'Học thử',
  enrolled: 'Đã đăng ký',
  lost: 'Thất bại',
};

const occupationLabels: any = {
  student_y1_y2: 'Sinh viên năm 1-2',
  student_y3_y4: 'Sinh viên năm 3-4',
  working_professional: 'Người đi làm',
};

const studyPurposeLabels: any = {
  study_abroad: 'Du học',
  career: 'Công việc',
  improve: 'Cải thiện tiếng Anh',
};

export function LeadDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [editVisible, setEditVisible] = useState(false);
  const [form] = Form.useForm();

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await leadService.getById(id as string);
      setLead(res.data);
      console.log('LEAD DATA:', res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    form.setFieldsValue({
      full_name: lead.full_name,
      phone: lead.phone,
      email: lead.email,
      source: lead.lead_source,
      occupation: lead.occupation,
      study_purpose: lead.study_purpose,
      status: lead.status,
      notes: lead.notes,
    });
    setEditVisible(true);
  };

  const handleUpdate = async (values: any) => {
    try {
      const { full_name, phone, email, ...allowedValues } = values;
      await leadService.update(String(lead.id), allowedValues);

      message.success('Cập nhật thành công');
      setEditVisible(false);
      fetchDetail();
    } catch (err) {
      console.error(err);
      message.error('Cập nhật thất bại');
    }
  };

  if (loading) return <Spin />;
  if (!lead) return <div>Lead không tồn tại</div>;

  if (user?.role === 'student') {
    return (
      <Alert
        message="Không có quyền truy cập"
        description="Học viên không có quyền xem Lead"
        type="warning"
        showIcon
      />
    );
  }

  const score = lead.aiScore?.probability_score ?? 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#f5222d';
  };

  // ===== Tabs =====
  const buildTabItems = () => {
    const tabs: any[] = [];

    // ===== OVERVIEW =====
    tabs.push({
      key: 'overview',
      label: 'Tổng quan',
      children: (
        <Card>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Tên">{lead.full_name}</Descriptions.Item>

            <Descriptions.Item label="Trạng thái">
              <Tag color={statusColors[lead.status]}>
                {statusLabels[lead.status] || lead.status}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Điện thoại">
              {lead.phone || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Email">
              {lead.email || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Nguồn">
              {lead.lead_source || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Người phụ trách">
              {lead.assignedUser?.full_name || 'Chưa có'}
            </Descriptions.Item>

            <Descriptions.Item label="Nghề nghiệp">
              {occupationLabels[lead.occupation] || lead.occupation || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Mục tiêu học">
              {studyPurposeLabels[lead.study_purpose] || lead.study_purpose || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Ngày tạo">
              {new Date(lead.createdAt).toLocaleDateString('vi-VN')}
            </Descriptions.Item>

            <Descriptions.Item label="Liên hệ gần nhất">
              {lead.last_contacted
                ? new Date(lead.last_contacted).toLocaleDateString('vi-VN')
                : 'Chưa có'}
            </Descriptions.Item>

            {lead.notes && (
              <Descriptions.Item label="Ghi chú" span={2}>
                {lead.notes}
              </Descriptions.Item>
            )}
          </Descriptions>

          {permissions.canViewLeadScore && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">AI Score</h3>
              <Progress
                percent={score}
                strokeColor={getScoreColor(score)}
              />
            </div>
          )}
        </Card>
      ),
    });

    if (permissions.canViewLeadTimeline) {
      tabs.push({
        key: 'timeline',
        label: 'Timeline',
        children: (
          <Card>
            {lead.activities?.length > 0 ? (
              <Timeline
                items={lead.activities.map((act: any) => ({
                  children: (
                    <div>
                      <span className="font-medium">{act.type}</span>
                      {act.content && <p className="text-gray-500 text-sm">{act.content}</p>}
                      <p className="text-gray-400 text-xs">
                        {new Date(act.createdAt).toLocaleString('vi-VN')}
                        {act.user?.full_name && ` — ${act.user.full_name}`}
                      </p>
                    </div>
                  ),
                }))}
              />
            ) : (
              <p className="text-gray-400">Chưa có hoạt động nào</p>
            )}
          </Card>
        ),
      });
    }

    if (user?.role === 'admin' || user?.role === 'sale') {
      tabs.push({
        key: 'ai',
        label: 'AI',
        children: (
          <Card>
            <p><b>Phân loại:</b> {lead.aiScore?.recommendation || 'N/A'}</p>

            <Divider />

            <p><b>Điểm cộng:</b></p>
            <ul>
              {lead.aiScore?.positive_factors?.length
                ? lead.aiScore.positive_factors.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))
                : <li>-</li>}
            </ul>

            <p><b>Điểm trừ:</b></p>
            <ul>
              {lead.aiScore?.negative_factors?.length
                ? lead.aiScore.negative_factors.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))
                : <li>-</li>}
            </ul>
          </Card>
        ),
      });
    }

    return tabs;
  };

  const buildActions = () => {
    const actions: any[] = [];

    if (user?.role === 'sale') {
      actions.push(
        <Button key="call" icon={<PhoneOutlined />} type="primary">
          Gọi điện
        </Button>,
        <Button key="email" icon={<MailOutlined />}>
          Email
        </Button>
      );
    }

    if (permissions.canEditLeadStatus) {
      actions.push(
        <Select
          key="status"
          defaultValue={lead.status}
          style={{ width: 150 }}
          options={[
            { label: 'Mới', value: 'new' },
            { label: 'Đã liên hệ', value: 'contacted' },
            { label: 'Quan tâm', value: 'interested' },
            { label: 'Học thử', value: 'trial' },
            { label: 'Đã đăng ký', value: 'enrolled' },
            { label: 'Thất bại', value: 'lost' },
          ]}
        />
      );
    }

    return <Space>{actions}</Space>;
  };

  return (
    <div>
      <PageHeader
        title={lead.full_name}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'CRM' },
          { title: 'Leads', href: '/crm/leads' },
          { title: lead.full_name },
        ]}
        actions={
          <Space>
            <Button onClick={openEdit}>Sửa</Button>
            {buildActions()}
          </Space>
        }
      />

      <Drawer
        title="Chỉnh sửa Lead"
        width={500}
        open={editVisible}
        onClose={() => setEditVisible(false)}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdate}
        >
          {/* Chỉ xem, không edit */}
          <Form.Item name="full_name" label="Tên">
            <Input disabled />
          </Form.Item>

          <Form.Item name="phone" label="SĐT">
            <Input disabled />
          </Form.Item>

          <Form.Item name="email" label="Email">
            <Input disabled />
          </Form.Item>

          {/* Các field được phép edit — đúng tên backend nhận */}
          <Form.Item name="status" label="Trạng thái">
            <Select
              options={[
                { label: 'Mới', value: 'new' },
                { label: 'Đã liên hệ', value: 'contacted' },
                { label: 'Quan tâm', value: 'interested' },
                { label: 'Học thử', value: 'trial' },
                { label: 'Đã đăng ký', value: 'enrolled' },
                { label: 'Thất bại', value: 'lost' },
              ]}
            />
          </Form.Item>

          <Form.Item name="source" label="Nguồn">
            <Select
              options={[
                { label: 'Facebook', value: 'facebook' },
                { label: 'Google Form', value: 'google form' }, 
                { label: 'Website', value: 'website' },
                { label: 'Referral', value: 'referral' },
              ]}
            />
          </Form.Item>

          <Form.Item name="occupation" label="Nghề nghiệp">
            <Select
              options={[
                { label: 'Sinh viên năm 1-2', value: 'student_y1_y2' },
                { label: 'Sinh viên năm 3-4', value: 'student_y3_y4' },
                { label: 'Người đi làm', value: 'working_professional' },
              ]}
            />
          </Form.Item>

          <Form.Item name="study_purpose" label="Mục tiêu học">
            <Select
              options={[
                { label: 'Du học', value: 'study_abroad' },
                { label: 'Công việc', value: 'career' },
                { label: 'Cải thiện tiếng Anh', value: 'improve' },
              ]}
            />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Lưu
              </Button>
              <Button onClick={() => setEditVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      <Tabs defaultActiveKey="overview" items={buildTabItems()} />
    </div>
  );
}