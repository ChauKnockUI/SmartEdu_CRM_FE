import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Drawer, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Upload, message } from 'antd';
import { DeleteOutlined, DownloadOutlined, InboxOutlined, PlusOutlined, ReloadOutlined, UserAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { useAuth } from '@/shared/contexts/AuthContext';
import { leadService } from '@/services/api/lead.service';
import { courseService } from '@/services/api/course.service';
import { userService } from '@/services/api/user.service';

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

const sourceOptions = [
  { label: 'Facebook Ads', value: 'facebook' },
  { label: 'Google Ads', value: 'google_ads' },
  { label: 'Website Organic', value: 'website_organic' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Giới thiệu', value: 'referral' },
  { label: 'Khác', value: 'other' },
];

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

function getLeadScore(lead: any) {
  const rawScore = Number(lead.aiScore?.probability_score || 0);
  return rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
}

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
  const [courses, setCourses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [assignLead, setAssignLead] = useState<any>(null);
  const [assignSaleId, setAssignSaleId] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchLeads = async (page = pagination.current, pageSize = pagination.pageSize, nextFilters = filters) => {
    try {
      setLoading(true);
      const res = await leadService.getAll({
        page,
        limit: pageSize,
        status: nextFilters.status,
        source: nextFilters.source,
        search: nextFilters.search,
        date_from: nextFilters.dateRange?.[0]?.toISOString(),
        date_to: nextFilters.dateRange?.[1]?.toISOString(),
        sort_by: user?.role === 'sale' ? 'probability_score' : 'createdAt',
        sort_dir: 'desc',
      });
      setLeads(res.data || []);
      setPagination({
        current: res.pagination?.page || page,
        pageSize: res.pagination?.limit || pageSize,
        total: res.pagination?.total || 0,
      });
    } catch (err: any) {
      message.error(err.message || 'Không tải được danh sách lead');
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
    fetchLeads(1);
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
        setTimeout(() => fetchLeads(1), 2500);
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
      setTimeout(() => fetchLeads(1), 3000);
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
    { title: 'Email', dataIndex: 'email', render: (value) => value || '-' },
    {
      title: 'Nguồn',
      dataIndex: 'lead_source',
      render: (value) => sourceOptions.find((item) => item.value === value)?.label || value || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: string) => <Tag color={statusColors[status] || 'default'}>{statusLabels[status] || status}</Tag>,
    },
    {
      title: 'AI score',
      sorter: (a, b) => getLeadScore(a) - getLeadScore(b),
      render: (_, record) => {
        const score = getLeadScore(record);
        const recommendation = record.aiScore?.recommendation;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'}>{score}%</Tag>
            {recommendation && (
              <Tag color={recommendationColors[recommendation] || 'default'}>
                {recommendationLabels[recommendation] || recommendation}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Chấm lúc',
      render: (_, record) => record.aiScore?.scored_at ? dayjs(record.aiScore.scored_at).format('DD/MM HH:mm') : 'Đang chờ',
    },
    { title: 'Phụ trách', render: (_, record) => record.assignedUser?.full_name || 'Chưa phân công' },
    {
      title: 'Liên hệ gần nhất',
      render: (_, record) => record.last_contacted ? dayjs(record.last_contacted).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Hành động',
      width: 190,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" onClick={() => navigate(`/crm/leads/${record.id}`)}>Chi tiết</Button>
          {user?.role === 'admin' && (
            <Button type="link" onClick={() => openAssignModal(record)}>Phân công</Button>
          )}
          {user?.role === 'sale' && !record.assignedUser && (
            <Button type="link" onClick={() => handleClaimLead(record)}>Phân công cho tôi</Button>
          )}
          <Tooltip title={!record.email ? 'Cần email để tạo tài khoản học viên' : ''}>
            <Button
              type="link"
              icon={<UserAddOutlined />}
              disabled={record.status === 'enrolled' || !record.email}
              onClick={() => handleConvert(record)}
            >
              Convert
            </Button>
          </Tooltip>
          {user?.role === 'admin' && (
            <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
          )}
        </Space>
      ),
    },
  ], [navigate, user?.role, pagination.current]);

  const tableData = filters.status === 'enrolled'
    ? leads.filter((lead) => lead.status === 'enrolled')
    : filters.status
      ? leads
      : leads.filter((lead) => lead.status !== 'enrolled');

  return (
    <div>
      <PageHeader
        title="Quản lý lead"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'CRM' },
          { title: 'Leads' },
        ]}
        actions={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => fetchLeads()}>Tải lại</Button>
            <Button icon={<InboxOutlined />} onClick={() => setImportVisible(true)}>Import CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerVisible(true)}>Thêm lead</Button>
          </Space>
        }
      />

      {user?.role === 'sale' && (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Danh sách sale được sắp xếp mặc định theo AI score cao nhất."
        />
      )}

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <Space className="mb-4 w-full" size={12} wrap>
          <Select
            placeholder="Trạng thái"
            style={{ width: 180 }}
            allowClear
            value={filters.status}
            onChange={(status) => handleFilterChange({ status })}
            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
          />
          <Select
            placeholder="Nguồn"
            style={{ width: 180 }}
            allowClear
            value={filters.source}
            onChange={(source) => handleFilterChange({ source })}
            options={sourceOptions}
          />
          <RangePicker value={filters.dateRange} onChange={(dateRange) => handleFilterChange({ dateRange })} />
          <Input.Search
            allowClear
            placeholder="Tìm theo tên, SĐT, email"
            style={{ width: 260 }}
            onSearch={(search) => handleFilterChange({ search })}
          />
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
            <Select options={sourceOptions} placeholder="Chọn nguồn" />
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
          description="Các giá trị dropdown phải dùng mã hệ thống, ví dụ occupation=working_professional, study_purpose=career."
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
    </div>
  );
}
