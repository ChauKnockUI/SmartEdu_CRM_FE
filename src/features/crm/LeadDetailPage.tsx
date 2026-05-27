import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Progress,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
} from 'antd';
import {
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  RobotOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '../../shared/contexts/AuthContext';
import { leadService } from '@/services/api/lead.service';

const statusColors: Record<string, string> = {
  new: 'blue',
  contacted: 'cyan',
  interested: 'gold',
  trial: 'purple',
  enrolled: 'green',
  lost: 'red',
};

const statusLabels: Record<string, string> = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  interested: 'Quan tâm',
  trial: 'Học thử',
  enrolled: 'Đã đăng ký',
  lost: 'Thất bại',
};

const sourceLabels: Record<string, string> = {
  facebook: 'Facebook',
  website: 'Website',
  referral: 'Giới thiệu',
  'google form': 'Google Form',
};

const occupationLabels: Record<string, string> = {
  student_y1_y2: 'Sinh viên năm 1-2',
  student_y3_y4: 'Sinh viên năm 3-4',
  working_professional: 'Người đi làm',
};

const studyPurposeLabels: Record<string, string> = {
  study_abroad: 'Du học',
  career: 'Công việc',
  improve: 'Cải thiện tiếng Anh',
};

const activityLabels: Record<string, string> = {
  call: 'Gọi điện',
  email: 'Email',
  meeting: 'Tư vấn trực tiếp',
  note: 'Ghi chú',
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';
}

function getLeadScore(lead: any) {
  const rawScore = Number(lead?.aiScore?.probability_score ?? lead?.score ?? 0);
  return rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
}

function getScoreColor(score: number) {
  if (score >= 80) return '#389e0d';
  if (score >= 60) return '#d48806';
  return '#cf1322';
}

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [form] = Form.useForm();
  const [activityForm] = Form.useForm();

  const canManageLead = user?.role === 'admin' || user?.role === 'sale';

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await leadService.getById(id);
      setLead(res.data);
    } catch (err) {
      console.error(err);
      message.error('Không tải được thông tin lead');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const score = useMemo(() => getLeadScore(lead), [lead]);

  const openEdit = () => {
    form.setFieldsValue({
      status: lead.status,
      source: lead.lead_source,
      occupation: lead.occupation,
      study_purpose: lead.study_purpose,
      notes: lead.notes,
    });
    setEditOpen(true);
  };

  const handleUpdate = async (values: any) => {
    try {
      setSaving(true);
      await leadService.update(String(lead.id), values);
      message.success('Đã cập nhật lead');
      setEditOpen(false);
      fetchDetail();
    } catch (err) {
      console.error(err);
      message.error('Cập nhật lead thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!lead) return;
    await handleUpdate({
      status,
      source: lead.lead_source,
      occupation: lead.occupation,
      study_purpose: lead.study_purpose,
      notes: lead.notes,
    });
  };

  const handleScore = async () => {
    try {
      setSaving(true);
      await leadService.score(Number(lead.id));
      message.success('Đã chấm điểm AI cho lead');
      fetchDetail();
    } catch (err) {
      console.error(err);
      message.error('Chấm điểm AI thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    try {
      setSaving(true);
      await leadService.convert(String(lead.id));
      message.success('Đã convert lead thành học viên');
      fetchDetail();
    } catch (err) {
      console.error(err);
      message.error('Convert lead thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateActivity = async (values: any) => {
    try {
      setSaving(true);
      await leadService.createActivity(String(lead.id), values);
      message.success('Đã thêm tương tác');
      activityForm.resetFields();
      setActivityOpen(false);
      fetchDetail();
    } catch (err) {
      console.error(err);
      message.error('Không thêm được tương tác');
    } finally {
      setSaving(false);
    }
  };

  if (!canManageLead) {
    return (
      <Alert
        message="Không có quyền truy cập"
        description="Chỉ admin và sale được xem thông tin lead."
        type="warning"
        showIcon
      />
    );
  }

  if (loading && !lead) {
    return <Spin />;
  }

  if (!lead) {
    return <Empty description="Không tìm thấy lead" />;
  }

  const tabs = [
    {
      key: 'overview',
      label: 'Tổng quan',
      children: (
        <Card>
          <Descriptions column={{ xs: 1, md: 2 }} bordered size="middle">
            <Descriptions.Item label="Họ tên">{lead.full_name}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusColors[lead.status]}>{statusLabels[lead.status] || lead.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{lead.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Email">{lead.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Nguồn">{sourceLabels[lead.lead_source] || lead.lead_source || '-'}</Descriptions.Item>
            <Descriptions.Item label="Người phụ trách">{lead.assignedUser?.full_name || 'Chưa phân công'}</Descriptions.Item>
            <Descriptions.Item label="Nghề nghiệp">{occupationLabels[lead.occupation] || lead.occupation || '-'}</Descriptions.Item>
            <Descriptions.Item label="Mục tiêu học">{studyPurposeLabels[lead.study_purpose] || lead.study_purpose || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatDate(lead.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Liên hệ gần nhất">{formatDate(lead.last_contacted)}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú" span={2}>{lead.notes || '-'}</Descriptions.Item>
          </Descriptions>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">AI lead score</span>
              <Tag color={score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'}>{score}%</Tag>
            </div>
            <Progress percent={score} strokeColor={getScoreColor(score)} />
          </div>
        </Card>
      ),
    },
    {
      key: 'timeline',
      label: 'Timeline',
      children: (
        <Card>
          {lead.activities?.length ? (
            <Timeline
              items={lead.activities.map((activity: any) => ({
                children: (
                  <div>
                    <div className="font-medium">{activityLabels[activity.type] || activity.type}</div>
                    {activity.content && <div className="text-gray-600">{activity.content}</div>}
                    <div className="text-xs text-gray-500">
                      {formatDate(activity.createdAt)}
                      {activity.user?.full_name ? ` - ${activity.user.full_name}` : ''}
                    </div>
                  </div>
                ),
              }))}
            />
          ) : (
            <Empty description="Chưa có tương tác" />
          )}
        </Card>
      ),
    },
    {
      key: 'ai',
      label: 'AI',
      children: (
        <Card>
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Khuyến nghị">{lead.aiScore?.recommendation || 'Chưa có dữ liệu'}</Descriptions.Item>
            <Descriptions.Item label="Yếu tố tích cực">
              {lead.aiScore?.positive_factors?.length ? lead.aiScore.positive_factors.join(', ') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Yếu tố cần lưu ý">
              {lead.aiScore?.negative_factors?.length ? lead.aiScore.negative_factors.join(', ') : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
  ];

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
          <Space wrap>
            <Button icon={<PhoneOutlined />}>Gọi điện</Button>
            <Button icon={<MailOutlined />}>Email</Button>
            <Button icon={<PlusOutlined />} onClick={() => setActivityOpen(true)}>
              Thêm tương tác
            </Button>
            <Button icon={<RobotOutlined />} loading={saving} onClick={handleScore}>
              Chấm điểm AI
            </Button>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              disabled={lead.status === 'enrolled'}
              loading={saving}
              onClick={handleConvert}
            >
              Convert học viên
            </Button>
            <Button icon={<EditOutlined />} onClick={openEdit}>
              Sửa
            </Button>
          </Space>
        }
      />

      <div className="mb-4">
        <Space wrap>
          <span className="text-gray-600">Cập nhật trạng thái nhanh:</span>
          <Select
            value={lead.status}
            style={{ width: 180 }}
            options={statusOptions}
            loading={saving}
            onChange={handleStatusChange}
          />
        </Space>
      </div>

      <Tabs defaultActiveKey="overview" items={tabs} />

      <Drawer
        title="Chỉnh sửa lead"
        width={520}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="source" label="Nguồn">
            <Select
              allowClear
              options={[
                { label: 'Facebook', value: 'facebook' },
                { label: 'Website', value: 'website' },
                { label: 'Giới thiệu', value: 'referral' },
                { label: 'Google Form', value: 'google form' },
              ]}
            />
          </Form.Item>
          <Form.Item name="occupation" label="Nghề nghiệp">
            <Select
              allowClear
              options={Object.entries(occupationLabels).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="study_purpose" label="Mục tiêu học">
            <Select
              allowClear
              options={Object.entries(studyPurposeLabels).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>Lưu</Button>
            <Button onClick={() => setEditOpen(false)}>Hủy</Button>
          </Space>
        </Form>
      </Drawer>

      <Drawer
        title="Thêm tương tác"
        width={520}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        destroyOnClose
      >
        <Form form={activityForm} layout="vertical" onFinish={handleCreateActivity}>
          <Form.Item name="type" label="Loại tương tác" rules={[{ required: true }]}>
            <Select
              options={Object.entries(activityLabels).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="engagement_status" label="Mức độ quan tâm">
            <Select
              allowClear
              options={[
                { label: 'Cao', value: 'high' },
                { label: 'Trung bình', value: 'medium' },
                { label: 'Thấp', value: 'low' },
              ]}
            />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>Lưu</Button>
            <Button onClick={() => setActivityOpen(false)}>Hủy</Button>
          </Space>
        </Form>
      </Drawer>
    </div>
  );
}
