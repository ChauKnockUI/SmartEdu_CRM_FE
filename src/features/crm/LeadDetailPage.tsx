import { detailDescriptions } from '../../shared/utils/detailLayout';
import { paginationProps } from '../../shared/utils/pagination';
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
  Tooltip,
} from 'antd';
import { MailOutlined, PhoneOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams, useSearchParams } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { PageState } from '../../shared/components/PageState';
import { useAuth } from '../../shared/contexts/AuthContext';
import { leadService, type LeadSourceOption } from '@/services/api/lead.service';
import { courseService } from '@/services/api/course.service';
import { userService } from '@/services/api/user.service';
import { LeadConsultationPanel } from './components/LeadConsultationPanel';
import { MarkLostModal } from './components/MarkLostModal';
import { getEditableLeadSources, getLeadSourceLabel } from './leadSources';
import { getLeadAssigneeOptions, hasLeadAssignee, canUnassignLead, LEAD_ASSIGNMENT_REQUIRED,
  leadContactBlockReason, leadConvertBlockReason, leadTransitionBlockReason } from './leadAssignment';
import { LEAD_STATUSES, LEAD_OPEN_STAGES, LEAD_ACTIONS, LEAD_MESSAGES, LEAD_ACTIVITY_LABELS as activityLabels } from './leadStatus';
import { LeadEnrollmentModal } from './components/LeadEnrollmentModal';
import { LeadEmailDrawer } from './components/LeadEmailDrawer';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';

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

const statusOptions = LEAD_STATUSES.map(({ value, label }) => ({ value, label }));
const occupationOptions = Object.entries(occupationLabels).map(([value, label]) => ({ value, label }));
const studyPurposeOptions = Object.entries(studyPurposeLabels).map(([value, label]) => ({ value, label }));

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';
}

export function LeadDetailPage() {
  const { openDetail, goBack } = useDetailNavigation();
  const [convertOpen, setConvertOpen] = useState(false);
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const detailScope = `${id}:${user?.id}:${user?.role}`;
  const [detailOwner, setDetailOwner] = useState(''), [detailError, setDetailError] = useState('');
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
  const [assignSaleId, setAssignSaleId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [form] = Form.useForm();
  const [activityForm] = Form.useForm();
  const activityType = Form.useWatch('type', activityForm);

  const canManageLead = user?.role === 'admin' || user?.role === 'sale';
  const canCare = hasLeadAssignee(lead);
  const contactBlocked = leadContactBlockReason(lead);
  const convertBlocked = leadConvertBlockReason(lead);

  const fetchDetail = async () => {
    if (!id) return;
    const requestId = ++detailRequest.current;
    try {
      setLoading(true);
      setDetailError('');
      const res = await leadService.getById(id);
      if (requestId !== detailRequest.current) return;
      setLead(res.data);
      setDetailOwner(detailScope);
    } catch (err: any) {
      if (requestId === detailRequest.current) {
        setLead(null); setDetailOwner(detailScope); setDetailError(err.message || 'Không tải được thông tin Lead.');
      }
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
    setEmailOpen(false);
    setActivityOpen(false);
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
  }, [id, user?.id, user?.role]);

  const queueRefresh = () => {
    refreshTimers.current.push(setTimeout(() => { fetchDetail(); fetchActivities(); }, 2500));
  };

  useEffect(() => {
    if (searchParams.get('contact') !== '1' || !lead || String(lead.id) !== id) return;
    const reason = leadContactBlockReason(lead);
    if (!reason) {
      activityForm.resetFields();
      activityForm.setFieldsValue({ type: 'call', engagement_status: 'unknown' });
      setActivityOpen(true);
    } else message.warning(reason);
    const next = new URLSearchParams(searchParams);
    next.delete('contact');
    setSearchParams(next, { replace: true });
  }, [id, lead?.id, searchParams]);

  const openActivity = (type = 'call') => {
    if (type !== 'note' && contactBlocked) { message.warning(contactBlocked); return; }
    activityForm.resetFields();
    activityForm.setFieldsValue({ type, engagement_status: 'unknown' });
    setActivityOpen(true);
  };

  const courseOptions = courses.map((course) => ({ label: course.name, value: course.id }));

  const openEdit = () => {
    form.setFieldsValue({
      full_name: lead.full_name,
      phone: lead.phone,
      email: lead.email,
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
      message.success(values.status ? LEAD_MESSAGES.stageUpdated : LEAD_MESSAGES.updated);
      setEditOpen(false);
      fetchDetail();
      fetchActivities();
      queueRefresh();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || LEAD_MESSAGES.updateFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!lead) return;
    if (saving) return;
    const reason = leadTransitionBlockReason(lead, status);
    if (reason) { message.warning(reason); return; }
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
    if (saving) return;
    if (convertBlocked) { message.warning(convertBlocked); return; }

    setConvertOpen(true);
  };

  const handleAssignLead = async () => {
    if (saving) return;
    if (assignSaleId === (lead.assigned_to ?? 0)) {
      setAssignOpen(false);
      return;
    }

    try {
      setSaving(true);
      await leadService.update(String(lead.id), { assigned_to: assignSaleId === 0 ? null : assignSaleId });
      message.success(assignSaleId === 0 ? LEAD_MESSAGES.unassigned : LEAD_MESSAGES.assigned);
      setAssignOpen(false);
      fetchDetail();
      fetchActivities();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || LEAD_MESSAGES.assignFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateActivity = async (values: any) => {
    if (saving) return;
    if (values.type !== 'note' && contactBlocked) { message.warning(contactBlocked); return; }
    try {
      setSaving(true);
      const isContact = ['call', 'email', 'sms', 'meeting'].includes(values.type);
      await leadService.createActivity(String(lead.id), { ...values, engagement_status: isContact ? values.engagement_status || 'unknown' : undefined });
      message.success(isContact ? LEAD_MESSAGES.contactSaved : LEAD_MESSAGES.noteSaved);
      activityForm.resetFields();
      setActivityOpen(false);
      fetchDetail();
      fetchActivities();
      queueRefresh();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || LEAD_MESSAGES.contactFailed);
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

  if (detailOwner !== detailScope || !lead) return <PageState loading={loading || detailOwner !== detailScope}
    title={loading || detailOwner !== detailScope ? 'Đang tải Lead...' : 'Không tải được Lead'}
    description={detailError || 'Lead không tồn tại hoặc không thuộc phạm vi được xem.'} onRetry={fetchDetail} onBack={goBack} />;

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
                  {activity.email_delivery === 'accepted' && <Tag color="cyan">Dịch vụ đã tiếp nhận</Tag>}
                  {activity.engagement_status && <Tag color={activity.engagement_status === 'rejected' ? 'volcano' : 'blue'}>{engagementLabels[activity.engagement_status] || activity.engagement_status}</Tag>}
                </div>
                {activity.content && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">{activity.content}</p>}
                <div className="mt-1 text-xs text-gray-400">{formatDate(activity.createdAt)} · {activity.user?.full_name || 'Không rõ người ghi'}</div>
              </div>,
            }))} /> : <Empty description="Chưa có hoạt động được ghi nhận">
              {!['enrolled', 'lost'].includes(lead.status) && <Tooltip title={contactBlocked}><span><Button type="primary" disabled={!!contactBlocked || saving}
                onClick={() => openActivity()}>{LEAD_ACTIONS.contact}</Button></span></Tooltip>}
            </Empty>}
          </Spin>}
        {activityPagination.total > activityPagination.pageSize && <Pagination {...paginationProps('hoạt động', {
          current: activityPagination.current, total: activityPagination.total, pageSize: activityPagination.pageSize,
          showSizeChanger: false, onChange: page => fetchActivities(page),
        })} />}
      </Card>,
    },
    {
      key: 'overview',
      label: 'Thông tin lead',
      children: <Card><Descriptions {...detailDescriptions}>
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
        <Descriptions.Item label="Ghi chú" span="filled"><span className="whitespace-pre-wrap break-words">{lead.notes || '-'}</span></Descriptions.Item>
      </Descriptions></Card>,
    },
  ];

  return (
    <div className="crm-page">
      <PageHeader
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'CRM' },
          { title: 'Leads', href: '/crm/leads' },
          { title: lead.full_name },
        ]}
        actions={
          <Space wrap>
            <Tooltip title={contactBlocked || 'Mở ứng dụng gọi trên thiết bị. Sau cuộc gọi, dùng Ghi nhận kết quả để lưu lịch sử.'}>
              <span><Button icon={<PhoneOutlined />} href={!contactBlocked && lead.phone ? 'tel:' + lead.phone : undefined}
                disabled={!!contactBlocked || !lead.phone}>Gọi điện</Button></span>
            </Tooltip>
            <Tooltip title={contactBlocked || (!lead.email ? 'Bổ sung email cho Lead trước khi gửi.' : undefined)}>
              <span><Button icon={<MailOutlined />} onClick={() => setEmailOpen(true)} disabled={!!contactBlocked || !lead.email || saving}>Soạn email</Button></span>
            </Tooltip>
            <Tooltip title={contactBlocked}><span><Button type="primary" icon={<PlusOutlined />} onClick={() => openActivity()}
              disabled={!!contactBlocked || saving}>{LEAD_ACTIONS.contact}</Button></span></Tooltip>
            <Dropdown trigger={['click']} menu={{ items: [
              { key: 'note', label: 'Thêm ghi chú nội bộ', onClick: () => openActivity('note') },
              { key: 'edit', label: 'Chỉnh sửa thông tin', onClick: openEdit },
              ...(user?.role === 'admin' ? [{ key: 'assign', label: LEAD_ACTIONS.assign, onClick: () => { setAssignSaleId(lead.assigned_to ?? 0); setAssignOpen(true); } }] : []),
              { key: 'convert', label: <Tooltip title={convertBlocked}><span>{LEAD_ACTIONS.convert}</span></Tooltip>, disabled: !!convertBlocked, onClick: handleConvert },
              ...(!['enrolled', 'lost'].includes(lead.status) ? [{ key: 'lost', label: LEAD_ACTIONS.lost, onClick: () => setLostOpen(true) }] : []),
            ] }}><Button loading={saving}>Thao tác khác</Button></Dropdown>
          </Space>
        }
      />

      <div className="flex flex-col gap-5">
        {lead.student?.id && <Alert type="success" showIcon message="Lead đã được chuyển thành học viên"
          description={lead.student.classEnrollments?.some((item: any) => ['upcoming', 'ongoing'].includes(item.class?.status))
            ? 'Học viên đã có lớp đang học hoặc sắp mở.' : 'Học viên chưa có lớp đang học hoặc sắp mở. Mở hồ sơ học viên để tiếp tục xếp lớp.'}
          action={<Button onClick={() => openDetail(`/lms/students/${lead.student.id}?tab=classes`)}>Hồ sơ học viên</Button>} />}
        {!canCare && !['enrolled', 'lost'].includes(lead.status) && <div>
          <Alert type="info" showIcon message={LEAD_ASSIGNMENT_REQUIRED}
            action={user?.role === 'admin' ? <Button size="small"
              onClick={() => { setAssignSaleId(lead.assigned_to ?? 0); setAssignOpen(true); }}>Phân công sale</Button> : undefined} />
        </div>}
        <div className="crm-lead-stage">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-gray-600">Giai đoạn:</span>
          <Tooltip title={lead.status === 'enrolled' ? leadTransitionBlockReason(lead, 'new') : undefined}><span>
            <Select value={lead.status} style={{ width: 180 }} options={statusOptions.map(option => {
              const reason = leadTransitionBlockReason(lead, option.value);
              return { ...option, disabled: !!reason, title: reason };
            })} disabled={lead.status === 'enrolled' || saving} loading={saving} onChange={handleStatusChange} />
          </span></Tooltip>
        </div>
        {lead.status !== 'lost' && <div>
          <Steps size="small" responsive={false} titlePlacement="vertical" current={LEAD_OPEN_STAGES.findIndex(stage => stage.value === lead.status)}
            items={LEAD_OPEN_STAGES.map(stage => ({ title: stage.label }))} />
        </div>}
        </div>
        <div>
          <LeadConsultationPanel lead={lead} activities={latestActivities} onScore={handleScore} loading={saving} />
        </div>
        <div>
          <Tabs defaultActiveKey="timeline" items={tabs} />
        </div>
      </div>
      <LeadEnrollmentModal open={convertOpen} lead={lead} onCancel={() => setConvertOpen(false)}
        onSuccess={studentId => { setConvertOpen(false); openDetail(`/lms/students/${studentId}?tab=classes`); }} />
      <MarkLostModal open={lostOpen} lead={lead} onCancel={() => setLostOpen(false)} onSuccess={() => { setLostOpen(false); fetchDetail(); fetchActivities(); }} />

      <Modal
        title="Phân công lead"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={handleAssignLead}
        okText="Lưu"
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
            options={getLeadAssigneeOptions(sales, lead)}
          />
          {!canUnassignLead(lead) && <div className="text-xs text-gray-500">Lead đang được chăm sóc. Hãy chọn Sale khác để chuyển người phụ trách.</div>}
        </Space>
      </Modal>

      <Drawer title="Chỉnh sửa lead" width={520} open={editOpen} onClose={() => setEditOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="full_name" label="Họ tên"
            rules={[{ required: true, whitespace: true, message: 'Nhập họ tên' }, { max: 255, message: 'Họ tên tối đa 255 ký tự' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại"
            rules={[{ required: true, whitespace: true, message: 'Nhập số điện thoại' },
              { pattern: /^[0-9]{10}$/, transform: value => value?.trim(), message: 'Số điện thoại phải có đúng 10 chữ số' }]}>
            <Input inputMode="numeric" />
          </Form.Item>
          <Form.Item name="email" label="Email"
            rules={[{ required: true, whitespace: true, message: 'Nhập email' },
              { type: 'email', transform: value => value?.trim(), message: 'Email không hợp lệ' }, { max: 255, message: 'Email tối đa 255 ký tự' }]}>
            <Input maxLength={255} />
          </Form.Item>
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

      <LeadEmailDrawer key={lead.id} open={emailOpen} lead={lead} onClose={() => setEmailOpen(false)}
        onSent={() => { fetchDetail(); fetchActivities(); queueRefresh(); }} />

      <Drawer title="Ghi nhận kết quả chăm sóc" width={520} styles={{ wrapper: { maxWidth: '100vw' } }} open={activityOpen} onClose={() => setActivityOpen(false)} destroyOnClose>
        <Alert className="mb-4" type="info" showIcon message="Ghi lại hoạt động đã thực hiện"
          description="Lưu kết quả gọi điện, email/SMS đã gửi bên ngoài hoặc tư vấn trực tiếp. Để gửi email từ CRM, dùng nút Soạn email." />
        <Form form={activityForm} layout="vertical" onFinish={handleCreateActivity}>
          <Form.Item name="type" label="Loại tương tác" rules={[{ required: true }]}>
            <Select options={Object.entries(activityLabels).filter(([value]) => value !== 'status_change').map(([value, label]) => ({ value,
              label: value === 'email' ? 'Email đã gửi bên ngoài' : value === 'sms' ? 'SMS đã gửi bên ngoài' : label,
              disabled: value !== 'note' && !!contactBlocked, title: value !== 'note' ? contactBlocked : undefined }))} />
          </Form.Item>
          <Form.Item name="content" label="Nội dung trao đổi" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Ghi lại nhu cầu, phản hồi của khách và nội dung đã thống nhất. Nếu có hẹn liên hệ lại, ghi rõ thời gian." />
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
