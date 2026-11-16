import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Dropdown,
  Drawer,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import {
  DownloadOutlined,
  EllipsisOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '@/shared/contexts/AuthContext';
import { leadService, type LeadSourceOption } from '@/services/api/lead.service';
import { courseService } from '@/services/api/course.service';
import { userService } from '@/services/api/user.service';
import { LeadPipelineBoard } from './components/LeadPipelineBoard';
import { LeadFunnelAnalytics } from './components/LeadFunnelAnalytics';
import { MarkLostModal } from './components/MarkLostModal';
import { LeadEnrollmentModal } from './components/LeadEnrollmentModal';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { getLeadScore } from './leadScore';
import { LeadCareSummary } from './components/LeadCareSummary';
import { getLeadSourceLabel } from './leadSources';
import { getLeadGuidance } from './leadGuidance';
import { LeadOverviewStats } from './components/LeadOverviewStats';
import { getLeadAssigneeOptions, hasLeadAssignee, canUnassignLead, leadContactBlockReason, leadConvertBlockReason } from './leadAssignment';
import { readLeadLocation, writeLeadLocation, type LeadViewMode } from './leadFilters';
import { LEAD_STATUSES, getLeadStatus, LEAD_ACTIONS, LEAD_MESSAGES } from './leadStatus';

const { RangePicker } = DatePicker;
const pageSizeOptions = [10, 25, 50, 100];

const occupationOptions = [
  { label: 'Sinh viên năm 1-2', value: 'student_y1_y2' },
  { label: 'Sinh viên năm 3-4', value: 'student_y3_y4' },
  { label: 'Người đi làm', value: 'working_professional' },
];

const studyPurposeOptions = [
  { label: 'Du học', value: 'study_abroad' },
  { label: 'Thi chứng chỉ', value: 'pass_exam' },
  { label: 'Thăng tiến công việc', value: 'career_advancement' },
];

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });
}

export function LeadsListPage() {
  const navigate = useNavigate();
  const { openDetail } = useDetailNavigation();
  const [convertLead, setConvertLead] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, viewMode } = useMemo(() => readLeadLocation(searchParams), [searchParams]);
  const filterKey = writeLeadLocation(filters, 'pipeline').toString();
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [form] = Form.useForm();
  const [leads, setLeads] = useState<any[]>([]);
  const [sourceOptions, setSourceOptions] = useState<LeadSourceOption[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [assignLead, setAssignLead] = useState<any>(null);
  const [assignSaleId, setAssignSaleId] = useState(0);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const listRequest = useRef(0);
  const refreshTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.search || '');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [lostTargetLead, setLostTargetLead] = useState<any | null>(null);
  const latestView = useRef({ filters, pagination });
  latestView.current = { filters, pagination };

  const fetchLeads = async (page = pagination.current, pageSize = pagination.pageSize, nextFilters = filters): Promise<void> => {
    const requestId = ++listRequest.current;
    try {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
        status: nextFilters.status,
        source: nextFilters.source,
        course_id: nextFilters.course_id,
        assigned_to: nextFilters.assigned_to,
        needs_care: nextFilters.needs_care || undefined,
        search: nextFilters.search,
        date_from: nextFilters.dateRange?.[0]?.startOf('day').toISOString(),
        date_to: nextFilters.dateRange?.[1]?.endOf('day').toISOString(),
        sort_by: 'createdAt',
        sort_dir: 'desc',
      };
      const [res, report] = await Promise.all([leadService.getAll(params), leadService.getFunnel(params)]);
      if (requestId !== listRequest.current) return;
      const lastPage = Math.max(1, Math.ceil((res.pagination?.total || 0) / pageSize));
      if (page > lastPage) return fetchLeads(lastPage, pageSize, nextFilters);
      setLeads(res.data || []);
      setOverview(report.data);
      setLoadError('');
      setPagination({
        current: res.pagination?.page || page,
        pageSize: res.pagination?.limit || pageSize,
        total: res.pagination?.total || 0,
      });
    } catch (err: any) {
      if (requestId === listRequest.current) setLoadError(err.message || 'Không tải được danh sách lead');
    } finally {
      if (requestId === listRequest.current) setLoading(false);
    }
  };

  const refreshList = (resetPage = false) => {
    const current = latestView.current;
    return fetchLeads(resetPage ? 1 : current.pagination.current, current.pagination.pageSize, current.filters);
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

  const handleViewModeChange = (mode: LeadViewMode) => {
    setSearchParams(writeLeadLocation(filters, mode), { replace: true });
  };

  useEffect(() => {
    fetchSources();
    fetchCourses();
    fetchSales();
    return () => {
      listRequest.current++;
      refreshTimers.current.forEach(clearTimeout);
      refreshTimers.current = [];
    };
  }, [user?.role]);

  // Tab changes retain pagination; only actual filters or the current user reload page 1.
  useEffect(() => {
    setSearchDraft(filters.search || '');
    fetchLeads(1, pagination.pageSize, filters);
  }, [filterKey, user?.id, user?.role]);

  const courseOptions = courses.map((course) => ({
    label: course.name,
    value: course.id,
  }));

  const handleFilterChange = (patch: any) => {
    const next = { ...filters, ...patch };
    setSearchParams(writeLeadLocation(next, viewMode), { replace: true });
  };

  const handleCreateLead = async (values: any) => {
    if (creating) return;
    try {
      setCreating(true);
      const created = await leadService.create(values);
      message.success(LEAD_MESSAGES.created);
      setDrawerVisible(false);
      form.resetFields();
      refreshList(true);

      if (created?.data?.id) {
        refreshTimers.current.push(setTimeout(() => refreshList(), 2500));
      }
    } catch (err: any) {
      if (err.status === 409 && err.duplicateFields?.length) {
        form.setFields(err.duplicateFields.map((name: string) => ({
          name, errors: [name === 'phone' ? 'Số điện thoại đã tồn tại trong danh sách lead' : 'Email đã tồn tại trong danh sách lead'],
        })));
        message.warning(err.message);
      } else message.error(err.message || LEAD_MESSAGES.createFailed);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xóa lead?',
      content: 'Lead và lịch sử tương tác liên quan sẽ bị xóa.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await leadService.remove(id);
          message.success(LEAD_MESSAGES.deleted);
          refreshList();
        } catch (err: any) {
          message.error(err.message || LEAD_MESSAGES.deleteFailed);
          throw err;
        }
      },
    });
  };

  const handleConvert = (lead: any) => {
    const reason = leadConvertBlockReason(lead);
    if (reason) { message.warning(reason); return; }
    setConvertLead(lead);
  };

  const openAssignModal = (lead: any) => {
    setAssignLead(lead);
    setAssignSaleId(lead.assigned_to ?? 0);
  };

  const handleAssignLead = async () => {
    if (!assignLead || assigning) return;
    if (assignSaleId === (assignLead.assigned_to ?? 0)) {
      setAssignLead(null);
      return;
    }

    try {
      setAssigning(true);
      await leadService.update(String(assignLead.id), { assigned_to: assignSaleId === 0 ? null : assignSaleId });
      message.success(assignSaleId === 0 ? LEAD_MESSAGES.unassigned : LEAD_MESSAGES.assigned);
      setAssignLead(null);
      setAssignSaleId(0);
      refreshList();
    } catch (err: any) {
      message.error(err.message || LEAD_MESSAGES.assignFailed);
    } finally {
      setAssigning(false);
    }
  };

  const handleCsvFile: UploadProps['beforeUpload'] = async (file) => {
    try {
      setImporting(true);
      setImportErrors([]);
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        message.warning('File CSV không có dữ liệu hợp lệ');
        return Upload.LIST_IGNORE;
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];
      for (const [index, row] of rows.entries()) {
        try {
          await leadService.create({
            full_name: row.full_name || row.name || row['họ tên'] || row['ho ten'],
            phone: row.phone || row.sdt || row['số điện thoại'] || row['so dien thoai'],
            email: row.email,
            source: row.source || row.lead_source || 'other',
            occupation: row.occupation,
            study_purpose: row.study_purpose,
            course_id: row.course_id ? Number(row.course_id) : undefined,
          });
          success += 1;
        } catch (err: any) {
          failed += 1;
          errors.push(`Dòng dữ liệu ${index + 1}: ${err.message || 'Không tạo được lead'}`);
        }
      }

      setImportErrors(errors);
      if (failed) message.warning(`Import xong: ${success} lead thành công, ${failed} dòng bị chặn hoặc lỗi`);
      else {
        message.success(`Import xong: ${success} lead thành công`);
        setImportVisible(false);
      }
      refreshList(true);
      refreshTimers.current.push(setTimeout(() => refreshList(), 3000));
    } catch (err: any) {
      message.error(err.message || 'Không đọc được file CSV');
    } finally {
      setImporting(false);
    }

    return Upload.LIST_IGNORE;
  };

  const downloadTemplate = () => {
    const template = [
      'full_name,phone,email,source,occupation,study_purpose,course_id',
      'Nguyen Van A,0901234567,a@example.com,google_ads,student_y3_y4,study_abroad,1',
    ].join('\n');
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lead-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns: ColumnsType<any> = useMemo(() => [
    {
      title: 'Tên lead',
      dataIndex: 'full_name',
      render: (name: string, record: any) => (
        <Button type="link" className="p-0 font-medium" onClick={() => navigate(`/crm/leads/${record.id}`)}>
          {name}
        </Button>
      ),
    },
    { title: 'Điện thoại', dataIndex: 'phone' },
    {
      title: 'Nguồn',
      dataIndex: 'lead_source',
      render: (value) => getLeadSourceLabel(value, sourceOptions),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: string) => <Tag color={getLeadStatus(status)?.color || 'default'}>{getLeadStatus(status)?.label || status}</Tag>,
    },
    {
      title: 'Điểm tham khảo',
      sorter: (a, b) => (getLeadScore(a) ?? -1) - (getLeadScore(b) ?? -1),
      render: (_, record) => {
        return <LeadCareSummary lead={record} compact />;
      },
    },
    { title: 'Việc tiếp theo', width: 220, render: (_, record) => <span className="text-sm text-gray-600">{
      !hasLeadAssignee(record) && !['enrolled', 'lost'].includes(record.status) ? 'Phân công Sale phụ trách' : getLeadGuidance(record).title}</span> },
    { title: 'Phụ trách', render: (_, record) => record.assignedUser?.full_name || 'Chưa phân công' },
    {
      title: 'Liên hệ gần nhất',
      render: (_, record) => record.last_contacted ? dayjs(record.last_contacted).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Hành động',
      width: 130,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" onClick={() => navigate(`/crm/leads/${record.id}`)}>Chi tiết</Button>
          <Dropdown menu={{ items: [
            ...(!['enrolled', 'lost'].includes(record.status) ? [{ key: 'contact', label: <Tooltip title={leadContactBlockReason(record)}><span>{LEAD_ACTIONS.contact}</span></Tooltip>,
              disabled: !!leadContactBlockReason(record), onClick: () => navigate(`/crm/leads/${record.id}?contact=1`) }] : []),
            ...(record.student?.id ? [{ key: 'student', label: 'Xem hồ sơ học viên', onClick: () => openDetail(`/lms/students/${record.student.id}?tab=classes`) }] : []),
            ...(user?.role === 'admin' ? [{ key: 'assign', label: LEAD_ACTIONS.assign, onClick: () => openAssignModal(record) }] : []),
            { key: 'convert', label: <Tooltip title={leadConvertBlockReason(record)}><span>{LEAD_ACTIONS.convert}</span></Tooltip>,
              disabled: !!leadConvertBlockReason(record), onClick: () => handleConvert(record) },
            ...(!['enrolled', 'lost'].includes(record.status) ? [{ key: 'lost', label: LEAD_ACTIONS.lost, onClick: () => setLostTargetLead(record) }] : []),
            ...(user?.role === 'admin' ? [{ key: 'delete', label: 'Xóa lead', danger: true, onClick: () => handleDelete(record.id) }] : []),
          ] }} trigger={['click']}><Button aria-label={`Thao tác với ${record.full_name}`} type="text" icon={<EllipsisOutlined />} /></Dropdown>
        </Space>
      ),
    },
  ], [navigate, user?.role, pagination.current, sourceOptions]);

  const tableData = leads;
  const listFilters = <div className="mb-4 flex flex-wrap items-center gap-3">
    <Input.Search aria-label="Tìm lead" placeholder="Tên, số điện thoại, email" allowClear style={{ width: 230 }} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} onSearch={search => handleFilterChange({ search: search.trim() || undefined })} />
    <Select aria-label="Lọc giai đoạn" placeholder="Tất cả giai đoạn" allowClear style={{ width: 160 }} value={filters.status} options={LEAD_STATUSES.map(({ value, label }) => ({ value, label }))} onChange={status => handleFilterChange({ status })} />
    <Select aria-label="Lọc nguồn lead" placeholder="Tất cả nguồn" allowClear style={{ width: 160 }} value={filters.source} options={sourceOptions} onChange={source => handleFilterChange({ source })} />
    <Select aria-label="Lọc khóa học" placeholder="Tất cả khóa học" allowClear style={{ width: 175 }} value={filters.course_id} options={courseOptions} onChange={course_id => handleFilterChange({ course_id })} />
    {user?.role === 'admin' && <Select aria-label="Lọc sale phụ trách" placeholder="Tất cả sale" allowClear style={{ width: 165 }} value={filters.assigned_to} options={[{ label: 'Chưa phân công', value: 'unassigned' }, ...sales.map(sale => ({ label: sale.full_name, value: sale.id }))]} onChange={assigned_to => handleFilterChange({ assigned_to })} />}
    <Space size={6}><Switch size="small" aria-label="Chỉ lead cần chăm sóc" checked={Boolean(filters.needs_care)} onChange={needs_care => handleFilterChange({ needs_care })} /><Tooltip title="Lead chưa liên hệ hoặc đã quá 3 ngày chưa liên hệ lại; chỉ tính lead đang chăm sóc."><span className="text-xs text-gray-600">Cần chăm sóc (&gt;3 ngày)</span></Tooltip></Space>
    <RangePicker aria-label="Lọc ngày tạo" placeholder={['Tạo từ ngày', 'Đến ngày']} value={filters.dateRange} onChange={dateRange => handleFilterChange({ dateRange })} />
    {Object.values(filters).some(Boolean) && <Button type="link" size="small" onClick={() => { setSearchDraft(''); setSearchParams(writeLeadLocation({}, viewMode), { replace: true }); }}>Xóa bộ lọc</Button>}
  </div>;

  return (
    <div>
      <PageHeader
        title={user?.role === 'sale' ? 'Khách hàng của tôi' : 'Quản lý lead'}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'CRM' },
          { title: user?.role === 'sale' ? 'Khách hàng của tôi' : 'Quản lý lead' },
        ]}
        actions={
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => refreshList()}>Tải lại</Button>
            <Button icon={<InboxOutlined />} onClick={() => setImportVisible(true)}>Import CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerVisible(true)}>Thêm lead</Button>
          </Space>
        }
      />

      <div className="mb-4 space-y-2">
        {loadError && <Alert type="error" showIcon message={loadError} description="Chưa tải được dữ liệu mới. Dữ liệu đang hiển thị thuộc lần tải thành công trước đó."
          action={<Button size="small" onClick={() => refreshList()}>Thử lại</Button>} />}
        <LeadOverviewStats data={overview} loading={loading} manager={user?.role === 'admin'} />
        <div className="text-xs text-gray-500">Tổng quan theo bộ lọc hiện tại · {overview?.summary?.totalLeads ?? '—'} lead</div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        {listFilters}
        <Tabs
          activeKey={viewMode}
          onChange={(val) => handleViewModeChange(val as any)}
          items={[
            {
              key: 'pipeline',
              label: 'Phễu bán hàng',
              children: (<div>
                <LeadPipelineBoard
                  leads={leads}
                  sourceOptions={sourceOptions}
                  loading={loading}
                  onRefresh={() => refreshList()}
                  onConvert={handleConvert}
                  includeLost={filters.status === 'lost'}
                />
                <Pagination className="mt-4" current={pagination.current} pageSize={pagination.pageSize} total={pagination.total} showSizeChanger pageSizeOptions={pageSizeOptions} showTotal={total => `${total} lead · thẻ hiển thị theo trang`} onChange={(page, size) => fetchLeads(page, size)} />
              </div>),
            },
            {
              key: 'table',
              label: 'Danh sách chi tiết',
              children: (
                <div>
                  <Table
                    columns={columns}
                    dataSource={tableData}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 1100 }}
                    pagination={{
                      current: pagination.current,
                      pageSize: pagination.pageSize,
                      total: pagination.total,
                      showSizeChanger: true,
                      pageSizeOptions,
                      showTotal: (total) => `Tổng ${total} lead`,
                      onChange: (page, pageSize) => fetchLeads(page, pageSize),
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'funnel',
              label: 'Báo cáo chuyển đổi',
              children: (
                <LeadFunnelAnalytics
                  sourceOptions={sourceOptions}
                  data={overview}
                  loading={loading}
                  userRole={user?.role}
                />
              ),
            },
          ]}
        />
      </div>

      <Drawer title="Tạo lead mới" width={540} onClose={() => setDrawerVisible(false)} open={drawerVisible}>
        <Form form={form} layout="vertical" onFinish={handleCreateLead}>
          <Form.Item name="full_name" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại' },
            { pattern: /^[0-9]{10}$/, transform: value => value?.trim(), message: 'Số điện thoại phải có đúng 10 chữ số' }]}>
            <Input placeholder="0901234567" inputMode="numeric" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, whitespace: true, message: 'Nhập email' },
            { type: 'email', transform: value => value?.trim(), message: 'Email không hợp lệ' }, { max: 255, message: 'Email tối đa 255 ký tự' }]}>
            <Input placeholder="email@gmail.com" />
          </Form.Item>
          <Form.Item name="source" label="Nguồn lead" rules={[{ required: true, message: 'Chọn nguồn lead' }]}>
            <Select options={sourceOptions.filter(source => !source.legacy)} placeholder="Chọn nguồn" />
          </Form.Item>
          <Form.Item name="occupation" label="Nghề nghiệp" rules={[{ required: true, message: 'Chọn nghề nghiệp' }]}>
            <Select options={occupationOptions} placeholder="Chọn nghề nghiệp" />
          </Form.Item>
          <Form.Item name="study_purpose" label="Mục tiêu học" rules={[{ required: true, message: 'Chọn mục tiêu học' }]}>
            <Select options={studyPurposeOptions} placeholder="Chọn mục tiêu" />
          </Form.Item>
          <Form.Item name="course_id" label="Khóa quan tâm" rules={[{ required: true, message: 'Chọn khóa quan tâm' }]}>
            <Select options={courseOptions} placeholder="Chọn khóa học" showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={creating}>Tạo lead</Button>
              <Button onClick={() => setDrawerVisible(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title="Phân công lead"
        open={!!assignLead}
        onCancel={() => {
          setAssignLead(null);
          setAssignSaleId(0);
        }}
        onOk={handleAssignLead}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={assigning}
      >
        <Space direction="vertical" className="w-full" size={12}>
          <div>
            <div className="text-gray-500">Lead</div>
            <div className="font-medium">{assignLead?.full_name}</div>
          </div>
          <Select
            className="w-full"
            placeholder="Chọn sale phụ trách"
            value={assignSaleId}
            onChange={setAssignSaleId}
            showSearch
            optionFilterProp="label"
            options={getLeadAssigneeOptions(sales, assignLead)}
          />
          {!canUnassignLead(assignLead) && <div className="text-xs text-gray-500">Lead đang được chăm sóc. Hãy chọn Sale khác để chuyển người phụ trách.</div>}
        </Space>
      </Modal>

      <Drawer title="Import leads từ CSV" width={560} onClose={() => setImportVisible(false)} open={importVisible}>
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="CSV cần các cột: full_name, phone, email, source, occupation, study_purpose, course_id."
          description={`Nguồn lead dùng đúng mã lưu trong DB: ${sourceOptions.filter(source => !source.legacy).map(source => source.value).join(', ')}. Ví dụ occupation=working_professional, study_purpose=career_advancement.`}
        />
        <Space className="mb-4">
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>Tải file mẫu</Button>
        </Space>
        <Upload.Dragger accept=".csv,text/csv" beforeUpload={handleCsvFile} showUploadList={false} disabled={importing}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Kéo thả hoặc bấm để chọn file CSV</p>
          <p className="ant-upload-hint">Email bắt buộc và phân biệt hoa/thường. Số điện thoại phải có đúng 10 chữ số. Dòng trùng điện thoại hoặc email sẽ bị chặn.</p>
        </Upload.Dragger>
        {importErrors.length > 0 && <Alert type="warning" showIcon className="mt-4"
          message={`${importErrors.length} dòng bị chặn hoặc lỗi`}
          description={<div className="max-h-60 overflow-y-auto space-y-1">{importErrors.map((error, index) => <div key={index}>{error}</div>)}</div>} />}
      </Drawer>

      <LeadEnrollmentModal open={!!convertLead} lead={convertLead} onCancel={() => setConvertLead(null)}
        onSuccess={studentId => { setConvertLead(null); openDetail(`/lms/students/${studentId}?tab=classes`); }} />
      <MarkLostModal
        open={!!lostTargetLead}
        lead={lostTargetLead}
        onCancel={() => setLostTargetLead(null)}
        onSuccess={() => {
          setLostTargetLead(null);
          refreshList();
        }}
      />
    </div>
  );
}
