import { paginationProps } from '../../shared/utils/pagination';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  message,
  Typography,
  Alert,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ExportOutlined,
  ReloadOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { useSearchParams } from 'react-router';
import { studentService } from '@/services/api/student.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import { getStudentPermissions } from './studentPermissions';
import { BillingStatusTag } from '../finance/billingStatus';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { useSearchInput } from '../../shared/hooks/useSearchInput';
import { clearListCache } from '../../services/api/listCache';
import { STUDENT_STATUSES, studentStatusColors as STATUS_COLORS, studentStatusLabels as STATUS_LABELS,
  studentPageSizes, readStudentLocation, writeStudentLocation, studentQueryParams, studentExportParams,
  studentClassLabel, type StudentListView } from './studentFilters';

type Student = any;

export function StudentsPage() {
  const { openDetail } = useDetailNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { manageProfile, viewFinance, exportStudents: canExport } = getStudentPermissions(user?.role);
  const view = useMemo(() => readStudentLocation(searchParams, viewFinance), [searchParams, viewFinance]);
  const { searchDraft, setSearchDraft, submitSearch } = useSearchInput(view.search, search => updateView({ search }));
  const identity = `${user?.id}:${user?.role}`;
  const context = `${identity}:${searchParams.toString()}`;
  const latestContext = useRef(context); latestContext.current = context;
  const latestIdentity = useRef(identity); latestIdentity.current = identity;

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedContext, setLoadedContext] = useState('');
  const [revision, setRevision] = useState(0);

  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [optionsIdentity, setOptionsIdentity] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const listRequest = useRef(0), optionsRequest = useRef(0), exportRequest = useRef(0);
  const listAbort = useRef<AbortController | null>(null);
  const optionsAbort = useRef<AbortController | null>(null);
  const exportAbort = useRef<AbortController | null>(null);
  const createBusy = useRef(false);
  const exportBusy = useRef(false);
  const hasFilters = !!(view.search || view.status || view.classId || view.hasDebt !== undefined);
  const updateView = (patch: Partial<StudentListView>, resetPage = true) =>
    setSearchParams(writeStudentLocation({ ...view, ...patch, ...(resetPage ? { page: 1 } : {}) }));

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string>('');

  const [form] = Form.useForm();

  // ================= FETCH =================
  const fetchStudents = async () => {
    listAbort.current?.abort();
    const controller = new AbortController(); listAbort.current = controller;
    const request = ++listRequest.current;
    let changingPage = false;
    try {
      setLoading(true);
      setLoadError('');
      const res = await studentService.getAll(studentQueryParams(view, viewFinance), controller.signal);
      if (request !== listRequest.current || context !== latestContext.current) return;
      const count = res.pagination?.total || 0;
      const lastPage = Math.max(1, Math.ceil(count / view.pageSize));
      if (view.page > lastPage) {
        changingPage = true;
        setSearchParams(writeStudentLocation({ ...view, page: lastPage }), { replace: true });
        return;
      }
      setStudents(res.data || []);
      setTotal(count);
      setLoadedContext(context);
    } catch (err: any) {
      if (controller.signal.aborted || request !== listRequest.current || context !== latestContext.current) return;
      setStudents([]); setTotal(0); setLoadedContext(context); setLoadError(err.message || 'Không tải được danh sách học viên');
    } finally {
      if (request === listRequest.current && context === latestContext.current && !changingPage) setLoading(false);
    }
  };

  const fetchOptions = async () => {
    optionsAbort.current?.abort();
    const controller = new AbortController(); optionsAbort.current = controller;
    const request = ++optionsRequest.current;
    setOptionsLoading(true); setOptionsError('');
    try {
      const res = await studentService.getFilterOptions(controller.signal);
      if (request === optionsRequest.current && identity === latestIdentity.current) { setClasses(res.data.classes); setOptionsIdentity(identity); }
    } catch (err: any) {
      if (!controller.signal.aborted && request === optionsRequest.current && identity === latestIdentity.current)
        setOptionsError(err.message || 'Không tải được bộ lọc lớp học');
    } finally {
      if (request === optionsRequest.current && identity === latestIdentity.current) setOptionsLoading(false);
    }
  };

  useEffect(() => {
    exportAbort.current?.abort(); exportRequest.current++; exportBusy.current = false; setExporting(false);
    if (!viewFinance && searchParams.has('has_debt')) {
      setSearchParams(writeStudentLocation(view), { replace: true });
      return;
    }
    fetchStudents();
    return () => {
      listRequest.current++; listAbort.current?.abort();
      exportRequest.current++; exportAbort.current?.abort();
    };
  }, [searchParams, identity, viewFinance, revision]);
  useEffect(() => {
    setClasses([]); setStudents([]); setCreateModalOpen(false); setPasswordModalOpen(false); setTempPassword(''); setCreating(false);
    fetchOptions();
    return () => { optionsRequest.current++; optionsAbort.current?.abort(); };
  }, [identity]);

  const handleExport = async () => {
    if (!canExport || exportBusy.current) return;
    exportBusy.current = true;
    const request = ++exportRequest.current;
    const controller = new AbortController(); exportAbort.current = controller;
    setExporting(true);
    try {
      const blob = await studentService.exportCsv(studentExportParams(view, viewFinance), controller.signal);
      if (controller.signal.aborted || request !== exportRequest.current || context !== latestContext.current) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'hoc-vien.csv';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message.success('Đã xuất toàn bộ học viên phù hợp bộ lọc trong phạm vi được xem.');
    } catch (err: any) {
      if (!controller.signal.aborted && request === exportRequest.current && context === latestContext.current)
        message.error(err.message || 'Không xuất được danh sách học viên');
    } finally {
      if (request === exportRequest.current && context === latestContext.current) { exportBusy.current = false; setExporting(false); }
    }
  };

  // ================= CREATE =================
  const handleCreateStudent = async () => {
    if (!manageProfile || createBusy.current) return;
    createBusy.current = true; setCreating(true);
    try {
      const values = await form.validateFields();

      const payload = {
        ...values,
        dob: values.dob
          ? values.dob.format('YYYY-MM-DD')
          : undefined,
        lead_id: values.lead_id
          ? Number(values.lead_id)
          : undefined,
      };

      const res = await studentService.create(payload);
      if (identity !== latestIdentity.current) return;

      setCreateModalOpen(false);
      form.resetFields();

      setTempPassword(res.temp_password || '');
      setPasswordModalOpen(true);

      message.success(hasFilters ? 'Tạo học viên thành công. Danh sách vẫn áp dụng bộ lọc đã chọn.' : 'Tạo học viên thành công');
      if (context === latestContext.current && view.page !== 1) updateView({ page: 1 }, false);
      else setRevision(value => value + 1);
    } catch (err: any) {
      if (!err.errorFields && identity === latestIdentity.current) message.error(err.message || 'Tạo học viên thất bại');
    } finally {
      createBusy.current = false;
      if (identity === latestIdentity.current) setCreating(false);
    }
  };

  // ================= COPY PASSWORD =================
  const copyPassword = async () => {
    if (!tempPassword) return;

    try {
      await navigator.clipboard.writeText(tempPassword);
      message.success('Đã sao chép mật khẩu');
    } catch { message.error('Không sao chép được. Vui lòng chọn mật khẩu và sao chép thủ công.'); }
  };

  // ================= TABLE =================
  const columns: ColumnsType<Student> = [
    {
      title: 'Tên học viên',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (_, record) => (
        <a
          onClick={() => openDetail(`/lms/students/${record.id}`)}
          className="font-medium"
        >
          {record.full_name}
        </a>
      ),
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_LABELS[status] || 'Chưa xác định'}
        </Tag>
      ),
    },
    {
      title: 'Lớp học',
      key: 'classes',
      width: 220,
      render: (_, record) => {
        const enrollments = record.classEnrollments || [];
        return enrollments.length ? <Space wrap size={[4, 4]}>
          {enrollments.slice(0, 2).map((item: any) => <Button key={item.class_id} type="link" size="small" className="p-0"
            onClick={() => openDetail(`/lms/classes/${item.class_id}`)}>{studentClassLabel(item)}</Button>)}
          {enrollments.length > 2 && <Tooltip title={enrollments.slice(2).map(studentClassLabel).join('; ')}><Tag>+{enrollments.length - 2}</Tag></Tooltip>}
        </Space> : 'Không có lớp trong phạm vi xem';
      },
    },
    {
      title: 'Công nợ',
      key: 'debt',
      render: (_, record) => <Button type="link" className="p-0" onClick={() => openDetail(`/lms/students/${record.id}?tab=finance`)}>
        <BillingStatusTag status={record.financial_summary?.status} remaining={record.financial_summary?.remaining_amount} />
      </Button>,
    },
    {
      title: 'Cảnh báo bỏ học',
      key: 'dropout_risk',
      width: 150,
      render: (_, record) => <Button type="link" style={{ padding: 0 }}
        onClick={() => openDetail(`/lms/students/${record.id}?tab=classes${view.classId ? `&risk_class=${view.classId}` : ''}`)}>Xem theo lớp</Button>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => openDetail(`/lms/students/${record.id}`)}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ].filter(column => column.key !== 'debt' || viewFinance);

  const scopedClasses = optionsIdentity === identity ? classes : [];
  const classOptions = scopedClasses.map(item => ({ value: item.id, label: item.name }));
  if (view.classId && !scopedClasses.some(item => item.id === view.classId)) classOptions.push({ value: view.classId, label: 'Lớp học đang chọn' });
  const visibleStudents = loadedContext.startsWith(`${identity}:`) ? students : [];
  const visibleTotal = loadedContext.startsWith(`${identity}:`) ? total : 0;
  const listLoading = loading || loadedContext !== context;

  return (
    <div className="crm-page">
      <PageHeader
        title={user?.role === 'sale' ? 'Học viên phụ trách' : user?.role === 'teacher' ? 'Học viên trong lớp phụ trách' : 'Quản lý Học viên'}
        actions={<Space wrap>
          <Button icon={<ReloadOutlined />} loading={listLoading} onClick={() => { clearListCache(); fetchStudents(); fetchOptions(); }}>Tải lại</Button>
          {canExport && <Button icon={<ExportOutlined />} loading={exporting} disabled={listLoading || !!loadError || visibleTotal === 0}
            title="Xuất toàn bộ học viên phù hợp bộ lọc trong phạm vi được xem" onClick={handleExport}>Xuất CSV</Button>}
          {manageProfile && <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { form.resetFields(); setCreateModalOpen(true); }}
            >
              Thêm học viên
            </Button>}
        </Space>}
      />

      <div className="crm-surface">
        {/* FILTER */}
        <Space wrap size={[12, 12]} className="crm-filter-controls mb-4">
          <Input.Search aria-label="Tìm học viên" placeholder="Tên, email, số điện thoại" allowClear maxLength={200}
            className="crm-filter-search" value={searchDraft} onChange={event => setSearchDraft(event.target.value)}
            onSearch={submitSearch} />
          <Select aria-label="Lọc học viên theo lớp" placeholder="Lớp học" allowClear showSearch optionFilterProp="label"
            className="crm-filter-select" value={view.classId} options={classOptions} loading={optionsLoading}
            onChange={classId => updateView({ classId })} />

          <Select
            placeholder="Trạng thái"
            aria-label="Lọc trạng thái học viên"
            allowClear
            className="crm-filter-status"
            value={view.status}
            onChange={status => updateView({ status })}
            options={STUDENT_STATUSES.map(({ value, label }) => ({ value, label }))}
          />

          {viewFinance && <Select
            placeholder="Công nợ"
            aria-label="Lọc công nợ học viên"
            allowClear
            className="crm-filter-status"
            value={view.hasDebt}
            onChange={hasDebt => updateView({ hasDebt })}
            options={[
              { label: 'Còn công nợ', value: true },
              { label: 'Không còn công nợ', value: false },
            ]}
          />}
          {hasFilters && <Button type="link" onClick={() => {
            setSearchDraft(''); setSearchParams(writeStudentLocation({ ...readStudentLocation(new URLSearchParams(), viewFinance), pageSize: view.pageSize }));
          }}>Xóa bộ lọc</Button>}
        </Space>

        <div className="mb-4 text-sm text-gray-500">
          {user?.role === 'teacher' ? 'Chỉ hiển thị học viên đang ghi danh trong các lớp bạn phụ trách.'
            : user?.role === 'sale' ? 'Chỉ hiển thị học viên gắn với Lead hiện được phân công cho bạn.' : 'Hiển thị học viên trong trung tâm.'}
        </div>
        {optionsError && <Alert className="mb-4" type="warning" showIcon message={optionsError}
          action={<Button onClick={fetchOptions}>Thử lại bộ lọc</Button>} />}
        {loadError && <Alert className="mb-4" type="error" showIcon message={loadError}
          action={<Button onClick={fetchStudents}>Thử lại</Button>} />}

        {/* TABLE */}
        <Table
          columns={columns}
          dataSource={visibleStudents}
          rowKey="id"
          loading={listLoading}
          scroll={{ x: viewFinance ? 1200 : 1050 }}
          locale={{ emptyText: loadError ? 'Không tải được dữ liệu học viên' : hasFilters ? 'Không có học viên phù hợp bộ lọc' : 'Chưa có học viên trong phạm vi được xem' }}
          pagination={paginationProps('học viên', {
            current: view.page,
            pageSize: view.pageSize,
            total: visibleTotal,
            pageSizeOptions: studentPageSizes,
            onChange: (page, pageSize) => updateView({ page: pageSize === view.pageSize ? page : 1, pageSize }, false),
          })}
        />
      </div>

      {/* CREATE STUDENT */}
      <Modal
        title="Tạo học viên mới"
        open={manageProfile && createModalOpen}
        onCancel={() => { if (!createBusy.current) setCreateModalOpen(false); }}
        onOk={handleCreateStudent}
        confirmLoading={creating}
        okText="Tạo"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="full_name"
            label="Họ tên"
            rules={[{ required: true, message: 'Nhập họ tên' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
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
            name="dob"
            label="Ngày sinh"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="lead_id"
            label="Lead ID (nếu chuyển từ Lead)"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* TEMP PASSWORD */}
      <Modal
        title="Tạo tài khoản thành công"
        open={manageProfile && passwordModalOpen}
        footer={[
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={copyPassword}
          >
            Sao chép mật khẩu
          </Button>,
          <Button
            key="close"
            onClick={() => setPasswordModalOpen(false)}
          >
            Đóng
          </Button>,
        ]}
        onCancel={() => setPasswordModalOpen(false)}
      >
        <Typography.Text>
          Vui lòng lưu mật khẩu tạm thời để bàn giao tài khoản cho học viên.
        </Typography.Text>

        <div className="mt-4 p-4 bg-gray-100 rounded text-center">
          <Typography.Title level={3}>
            {tempPassword}
          </Typography.Title>
        </div>
      </Modal>
    </div>
  );
}
