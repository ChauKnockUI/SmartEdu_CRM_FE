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
import { useNavigate } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '@/shared/contexts/AuthContext';
import { leadService, type LeadSourceOption } from '@/services/api/lead.service';
import { courseService } from '@/services/api/course.service';
import { userService } from '@/services/api/user.service';
import { LeadPipelineBoard } from './components/LeadPipelineBoard';
import { LeadFunnelAnalytics } from './components/LeadFunnelAnalytics';
import { MarkLostModal } from './components/MarkLostModal';
import { getLeadScore } from './leadScore';
import { LeadCareSummary } from './components/LeadCareSummary';
import { getLeadSourceLabel } from './leadSources';
import { getLeadGuidance } from './leadGuidance';
import { LeadOverviewStats } from './components/LeadOverviewStats';

const { RangePicker } = DatePicker;

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
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [form] = Form.useForm();
  const [leads, setLeads] = useState<any[]>([]);
  const [sourceOptions, setSourceOptions] = useState<LeadSourceOption[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [assignLead, setAssignLead] = useState<any>(null);
  const [assignSaleId, setAssignSaleId] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const listRequest = useRef(0);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [searchDraft, setSearchDraft] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [viewMode, setViewMode] = useState<'pipeline' | 'table' | 'funnel'>('pipeline');
  const [lostTargetLead, setLostTargetLead] = useState<any | null>(null);
  const latestView = useRef({ filters, pagination });
  latestView.current = { filters, pagination };

  const fetchLeads = async (page = pagination.current, pageSize = pagination.pageSize, nextFilters = filters) => {
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

  const handleViewModeChange = (mode: 'pipeline' | 'table' | 'funnel') => {
    setViewMode(mode);
    if (mode === 'pipeline') {
      fetchLeads(1, 50);
    } else if (mode === 'table') {
      fetchLeads(1, 10);
    }
  };

  useEffect(() => {
    fetchLeads(1, 50);
    fetchSources();
    fetchCourses();
    fetchSales();
  }, [user?.role]);

  const courseOptions = courses.map((course) => ({
    label: course.name,
    value: course.id,
  }));

  const handleFilterChange = (patch: any) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    fetchLeads(1, pagination.pageSize, next);
  };

  const handleCreateLead = async (values: any) => {
    try {
      const created = await leadService.create(values);
      message.success('Đã tạo lead. Hệ thống đang chấm điểm AI.');
      setDrawerVisible(false);
      form.resetFields();
      fetchLeads(1);

      if (created?.data?.id) {
        setTimeout(() => refreshList(true), 2500);
      }
    } catch (err: any) {
      message.error(err.message || 'Tạo lead thất bại');
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
        await leadService.remove(id);
        message.success('Đã xóa lead');
        fetchLeads(pagination.current);
      },
    });
  };

  const handleConvert = (lead: any) => {
    Modal.confirm({
      title: 'Chuyển lead thành học viên?',
      content: lead.email
        ? `${lead.full_name} sẽ được tạo tài khoản học viên.`
        : 'Lead chưa có email. Hãy bổ sung email trước khi convert để tạo tài khoản học viên.',
      okText: 'Chuyển',
      cancelText: 'Hủy',
      okButtonProps: { disabled: !lead.email },
      onOk: async () => {
        try {
          await leadService.convert(lead.id);
          message.success('Đã chuyển lead thành học viên');
          fetchLeads(pagination.current);
        } catch (err: any) {
          message.error(err.message || 'Chuyển đổi thất bại');
        }
      },
    });
  };

  const handleClaimLead = async (lead: any) => {
    if (!user?.id) return;
    try {
      await leadService.update(String(lead.id), { assigned_to: Number(user.id) });
      message.success('Đã phân công lead cho bạn phụ trách');
      fetchLeads(pagination.current);
    } catch (err: any) {
      message.error(err.message || 'Phân công lead thất bại');
    }
  };

  const openAssignModal = (lead: any) => {
    setAssignLead(lead);
    setAssignSaleId(lead.assignedUser?.id);
  };

  const handleAssignLead = async () => {
    if (!assignLead || !assignSaleId) {
      message.warning('Chọn sale phụ trách');
      return;
    }

    try {
      await leadService.update(String(assignLead.id), { assigned_to: assignSaleId });
      message.success('Đã phân công lead cho sale phụ trách');
      setAssignLead(null);
      setAssignSaleId(undefined);
      fetchLeads(pagination.current);
    } catch (err: any) {
      message.error(err.message || 'Phân công lead thất bại');
    }
  };

  const handleCsvFile: UploadProps['beforeUpload'] = async (file) => {
    try {
      setImporting(true);
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        message.warning('File CSV không có dữ liệu hợp lệ');
        return Upload.LIST_IGNORE;
      }

      let success = 0;
      let failed = 0;
      for (const row of rows) {
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
        } catch (err) {
          failed += 1;
        }
      }

      message.success(`Import xong: ${success} lead thành công${failed ? `, ${failed} dòng lỗi` : ''}`);
      setImportVisible(false);
      fetchLeads(1);
      setTimeout(() => refreshList(true), 3000);
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
      render: (status: string) => <Tag color={statusColors[status] || 'default'}>{statusLabels[status] || status}</Tag>,
    },
    {
      title: 'Điểm tham khảo',
      sorter: (a, b) => (getLeadScore(a) ?? -1) - (getLeadScore(b) ?? -1),
      render: (_, record) => {
        return <LeadCareSummary lead={record} compact />;
      },
    },
    { title: 'Việc tiếp theo', width: 220, render: (_, record) => <span className="text-sm text-gray-600">{getLeadGuidance(record).title}</span> },
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
            ...(!['enrolled', 'lost'].includes(record.status) ? [{ key: 'contact', label: 'Ghi nhận liên hệ', onClick: () => navigate(`/crm/leads/${record.id}?contact=1`) }] : []),
            ...(user?.role === 'admin' ? [{ key: 'assign', label: 'Phân công sale', onClick: () => openAssignModal(record) }] : []),
            ...(user?.role === 'sale' && !record.assignedUser ? [{ key: 'claim', label: 'Nhận phụ trách', onClick: () => handleClaimLead(record) }] : []),
            { key: 'convert', label: 'Chuyển thành học viên', disabled: ['enrolled', 'lost'].includes(record.status) || !record.email, onClick: () => handleConvert(record) },
            ...(!['enrolled', 'lost'].includes(record.status) ? [{ key: 'lost', label: 'Đánh dấu thất bại', onClick: () => setLostTargetLead(record) }] : []),
            ...(user?.role === 'admin' ? [{ key: 'delete', label: 'Xóa lead', danger: true, onClick: () => handleDelete(record.id) }] : []),
          ] }} trigger={['click']}><Button aria-label={`Thao tác với ${record.full_name}`} type="text" icon={<EllipsisOutlined />} /></Dropdown>
        </Space>
      ),
    },
  ], [navigate, user?.role, pagination.current, sourceOptions]);

  const tableData = leads;
  const listFilters = <div className="mb-4 flex flex-wrap items-center gap-3">
    <Input.Search aria-label="Tìm lead" placeholder="Tên, số điện thoại, email" allowClear style={{ width: 230 }} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} onSearch={search => handleFilterChange({ search })} />
    <Select aria-label="Lọc giai đoạn" placeholder="Tất cả giai đoạn" allowClear style={{ width: 160 }} value={filters.status} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} onChange={status => handleFilterChange({ status })} />
    <Select aria-label="Lọc nguồn lead" placeholder="Tất cả nguồn" allowClear style={{ width: 160 }} value={filters.source} options={sourceOptions} onChange={source => handleFilterChange({ source })} />
    <Select aria-label="Lọc khóa học" placeholder="Tất cả khóa học" allowClear style={{ width: 175 }} value={filters.course_id} options={courseOptions} onChange={course_id => handleFilterChange({ course_id })} />
    {user?.role === 'admin' && <Select aria-label="Lọc sale phụ trách" placeholder="Tất cả sale" allowClear style={{ width: 165 }} value={filters.assigned_to} options={sales.map(sale => ({ label: sale.full_name, value: sale.id }))} onChange={assigned_to => handleFilterChange({ assigned_to })} />}
    <Space size={6}><Switch size="small" aria-label="Chỉ lead cần chăm sóc" checked={Boolean(filters.needs_care)} onChange={needs_care => handleFilterChange({ needs_care })} /><Tooltip title="Lead chưa liên hệ hoặc đã quá 3 ngày chưa liên hệ lại; chỉ tính lead đang chăm sóc."><span className="text-xs text-gray-600">Cần chăm sóc (&gt;3 ngày)</span></Tooltip></Space>
    {viewMode === 'pipeline' && filters.dateRange && <Tag closable onClose={() => handleFilterChange({ dateRange: undefined })}>Đang lọc ngày tạo</Tag>}
    {Object.values(filters).some(Boolean) && <Button type="link" size="small" onClick={() => { setFilters({}); setSearchDraft(''); fetchLeads(1, pagination.pageSize, {}); }}>Xóa bộ lọc</Button>}
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
            {viewMode !== 'funnel' && <Button icon={<ReloadOutlined />} onClick={() => fetchLeads()}>Tải lại</Button>}
            <Button icon={<InboxOutlined />} onClick={() => setImportVisible(true)}>Import CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerVisible(true)}>Thêm lead</Button>
          </Space>
        }
      />

      {viewMode !== 'funnel' && <div className="mb-4 space-y-2">
        {loadError && <Alert type="error" showIcon message={loadError} description="Chưa tải được dữ liệu mới. Bạn có thể thử tải lại." />}
        <LeadOverviewStats data={overview} loading={loading} manager={user?.role === 'admin'} />
        <div className="text-xs text-gray-500">Tổng quan theo bộ lọc hiện tại · {overview?.summary?.totalLeads ?? '—'} lead</div>
      </div>}

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <Tabs
          activeKey={viewMode}
          onChange={(val) => handleViewModeChange(val as any)}
          items={[
            {
              key: 'pipeline',
              label: 'Phễu bán hàng',
              children: (<div>
                {listFilters}
                <LeadPipelineBoard
                  leads={leads}
                  sourceOptions={sourceOptions}
                  loading={loading}
                  onRefresh={() => fetchLeads()}
                  onConvert={handleConvert}
                />
                <Pagination className="mt-4" current={pagination.current} pageSize={pagination.pageSize} total={pagination.total} showSizeChanger pageSizeOptions={[25, 50, 100]} showTotal={total => `${total} lead · thẻ hiển thị theo trang`} onChange={(page, size) => fetchLeads(page, size)} />
              </div>),
            },
            {
              key: 'table',
              label: 'Danh sách chi tiết',
              children: (
                <div>
                  {listFilters}
                  <Space className="mb-4 w-full" size={12} wrap>
                    <RangePicker aria-label="Lọc ngày tạo" placeholder={['Tạo từ ngày', 'Đến ngày']} value={filters.dateRange} onChange={(dateRange) => handleFilterChange({ dateRange })} />
                  </Space>

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
                      pageSizeOptions: [5, 7, 10, 20, 50],
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
                  courses={courses}
                  sales={sales}
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
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
            <Input placeholder="090xxxxxxx" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
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
              <Button type="primary" htmlType="submit">Tạo lead</Button>
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
          setAssignSaleId(undefined);
        }}
        onOk={handleAssignLead}
        okText="Phân công"
        cancelText="Hủy"
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
            options={sales.map((sale) => ({
              label: `${sale.full_name} (${sale.email})`,
              value: sale.id,
            }))}
          />
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
          <p className="ant-upload-hint">Mỗi dòng hợp lệ sẽ tạo một lead và tự trigger AI scoring.</p>
        </Upload.Dragger>
      </Drawer>

      <MarkLostModal
        open={!!lostTargetLead}
        lead={lostTargetLead}
        onCancel={() => setLostTargetLead(null)}
        onSuccess={() => {
          setLostTargetLead(null);
          fetchLeads();
        }}
      />
    </div>
  );
}
