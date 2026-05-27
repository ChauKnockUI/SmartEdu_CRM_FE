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
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
} from 'antd';
import { EditOutlined, MailOutlined, PhoneOutlined, PlusOutlined, RobotOutlined, UserAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '../../shared/contexts/AuthContext';
import { leadService } from '@/services/api/lead.service';
import { courseService } from '@/services/api/course.service';
import { userService } from '@/services/api/user.service';

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

const sourceOptions = [
  { label: 'Facebook Ads', value: 'facebook' },
  { label: 'Google Ads', value: 'google_ads' },
  { label: 'Website Organic', value: 'website_organic' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Giới thiệu', value: 'referral' },
  { label: 'Khác', value: 'other' },
];

const sourceLabels = Object.fromEntries(sourceOptions.map((item) => [item.value, item.label]));

const occupationLabels: Record<string, string> = {
  student_y1_y2: 'Sinh viên năm 1-2',
  student_y3_y4: 'Sinh viên năm 3-4',
  working_professional: 'Người đi làm',
};

const studyPurposeLabels: Record<string, string> = {
  study_abroad: 'Du học',
  pass_exam: 'Thi chứng chỉ',
  career_advancement: 'Thăng tiến công việc',
  career: 'Công việc',
  improve: 'Cải thiện tiếng Anh',
};

const recommendationLabels: Record<string, string> = {
  HOT_LEAD: 'Lead nóng',
  WARM_LEAD: 'Lead tiềm năng',
  COLD_LEAD: 'Lead lạnh',
};

const recommendationColors: Record<string, string> = {
  HOT_LEAD: 'green',
  WARM_LEAD: 'gold',
  COLD_LEAD: 'default',
};

const activityLabels: Record<string, string> = {
  call: 'Gọi điện',
  email: 'Email',
  sms: 'SMS',
  meeting: 'Tư vấn trực tiếp',
  note: 'Ghi chú',
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));
const occupationOptions = Object.entries(occupationLabels).map(([value, label]) => ({ value, label }));
const studyPurposeOptions = Object.entries(studyPurposeLabels).map(([value, label]) => ({ value, label }));

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
  const { user } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSaleId, setAssignSaleId] = useState<number>();
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

  const fetchCourses = async () => {
    try {
      const res = await courseService.getAll(1, 200);
      setCourses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSales = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await userService.getSales();
      setSales(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không tải được danh sách sale');
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchCourses();
    fetchSales();
  }, [id, user?.role]);

  const score = useMemo(() => getLeadScore(lead), [lead]);
  const courseOptions = courses.map((course) => ({ label: course.name, value: course.id }));
  const recommendation = lead?.aiScore?.recommendation;

  const openEdit = () => {
    form.setFieldsValue({
      status: lead.status,
      source: lead.lead_source,
      occupation: lead.occupation,
      study_purpose: lead.study_purpose,
      course_id: lead.course_id,
      notes: lead.notes,
    });
    setEditOpen(true);
  };

  const handleUpdate = async (values: any) => {
    try {
      setSaving(true);
      await leadService.update(String(lead.id), values);
      message.success('Đã cập nhật lead. AI sẽ tự cập nhật lại điểm nếu feature thay đổi.');
      setEditOpen(false);
      fetchDetail();
      setTimeout(fetchDetail, 2500);
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
      course_id: lead.course_id,
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
    if (!lead.email) {
      message.warning('Lead cần có email trước khi convert thành học viên.');
      return;
    }

    try {
      setSaving(true);
      await leadService.convert(Number(lead.id));
      message.success('Đã convert lead thành học viên');
      fetchDetail();
    } catch (err) {
      console.error(err);
      message.error('Convert lead thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleClaimLead = async () => {
    if (!user?.id) return;
    try {
      setSaving(true);
      await leadService.update(String(lead.id), { assigned_to: Number(user.id) });
      message.success('Đã phân công lead cho bạn phụ trách');
      fetchDetail();
    } catch (err) {
      console.error(err);
      message.error('Phân công lead thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignLead = async () => {
    if (!assignSaleId) {
      message.warning('Chọn sale phụ trách');
      return;
    }

    try {
      setSaving(true);
      await leadService.update(String(lead.id), { assigned_to: assignSaleId });
      message.success('Đã phân công lead cho sale phụ trách');
      setAssignOpen(false);
      fetchDetail();
    } catch (err) {
      console.error(err);
      message.error('Phân công lead thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateActivity = async (values: any) => {
    try {
      setSaving(true);
      await leadService.createActivity(String(lead.id), values);
      message.success('Đã thêm tương tác. AI đang cập nhật lại điểm lead.');
      activityForm.resetFields();
      setActivityOpen(false);
      fetchDetail();
      setTimeout(fetchDetail, 2500);
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

  if (loading && !lead) return <Spin />;
  if (!lead) return <Empty description="Không tìm thấy lead" />;

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
            <Descriptions.Item label="Khóa quan tâm">{lead.course?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatDate(lead.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Liên hệ gần nhất">{formatDate(lead.last_contacted)}</Descriptions.Item>
            <Descriptions.Item label="Chấm điểm lần cuối">{formatDate(lead.aiScore?.scored_at)}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú" span={2}>{lead.notes || '-'}</Descriptions.Item>
          </Descriptions>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <Space>
                <span className="font-semibold">AI lead score</span>
                {recommendation && (
                  <Tag color={recommendationColors[recommendation] || 'default'}>
                    {recommendationLabels[recommendation] || recommendation}
                  </Tag>
                )}
              </Space>
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
            <Descriptions.Item label="Khuyến nghị">
              {recommendation ? (
                <Tag color={recommendationColors[recommendation] || 'default'}>
                  {recommendationLabels[recommendation] || recommendation}
                </Tag>
              ) : 'Chưa có dữ liệu'}
            </Descriptions.Item>
            <Descriptions.Item label="Chấm điểm lần cuối">{formatDate(lead.aiScore?.scored_at)}</Descriptions.Item>
            <Descriptions.Item label="Dữ liệu AI đang dùng">
              Nguồn: {sourceLabels[lead.lead_source] || lead.lead_source || '-'}; nghề nghiệp: {occupationLabels[lead.occupation] || '-'}; mục tiêu: {studyPurposeLabels[lead.study_purpose] || '-'}; khóa quan tâm: {lead.course?.name || '-'}.
            </Descriptions.Item>
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
            <Button icon={<PlusOutlined />} onClick={() => setActivityOpen(true)}>Thêm tương tác</Button>
            <Button icon={<RobotOutlined />} loading={saving} onClick={handleScore}>Chấm điểm AI</Button>
            {user?.role === 'admin' && (
              <Button
                loading={saving}
                onClick={() => {
                  setAssignSaleId(lead.assignedUser?.id);
                  setAssignOpen(true);
                }}
              >
                Phân công
              </Button>
            )}
            {user?.role === 'sale' && !lead.assignedUser && (
              <Button loading={saving} onClick={handleClaimLead}>Phân công cho tôi</Button>
            )}
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              disabled={lead.status === 'enrolled' || !lead.email}
              loading={saving}
              onClick={handleConvert}
            >
              Convert học viên
            </Button>
            <Button icon={<EditOutlined />} onClick={openEdit}>Sửa</Button>
          </Space>
        }
      />

      <div className="mb-4">
        <Space wrap>
          <span className="text-gray-600">Cập nhật trạng thái nhanh:</span>
          <Select value={lead.status} style={{ width: 180 }} options={statusOptions} loading={saving} onChange={handleStatusChange} />
        </Space>
      </div>

      <Tabs defaultActiveKey="overview" items={tabs} />

      <Modal
        title="Phân công lead"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={handleAssignLead}
        okText="Phân công"
        cancelText="Hủy"
        confirmLoading={saving}
      >
        <Space direction="vertical" className="w-full" size={12}>
          <div>
            <div className="text-gray-500">Lead</div>
            <div className="font-medium">{lead.full_name}</div>
          </div>
          <Select
            className="w-full"
            placeholder="Chọn sale phụ trách"
            value={assignSaleId}
            onChange={setAssignSaleId}
            showSearch
            optionFilterProp="label"
            options={sales.map((sale) => ({
              label: `${sale.full_name} (${sale.email})`,
              value: sale.id,
            }))}
          />
        </Space>
      </Modal>

      <Drawer title="Chỉnh sửa lead" width={520} open={editOpen} onClose={() => setEditOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="source" label="Nguồn lead" rules={[{ required: true }]}>
            <Select options={sourceOptions} />
          </Form.Item>
          <Form.Item name="occupation" label="Nghề nghiệp" rules={[{ required: true }]}>
            <Select options={occupationOptions} />
          </Form.Item>
          <Form.Item name="study_purpose" label="Mục tiêu học" rules={[{ required: true }]}>
            <Select options={studyPurposeOptions} />
          </Form.Item>
          <Form.Item name="course_id" label="Khóa quan tâm" rules={[{ required: true }]}>
            <Select options={courseOptions} showSearch optionFilterProp="label" />
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

      <Drawer title="Thêm tương tác" width={520} open={activityOpen} onClose={() => setActivityOpen(false)} destroyOnClose>
        <Form form={activityForm} layout="vertical" onFinish={handleCreateActivity}>
          <Form.Item name="type" label="Loại tương tác" rules={[{ required: true }]}>
            <Select options={Object.entries(activityLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="engagement_status" label="Mức độ quan tâm">
            <Select
              allowClear
              options={[
                { label: 'Tương tác tích cực', value: 'positive_interaction' },
                { label: 'Quan tâm nhưng cần thêm thời gian', value: 'interested_need_time' },
                { label: 'Bận, hẹn gọi lại', value: 'busy_call_back' },
                { label: 'Không nghe máy', value: 'not_answering' },
                { label: 'Sai số', value: 'wrong_number' },
                { label: 'Từ chối', value: 'rejected' },
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
