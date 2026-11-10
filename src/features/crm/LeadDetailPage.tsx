import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Steps,
  Tabs,
  Tag,
  Timeline,
} from 'antd';
import { PhoneOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams, useSearchParams } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '../../shared/contexts/AuthContext';
import { leadService, type LeadSourceOption } from '@/services/api/lead.service';
import { courseService } from '@/services/api/course.service';
import { userService } from '@/services/api/user.service';
import { LeadConsultationPanel } from './components/LeadConsultationPanel';
import { MarkLostModal } from './components/MarkLostModal';
import { getEditableLeadSources, getLeadSourceLabel } from './leadSources';

const statusLabels: Record<string, string> = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  interested: 'Quan tâm',
  trial: 'Học thử',
  enrolled: 'Đã đăng ký',
  lost: 'Thất bại',
};

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

const activityLabels: Record<string, string> = {
  call: 'Gọi điện',
  email: 'Email',
  sms: 'SMS',
  meeting: 'Tư vấn trực tiếp',
  note: 'Ghi chú',
  status_change: 'Cập nhật trạng thái',
};

const engagementLabels: Record<string, string> = {
  positive_interaction: 'Có phản hồi tích cực',
  interested_need_time: 'Quan tâm, cần thêm thời gian',
  busy_call_back: 'Bận, hẹn gọi lại',
  rejected: 'Từ chối',
  not_answering: 'Không nghe máy',
  wrong_number: 'Sai số điện thoại',
  unknown: 'Chưa có phản hồi',
  high: 'Có phản hồi tích cực',
  medium: 'Quan tâm, cần thêm thời gian',
  low: 'Bận, hẹn gọi lại',
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));
const occupationOptions = Object.entries(occupationLabels).map(([value, label]) => ({ value, label }));
const studyPurposeOptions = Object.entries(studyPurposeLabels).map(([value, label]) => ({ value, label }));

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';
}

export function LeadDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [sourceOptions, setSourceOptions] = useState<LeadSourceOption[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [latestActivities, setLatestActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState('');
  const [activityPagination, setActivityPagination] = useState({ current: 1, total: 0, pageSize: 20 });
  const [lostOpen, setLostOpen] = useState(false);
  const detailRequest = useRef(0);
  const historyRequest = useRef(0);
  const refreshTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
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
  const activityType = Form.useWatch('type', activityForm);

  const canManageLead = user?.role === 'admin' || user?.role === 'sale';

  const fetchDetail = async () => {
    if (!id) return;
    const requestId = ++detailRequest.current;
    try {
      setLoading(true);
      const res = await leadService.getById(id);
      if (requestId !== detailRequest.current) return;
      setLead(res.data);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Không tải được thông tin lead');
    } finally {
      if (requestId === detailRequest.current) setLoading(false);
    }
  };

  const fetchActivities = async (page = 1) => {
    if (!id) return;
    const requestId = ++historyRequest.current;
    setActivitiesLoading(true);
    try {
      const res = await leadService.getActivities(id, { page, limit: 20 });
      if (requestId !== historyRequest.current) return;
      setActivities(res.data || []);
      if (page === 1) setLatestActivities(res.data || []);
      setActivityPagination({ current: res.pagination?.page || page, total: res.pagination?.total || 0, pageSize: 20 });
      setActivitiesError('');
    } catch (err: any) {
      if (requestId === historyRequest.current) setActivitiesError(err.message || 'Không tải được lịch sử chăm sóc');
    } finally {
      if (requestId === historyRequest.current) setActivitiesLoading(false);
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

  const fetchSources = async () => {
    try {
      const res = await leadService.getSources();
      setSourceOptions(res.data);
    } catch (err: any) {
      message.error(err.message || 'Không tải được danh mục nguồn lead');
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
    setLead(null);
    setActivities([]);
    setLatestActivities([]);
    fetchDetail();
    fetchActivities();
    fetchSources();
    fetchCourses();
    fetchSales();
    return () => {
      detailRequest.current++;
      historyRequest.current++;
      refreshTimers.current.forEach(clearTimeout);
      refreshTimers.current = [];
    };
  }, [id, user?.role]);

  const queueRefresh = () => {
    refreshTimers.current.push(setTimeout(() => { fetchDetail(); fetchActivities(); }, 2500));
  };

  useEffect(() => {
    if (searchParams.get('contact') !== '1' || !lead || String(lead.id) !== id) return;
    activityForm.setFieldsValue({ type: 'call', engagement_status: 'unknown' });
    setActivityOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('contact');
    setSearchParams(next, { replace: true });
  }, [id, lead?.id, searchParams]);

  const openActivity = (type = 'call') => {
    activityForm.setFieldsValue({ type, engagement_status: 'unknown' });
    setActivityOpen(true);
  };

  const courseOptions = courses.map((course) => ({ label: course.name, value: course.id }));

  const openEdit = () => {
    form.setFieldsValue({
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
      message.success('Đã cập nhật thông tin lead');
      setEditOpen(false);
      fetchDetail();
      fetchActivities();
      queueRefresh();
    } catch (err) {
      console.error(err);
      message.error('Cập nhật lead thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!lead) return;
    if (status === 'lost') { setLostOpen(true); return; }
    if (status === 'enrolled') { handleConvert(); return; }
    await handleUpdate({ status });
  };

  const handleScore = async () => {
    try {
      setSaving(true);
      const result = await leadService.score(Number(lead.id));
      if (result.model_status === 'unavailable') message.warning(result.message);
      else message.success(result.message || 'Đã cập nhật đánh giá lead');
      fetchDetail();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Chưa thể cập nhật đánh giá lead');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!lead.email) {
      message.warning('Lead cần có email trước khi convert thành học viên.');
      return;
    }

    Modal.confirm({
      title: 'Chuyển thành học viên?',
      content: `${lead.full_name} sẽ được tạo hồ sơ học viên theo quy trình đăng ký hiện tại.`,
      okText: 'Xác nhận đăng ký', cancelText: 'Hủy',
      onOk: async () => {
        setSaving(true);
        try {
          await leadService.convert(Number(lead.id));
          message.success('Đã chuyển thành học viên');
          fetchDetail(); fetchActivities();
        } catch (err: any) {
          message.error(err.message || 'Chuyển học viên thất bại');
          throw err;
        } finally { setSaving(false); }
      },
    });
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
      const isContact = ['call', 'email', 'sms', 'meeting'].includes(values.type);
      await leadService.createActivity(String(lead.id), { ...values, engagement_status: isContact ? values.engagement_status || 'unknown' : undefined });
      message.success(isContact ? 'Đã ghi nhận liên hệ. Điểm đánh giá sẽ cập nhật sau ít giây.' : 'Đã lưu ghi chú');
      activityForm.resetFields();
      setActivityOpen(false);
      fetchDetail();
      fetchActivities();
      queueRefresh();
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
  if (!lead) return <Empty description="Không tìm thấy lead hoặc bạn không có quyền truy cập" />;

  const tabs = [
    {
      key: 'timeline',
      label: 'Lịch sử chăm sóc' + (activityPagination.total ? ' (' + activityPagination.total + ')' : ''),
      children: <Card>
        {activitiesError ? <Alert type="error" showIcon message={activitiesError} action={<Button onClick={() => fetchActivities(activityPagination.current)}>Thử lại</Button>} /> :
          <Spin spinning={activitiesLoading}>
            {activities.length ? <Timeline items={activities.map((activity: any) => ({
              key: activity.id,
              color: activity.type === 'status_change' || activity.type === 'note' ? 'gray' : 'blue',
              children: <div className="pb-2">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-800">{activityLabels[activity.type] || activity.type}</span>
                  {activity.engagement_status && <Tag color={activity.engagement_status === 'rejected' ? 'volcano' : 'blue'}>{engagementLabels[activity.engagement_status] || activity.engagement_status}</Tag>}
                </div>
                {activity.content && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">{activity.content}</p>}
                <div className="mt-1 text-xs text-gray-400">{formatDate(activity.createdAt)} · {activity.user?.full_name || 'Không rõ người ghi'}</div>
              </div>,
            }))} /> : <Empty description="Chưa có hoạt động được ghi nhận">
              {!['enrolled', 'lost'].includes(lead.status) && <Button type="primary" onClick={() => openActivity()}>Ghi nhận liên hệ đầu tiên</Button>}
            </Empty>}
          </Spin>}
        {activityPagination.total > activityPagination.pageSize && <Pagination size="small" current={activityPagination.current} total={activityPagination.total} pageSize={activityPagination.pageSize} showSizeChanger={false} onChange={page => fetchActivities(page)} />}
      </Card>,
    },
    {
      key: 'overview',
      label: 'Thông tin lead',
      children: <Card><Descriptions column={{ xs: 1, md: 2 }} bordered size="small">
        <Descriptions.Item label="Họ tên">{lead.full_name}</Descriptions.Item>
        <Descriptions.Item label="Người phụ trách">{lead.assignedUser?.full_name || 'Chưa phân công'}</Descriptions.Item>
        <Descriptions.Item label="Điện thoại">{lead.phone || '-'}</Descriptions.Item>
        <Descriptions.Item label="Email">{lead.email || '-'}</Descriptions.Item>
        <Descriptions.Item label="Nguồn">{getLeadSourceLabel(lead.lead_source, sourceOptions)}</Descriptions.Item>
        <Descriptions.Item label="Khóa quan tâm">{lead.course?.name || '-'}</Descriptions.Item>
        <Descriptions.Item label="Nghề nghiệp">{occupationLabels[lead.occupation] || lead.occupation || '-'}</Descriptions.Item>
        <Descriptions.Item label="Mục tiêu học">{studyPurposeLabels[lead.study_purpose] || lead.study_purpose || '-'}</Descriptions.Item>
        <Descriptions.Item label="Ngày tạo">{formatDate(lead.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="Liên hệ gần nhất">{formatDate(lead.last_contacted)}</Descriptions.Item>
        <Descriptions.Item label="Ghi chú" span={2}><span className="whitespace-pre-wrap break-words">{lead.notes || '-'}</span></Descriptions.Item>
      </Descriptions></Card>,
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
            <Button icon={<PhoneOutlined />} href={lead.phone ? 'tel:' + lead.phone : undefined} disabled={!lead.phone}>Gọi điện</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openActivity()} disabled={['enrolled', 'lost'].includes(lead.status)}>Ghi nhận liên hệ</Button>
            <Dropdown trigger={['click']} menu={{ items: [
              { key: 'email', label: <a href={lead.email ? 'mailto:' + lead.email : undefined}>Soạn email</a>, disabled: !lead.email },
              { key: 'note', label: 'Thêm ghi chú nội bộ', onClick: () => openActivity('note') },
              { key: 'edit', label: 'Chỉnh sửa thông tin', onClick: openEdit },
              ...(user?.role === 'admin' ? [{ key: 'assign', label: 'Phân công sale', onClick: () => { setAssignSaleId(lead.assignedUser?.id); setAssignOpen(true); } }] : []),
              ...(user?.role === 'sale' && !lead.assignedUser ? [{ key: 'claim', label: 'Nhận phụ trách', onClick: handleClaimLead }] : []),
              { key: 'convert', label: 'Chuyển thành học viên', disabled: ['enrolled', 'lost'].includes(lead.status) || !lead.email, onClick: handleConvert },
              ...(!['enrolled', 'lost'].includes(lead.status) ? [{ key: 'lost', label: 'Đánh dấu thất bại', onClick: () => setLostOpen(true) }] : []),
            ] }}><Button loading={saving}>Thao tác khác</Button></Dropdown>
          </Space>
        }
      />

      <div className="mb-4">
        <Space wrap>
          <span className="text-gray-600">Giai đoạn:</span>
          <Select value={lead.status} style={{ width: 180 }} options={statusOptions} disabled={lead.status === 'enrolled'} loading={saving} onChange={handleStatusChange} />
        </Space>
      </div>

      {lead.status !== 'lost' && <Steps className="mb-6" size="small" current={['new', 'contacted', 'interested', 'trial', 'enrolled'].indexOf(lead.status)} items={['Tiếp nhận', 'Liên hệ', 'Quan tâm', 'Học thử', 'Đăng ký'].map(title => ({ title }))} />}
      <LeadConsultationPanel lead={lead} activities={latestActivities} onScore={handleScore} loading={saving} />
      <Tabs defaultActiveKey="timeline" items={tabs} />
      <MarkLostModal open={lostOpen} lead={lead} onCancel={() => setLostOpen(false)} onSuccess={() => { setLostOpen(false); fetchDetail(); fetchActivities(); }} />

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
          <Form.Item name="source" label="Nguồn lead" rules={[{ required: true }]}>
            <Select options={getEditableLeadSources(sourceOptions, lead.lead_source)} />
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

      <Drawer title="Ghi nhận chăm sóc" width={520} styles={{ wrapper: { maxWidth: '100vw' } }} open={activityOpen} onClose={() => setActivityOpen(false)} destroyOnClose>
        <Form form={activityForm} layout="vertical" onFinish={handleCreateActivity}>
          <Form.Item name="type" label="Loại tương tác" rules={[{ required: true }]}>
            <Select options={Object.entries(activityLabels).filter(([value]) => value !== 'status_change').map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="content" label="Nội dung và bước tiếp theo" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Nhu cầu của khách, điều còn phân vân và lịch liên hệ đã thống nhất..." />
          </Form.Item>
          {activityType !== 'note' && <Form.Item name="engagement_status" label="Kết quả liên hệ">
            <Select
              allowClear
              options={[
                { label: 'Chưa có phản hồi', value: 'unknown' },
                { label: 'Tương tác tích cực', value: 'positive_interaction' },
                { label: 'Quan tâm nhưng cần thêm thời gian', value: 'interested_need_time' },
                { label: 'Bận, hẹn gọi lại', value: 'busy_call_back' },
                { label: 'Không nghe máy', value: 'not_answering' },
                { label: 'Sai số', value: 'wrong_number' },
                { label: 'Từ chối', value: 'rejected' },
              ]}
            />
          </Form.Item>}
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>Lưu</Button>
            <Button onClick={() => setActivityOpen(false)}>Hủy</Button>
          </Space>
        </Form>
      </Drawer>
    </div>
  );
}
