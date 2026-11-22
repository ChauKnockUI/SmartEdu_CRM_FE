import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Tabs,
  Descriptions,
  Tag,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
} from 'antd';
import {
  EditOutlined,
  KeyOutlined,
  CopyOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useParams, useSearchParams } from 'react-router';
import { RiskEstimate, RiskDetailsDrawer } from '../../shared/components/DropoutRisk';
import { type DropoutRiskView } from '../../shared/utils/dropoutRisk';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { useAuth } from '../../shared/contexts/AuthContext';
import { PageHeader } from '../../shared/components/PageHeader';
import { studentService } from '@/services/api/student.service';
import { financeService } from '@/services/api/finance.service';
import { LeadEnrollmentModal } from '../crm/components/LeadEnrollmentModal';
import { getStudentPermissions } from './studentPermissions';
import { BillingStatusTag, billingDate } from '../finance/billingStatus';
import { InvoiceDetailDrawer } from '../finance/InvoiceDetailDrawer';
import { studentStatusColors as STATUS_COLORS, studentStatusLabels as STATUS_LABELS } from './studentFilters';
import { getClassStatus } from './classFilters';
import { StudentScheduleTab } from './StudentScheduleTab';

type Student = any;

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export function StudentProfileError({ error, own, onRetry }: { error: any; own: boolean; onRetry: () => void }) {
  const title = error.status === 404 ? own ? 'Chưa có hồ sơ học viên liên kết' : 'Không tìm thấy hồ sơ trong phạm vi được xem'
    : error.status === 403 ? 'Không có quyền xem hồ sơ' : error.status === 401 ? 'Phiên đăng nhập không hợp lệ' : 'Không tải được hồ sơ học viên';
  return <Alert type="error" showIcon message={title} description={error.message}
    action={<Button onClick={onRetry}>Thử lại</Button>} />;
}

export function StudentDetailPage() {
  const { id } = useParams();
  const { classId: contextClassId, openDetail, navigationState } = useDetailNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { manageProfile: canManageStudent, viewFinance, evaluateRisk } = getStudentPermissions(user?.role);
  const isStudent = user?.role === 'student';
  const isOwnProfile = isStudent && !id;
  const canViewLead = user?.role === 'admin' || user?.role === 'sale';
  const scope = `${user?.id}:${user?.role}:${id || 'me'}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const profileRequest = useRef(0), invoiceRequest = useRef(0), riskRequest = useRef(0), scoreRequest = useRef(0);
  const profileAbort = useRef<AbortController | null>(null);
  const invoiceAbort = useRef<AbortController | null>(null);
  const riskAbort = useRef<AbortController | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const canReview = ['admin', 'sale', 'teacher'].includes(user?.role || '');
  const [classRisks, setClassRisks] = useState<Record<number, DropoutRiskView>>({});
  const [riskFetching, setRiskFetching] = useState(false);
  const [riskError, setRiskError] = useState('');
  const selectedClassId = canReview ? Number(searchParams.get('risk_class')) || null : null;
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab && ['overview', 'classes', 'schedule', ...(viewFinance ? ['finance'] : [])].includes(requestedTab)
    ? requestedTab : contextClassId || selectedClassId ? 'classes' : 'overview';

  const [profile, setProfile] = useState<Student | null>(null);
  const [profileScope, setProfileScope] = useState('');
  const student = profileScope === scope ? profile : null;
  const latestStudentId = useRef<number | undefined>(student?.id); latestStudentId.current = student?.id;
  const [profileError, setProfileError] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceOwner, setInvoiceOwner] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceDetailId, setInvoiceDetailId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [riskLoading, setRiskLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const mutationBusy = useRef(false);

  const [form] = Form.useForm();

  const fetchStudent = async () => {
    profileAbort.current?.abort();
    const controller = new AbortController(); profileAbort.current = controller;
    const request = ++profileRequest.current;
    try {
      setLoading(true);
      setProfileError(null);
      const res = isOwnProfile ? await studentService.getMyProfile(controller.signal)
        : await studentService.getById(Number(id), controller.signal);
      if (request !== profileRequest.current || scope !== currentScope.current || controller.signal.aborted) return;
      const data = res.data;
      setProfile(data); setProfileScope(scope);
      form.setFieldsValue({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        status: data.status,
      });
    } catch (err: any) {
      if (request !== profileRequest.current || scope !== currentScope.current || controller.signal.aborted) return;
      setProfileError(err);
      if (err.status === 403 || err.status === 404 || err.status === 401) {
        setProfile(null); invoiceRequest.current++; riskRequest.current++;
        invoiceAbort.current?.abort(); riskAbort.current?.abort(); setInvoices([]); setClassRisks({});
      }
    } finally {
      if (request === profileRequest.current && scope === currentScope.current) setLoading(false);
    }
  };

  const fetchInvoices = async (studentId: number) => {
    if (!viewFinance) return;
    invoiceAbort.current?.abort();
    const controller = new AbortController(); invoiceAbort.current = controller;
    const request = ++invoiceRequest.current;
    setInvoiceLoading(true); setInvoiceError('');
    try {
      const result = await financeService.getStudentInvoices(studentId, controller.signal);
      if (request !== invoiceRequest.current || scope !== currentScope.current || studentId !== latestStudentId.current || controller.signal.aborted) return;
      setInvoices(result.data || []); setInvoiceOwner(`${scope}:${studentId}`);
    } catch (error: any) {
      if (request !== invoiceRequest.current || scope !== currentScope.current || studentId !== latestStudentId.current || controller.signal.aborted) return;
      setInvoices([]); setInvoiceOwner(`${scope}:${studentId}`); setInvoiceError(error.message || 'Không tải được học phí');
    } finally {
      if (request === invoiceRequest.current && scope === currentScope.current) setInvoiceLoading(false);
    }
  };

  const fetchRisks = async (studentId: number) => {
    if (!canReview) return;
    riskAbort.current?.abort();
    const controller = new AbortController(); riskAbort.current = controller;
    const request = ++riskRequest.current;
    setRiskFetching(true); setRiskError('');
    try {
      const result = await studentService.getClassDropoutRisks(studentId, controller.signal);
      if (request !== riskRequest.current || scope !== currentScope.current || studentId !== latestStudentId.current || controller.signal.aborted) return;
      setClassRisks(Object.fromEntries((result.data || []).map((item: DropoutRiskView) => [item.class_id, item])));
    } catch (error: any) {
      if (request === riskRequest.current && scope === currentScope.current && !controller.signal.aborted) {
        setClassRisks({}); setRiskError(error.message || 'Không tải được cảnh báo theo lớp');
      }
    } finally {
      if (request === riskRequest.current && scope === currentScope.current) setRiskFetching(false);
    }
  };

  const refreshAll = () => {
    setScheduleRevision(value => value + 1);
    fetchStudent();
    if (student?.id) { if (viewFinance) fetchInvoices(student.id); if (canReview) fetchRisks(student.id); }
  };

  useEffect(() => {
    setProfile(null); setProfileScope(''); setProfileError(null);
    setInvoiceDetailId(null);
    setEditOpen(false); setPasswordOpen(false); setEnrollOpen(false); setNewPassword(''); setSaving(false);
    fetchStudent();
    return () => {
      profileRequest.current++; invoiceRequest.current++; riskRequest.current++; scoreRequest.current++;
      profileAbort.current?.abort(); invoiceAbort.current?.abort(); riskAbort.current?.abort();
    };
  }, [scope]);
  useEffect(() => {
    setInvoices([]); setInvoiceOwner(''); setInvoiceError(''); setInvoiceLoading(false);
    if (student?.id && viewFinance) fetchInvoices(student.id);
    return () => { invoiceRequest.current++; invoiceAbort.current?.abort(); };
  }, [student?.id, scope, viewFinance]);
  useEffect(() => {
    setClassRisks({}); setRiskError(''); setRiskFetching(false);
    if (student?.id && canReview) fetchRisks(student.id);
    return () => { riskRequest.current++; riskAbort.current?.abort(); };
  }, [student?.id, scope, canReview]);
  useEffect(() => { scoreRequest.current++; setRiskLoading(false); }, [scope, selectedClassId]);

  const openRisk = (classId: number) => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    next.set('tab', 'classes');
    next.set('risk_class', String(classId));
    return next;
  }, { replace: true, state: navigationState });
  const closeRisk = () => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    next.delete('risk_class');
    return next;
  }, { replace: true, state: navigationState });

  const handleUpdate = async () => {
    if (!canManageStudent || !student || mutationBusy.current) return;
    mutationBusy.current = true; setSaving(true);
    try {
      const values = await form.validateFields();
      if (scope !== currentScope.current) return;
      await studentService.update(student.id, values);
      if (scope !== currentScope.current) return;
      message.success('Cập nhật học viên thành công');
      setEditOpen(false);
      refreshAll();
    } catch (err: any) {
      if (scope === currentScope.current && !err.errorFields) message.error(err.message || 'Cập nhật thất bại');
    } finally {
      mutationBusy.current = false;
      if (scope === currentScope.current) setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!canManageStudent || !student || mutationBusy.current) return;
    mutationBusy.current = true; setSaving(true);
    try {
      const res = await studentService.resetPassword(student.id);
      if (scope !== currentScope.current) return;
      setNewPassword(res.new_password);
      setPasswordOpen(true);
    } catch (err: any) {
      if (scope === currentScope.current) message.error(err.message || 'Reset mật khẩu thất bại');
    } finally {
      mutationBusy.current = false;
      if (scope === currentScope.current) setSaving(false);
    }
  };

  const handleScoreDropoutRisk = async () => {
    if (!evaluateRisk || !student || !selectedClassId || riskLoading) return;
    const request = ++scoreRequest.current;
    try {
      setRiskLoading(true);
      const result = await studentService.scoreDropoutRisk(student.id, selectedClassId);
      if (scope !== currentScope.current || request !== scoreRequest.current) return;
      if (!result.data) throw new Error(result.reason || 'Lớp không còn trong giai đoạn theo dõi');
      await fetchRisks(student.id);
      if (scope !== currentScope.current || request !== scoreRequest.current) return;
      message.success('Đã cập nhật đánh giá nguy cơ bỏ học');
    } catch (err: any) {
      if (scope === currentScope.current && request === scoreRequest.current) message.error(err.message || 'Không cập nhật được đánh giá');
    } finally {
      if (scope === currentScope.current && request === scoreRequest.current) setRiskLoading(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      message.success('Đã copy mật khẩu');
    } catch { message.error('Không sao chép được. Vui lòng chọn và sao chép mật khẩu.'); }
  };

  if (!student) {
    return profileError ? <StudentProfileError error={profileError} own={isOwnProfile} onRetry={fetchStudent} /> : <Card loading />;
  }

  const enrolledClasses = student.classEnrollments || [];
  const activeClasses = enrolledClasses.filter((item: any) => item.status === 'active' && ['ongoing', 'upcoming'].includes(item.class?.status));
  const selectedClass = activeClasses.find((item: any) => item.class_id === selectedClassId);

  const classColumns = [
    {
      title: 'Lớp học',
      render: (_: any, record: any) => (
        canManageStudent || user?.role === 'teacher' || record.status === 'active'
          ? <Button type="link" style={{ padding: 0 }} onClick={() => openDetail(`/lms/classes/${record.class_id}${isStudent ? '' : '?tab=students'}`)}>{record.class?.name}</Button>
          : record.class?.name
      ),
    },
    {
      title: 'Khóa học',
      render: (_: any, record: any) => record.class?.course?.name || '-',
    },
    {
      title: 'Giảng viên',
      render: (_: any, record: any) =>
        record.class?.teacher?.full_name || 'Chưa phân công',
    },
    {
      title: 'Trạng thái',
      render: (_: any, record: any) => {
        const status = getClassStatus(record.class?.status);
        return <Space wrap><Tag color={status.color}>{status.label}</Tag>
          {record.status === 'dropped' && <Tag color="red">Đã nghỉ lớp</Tag>}
          {record.status === 'completed' && <Tag>Đã hoàn thành đăng ký</Tag>}
        </Space>;
      },
    },
    ...(canReview ? [{
      title: 'Nguy cơ bỏ học',
      width: 180,
      render: (_: any, record: any) => record.status !== 'active' || ['completed', 'cancelled'].includes(record.class?.status)
        ? <Typography.Text type="secondary">Đã kết thúc theo dõi</Typography.Text>
        : record.class?.status !== 'ongoing' ? <Typography.Text type="secondary">Chưa bắt đầu</Typography.Text>
        : riskError ? <Typography.Text type="secondary">Không tải được đánh giá</Typography.Text>
        : riskFetching ? <Typography.Text type="secondary">Đang tải…</Typography.Text>
        : classRisks[record.class_id] ? <RiskEstimate data={classRisks[record.class_id]} showReason={false} onOpen={() => openRisk(record.class_id)} />
        : <Typography.Text type="secondary">—</Typography.Text>,
    }] : []),
  ];

  const invoiceColumns = [
    { title: 'Mã khoản thu', dataIndex: 'invoice_no' },
    { title: 'Phải thu sau giảm giá', dataIndex: 'payable_amount', render: money },
    { title: 'Đã thu', dataIndex: 'paid_amount', render: money },
    { title: 'Còn nợ', dataIndex: 'remaining_amount', render: money },
    {
      title: 'Hạn thu',
      dataIndex: 'due_date',
      render: (value: string) => billingDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'collection_status',
      render: (status: string) => <BillingStatusTag status={status} />,
    },
    { title: 'Thao tác', render: (_: any, record: any) => <Button type="link" onClick={() => setInvoiceDetailId(record.id)}>Chi tiết / Phiếu thu</Button> },
  ];

  return (
    <div className="crm-page">
      <PageHeader
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          ...(isStudent ? [{ title: 'Hồ sơ của tôi' }] : [{ title: 'Học viên', href: '/lms/students' }, { title: student.full_name }]),
        ]}
        actions={<Space wrap>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={refreshAll}>Tải lại</Button>
          {canManageStudent && <>
          <Button
            icon={<KeyOutlined />}
            disabled={saving}
            onClick={handleResetPassword}
          >
            Cấp lại mật khẩu
          </Button>

          <Button
            type="primary"
            icon={<EditOutlined />}
            disabled={saving}
            onClick={() => setEditOpen(true)}
          >
            Chỉnh sửa
          </Button>
          </>}
        </Space>}
      />

      {profileError && <div className="mb-4"><StudentProfileError error={profileError} own={isOwnProfile} onRetry={fetchStudent} />
        <Typography.Text type="secondary">Đang hiển thị hồ sơ của lần tải trước.</Typography.Text></div>}

      <Tabs
        activeKey={activeTab}
        onChange={key => setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', key);
          next.delete('risk_class');
          return next;
        }, { replace: true, state: navigationState })}
        items={[
          {
            key: 'overview',
            label: 'Tổng quan',
            children: (
              <>
                <Row gutter={[16, 16]} className="mb-4">
                  <Col xs={24} sm={canViewLead ? 8 : 12}>
                    <Card>
                      <Statistic
                        title="Số lớp đang tham gia"
                        value={activeClasses.length}
                        prefix={<TeamOutlined />}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} sm={canViewLead ? 8 : 12}>
                    <Card>
                      <Statistic
                        title="Trạng thái"
                        value={STATUS_LABELS[student.status]}
                      />
                    </Card>
                  </Col>

                  {canViewLead && <Col xs={24} sm={8}>
                    <Card>
                      <Statistic
                        title="Nguồn"
                        value={student.lead_id ? 'Từ Lead' : 'Đăng ký trực tiếp'}
                      />
                    </Card>
                  </Col>}
                </Row>

                <Card loading={loading}>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Họ tên">
                      {student.full_name}
                    </Descriptions.Item>

                    <Descriptions.Item label="Trạng thái">
                      <Tag color={STATUS_COLORS[student.status]}>
                        {STATUS_LABELS[student.status]}
                      </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Email">
                      <Space>
                        <MailOutlined />
                        {student.email}
                      </Space>
                    </Descriptions.Item>

                    <Descriptions.Item label="Số điện thoại">
                      <Space>
                        <PhoneOutlined />
                        {student.phone || '-'}
                      </Space>
                    </Descriptions.Item>

                    <Descriptions.Item label="Ngày sinh">
                      {student.dob
                        ? new Date(student.dob).toLocaleDateString('vi-VN')
                        : '-'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Tài khoản đăng nhập">
                      {student.user?.email || '-'}
                    </Descriptions.Item>

                    {canViewLead && <Descriptions.Item label="Nguồn lead">
                      {student.lead?.full_name || 'Không có'}
                    </Descriptions.Item>}

                    {canViewLead && <Descriptions.Item label="Lead email">
                      {student.lead?.email || '-'}
                    </Descriptions.Item>}
                  </Descriptions>
                </Card>
              </>
            ),
          },

          {
            key: 'classes',
            label: 'Lớp học',
            children: (
              <Card title={`Lớp học (${enrolledClasses.length})`}
                extra={canManageStudent && student.lead?.course_id && !activeClasses.some((item: any) => item.class?.course_id === student.lead.course_id)
                  ? <Button type="primary" onClick={() => setEnrollOpen(true)}>Xếp lớp</Button> : undefined}>
                {!activeClasses.length && student.lead && <Alert className="mb-4" type="info" showIcon message="Học viên đã được chuyển từ Lead, chưa có lớp đang học hoặc sắp mở."
                  description={canManageStudent ? !student.lead.course_id
                    ? <Button type="link" onClick={() => openDetail(`/crm/leads/${student.lead.id}`)}>Bổ sung khóa quan tâm tại Lead</Button>
                    : 'Chọn Xếp lớp để tiếp tục đăng ký học.' : 'Học viên đang chờ Admin xếp lớp.'} />}
                {isStudent && !activeClasses.length && <Alert className="mb-4" type="info" showIcon message="Chưa có lớp đang học hoặc sắp mở. Vui lòng liên hệ trung tâm nếu cần xếp lớp." />}
                {canReview && riskError && <Alert className="mb-4" type="error" showIcon message={riskError}
                  action={<Button loading={riskFetching} onClick={() => fetchRisks(student.id)}>Thử lại</Button>} />}
                <Table
                  rowKey="class_id"
                  dataSource={enrolledClasses}
                  columns={classColumns}
                  pagination={false}
                  scroll={{ x: 900 }}
                />
              </Card>
            ),
          },

          {
            key: 'schedule',
            label: 'Lịch học',
            children: (
              <StudentScheduleTab key={`${scope}:${student.id}`} studentId={student.id} enrollments={enrolledClasses}
                enabled={activeTab === 'schedule'} revision={scheduleRevision} />
            ),
          },
          {
            key: 'finance',
            label: 'Học phí',
            children: (
              <Card title="Khoản phải thu và công nợ">
                {invoiceError ? <Alert type="error" showIcon message="Không tải được học phí" description={invoiceError}
                  action={<Button loading={invoiceLoading} onClick={() => fetchInvoices(student.id)}>Thử lại</Button>} /> : <Table
                  rowKey="id"
                  loading={invoiceLoading || invoiceOwner !== `${scope}:${student.id}`}
                  dataSource={invoiceOwner === `${scope}:${student.id}` ? invoices : []}
                  columns={invoiceColumns}
                  pagination={false}
                  locale={{ emptyText: invoiceLoading || invoiceOwner !== `${scope}:${student.id}` ? 'Đang tải học phí…' : 'Chưa có khoản phải thu' }}
                />}
              </Card>
            ),
          },
        ].filter(tab => tab.key !== 'finance' || viewFinance)}
      />

      {canManageStudent && <LeadEnrollmentModal open={enrollOpen} lead={student.lead} studentId={student.id} enrollments={enrolledClasses} onCancel={() => setEnrollOpen(false)}
        onSuccess={() => { if (scope === currentScope.current) { setEnrollOpen(false); refreshAll(); } }} />}
      <RiskDetailsDrawer open={canReview && !!selectedClass && !!classRisks[selectedClassId!]}
        onClose={closeRisk} name={student.full_name} className={selectedClass?.class?.name}
        data={selectedClassId ? classRisks[selectedClassId] : undefined} loading={riskLoading}
        onEvaluate={evaluateRisk && selectedClass?.class?.status === 'ongoing' ? handleScoreDropoutRisk : undefined} />

      {/* EDIT */}
      <Modal
        title="Chỉnh sửa học viên"
        open={canManageStudent && editOpen}
        confirmLoading={saving}
        onCancel={() => setEditOpen(false)}
        onOk={handleUpdate}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="full_name"
            label="Họ tên"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true },
              { type: 'email' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
          >
            <Select
              options={[
                { label: 'Đang học', value: 'active' },
                { label: 'Tạm ngưng', value: 'inactive' },
                { label: 'Đã tốt nghiệp', value: 'graduated' },
                { label: 'Nghỉ học', value: 'dropped' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {viewFinance && <InvoiceDetailDrawer key={scope} invoiceId={invoiceDetailId} onClose={() => setInvoiceDetailId(null)}
        onChanged={() => { if (student) fetchInvoices(student.id); }} />}

      {/* RESET PASSWORD */}
      <Modal
        title="Mật khẩu mới"
        open={canManageStudent && passwordOpen}
        onCancel={() => setPasswordOpen(false)}
        footer={[
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={copyPassword}
          >
            Copy
          </Button>,
          <Button
            key="close"
            onClick={() => setPasswordOpen(false)}
          >
            Đóng
          </Button>,
        ]}
      >
        <Typography.Text>
          Backend chỉ trả mật khẩu này đúng 1 lần.
        </Typography.Text>

        <div className="mt-4 p-4 bg-gray-100 rounded text-center">
          <Typography.Title level={3}>
            {newPassword}
          </Typography.Title>
        </div>
      </Modal>
    </div>
  );
}
