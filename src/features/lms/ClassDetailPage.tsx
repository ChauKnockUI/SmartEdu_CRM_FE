import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Tabs,
  Descriptions,
  Tag,
  Button,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Space,
  Alert,
  TimePicker,
  Upload,
  Popconfirm,
} from 'antd';
import {
  EditOutlined,
  CalendarOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { RiskEstimate, SupportPriority, RiskDetailsDrawer } from '../../shared/components/DropoutRisk';
import { type DropoutRiskView } from '../../shared/utils/dropoutRisk';
import { PageHeader } from '../../shared/components/PageHeader';
import { useParams, useSearchParams } from 'react-router';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { classTab } from '../../shared/utils/navigation';
import { classService } from '@/services/api/class.service';
import { studentService } from '@/services/api/student.service';
import { scheduleService } from '@/services/api/schedule.service';
import { materialService } from '@/services/api/material.service';
import { useAuth } from '../../shared/contexts/AuthContext';
import dayjs from 'dayjs';

type Class = any;

const DAY_OPTIONS = [
  { label: 'Thứ 2', value: 1 },
  { label: 'Thứ 3', value: 2 },
  { label: 'Thứ 4', value: 3 },
  { label: 'Thứ 5', value: 4 },
  { label: 'Thứ 6', value: 5 },
  { label: 'Thứ 7', value: 6 },
  { label: 'Chủ nhật', value: 0 },
];

const DAY_MAP: Record<string, string> = {
  '0': 'Chủ nhật',
  '1': 'Thứ 2',
  '2': 'Thứ 3',
  '3': 'Thứ 4',
  '4': 'Thứ 5',
  '5': 'Thứ 6',
  '6': 'Thứ 7',
};

const parseDbField = <T,>(val: any): T[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch { }
  }
  return [];
};

const formatDays = (raw?: any) => {
  if (!raw) return 'N/A';
  const arr = parseDbField<number>(raw);

  return arr
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => DAY_MAP[String(d)] ?? '?')
    .join(' • ');
};

const formatTime = (raw?: any) => {
  if (!raw) return 'N/A';

  const text = String(raw);
  const isoMatch = text.match(/T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];

  const arr = parseDbField<string>(raw);
  return arr.length === 2 ? `${arr[0]} – ${arr[1]}` : String(raw);
};

const formatDate = (date?: string) => {
  if (!date) return 'N/A';
  return dayjs(date).format('DD/MM/YYYY');
};

export function ClassDetailPage() {
  const { id } = useParams();
  const { openDetail, navigationState } = useDetailNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const role = user?.role;

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const [classItem, setClassItem] = useState<Class | null>(null);
  const [loading, setLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [classRiskResults, setClassRiskResults] = useState<Record<number, DropoutRiskView>>({});
  const [riskFetching, setRiskFetching] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<{ studentId: number; name: string } | null>(null);
  const riskRequest = useRef(0);
  useEffect(() => {
    setClassRiskResults({});
    setSelectedRisk(null);
    const request = ++riskRequest.current;
    if (!isAdmin && !isTeacher) return;
    setRiskFetching(true);
    classService.getDropoutRisk(Number(id)).then(res => {
      if (request !== riskRequest.current) return;
      setClassRiskResults(Object.fromEntries((res.data || []).map((item: DropoutRiskView) => [item.student_id, item])));
    }).catch(error => { if (request === riskRequest.current) message.error(error.message); })
      .finally(() => { if (request === riskRequest.current) setRiskFetching(false); });
    return () => { riskRequest.current++; };
  }, [id, isAdmin, isTeacher]);

  const [students, setStudents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [form] = Form.useForm();
  const [uploadForm] = Form.useForm();
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const canUploadMaterial = isAdmin || isTeacher;
  const canEditClass = isAdmin || isTeacher;

  const fetchClass = async () => {
    try {
      setLoading(true);
      const res = await classService.getById(Number(id));
      setClassItem(res.data);
    } catch {
      message.error('Lỗi tải lớp học');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await studentService.getAll({ page: 1, limit: 100 });
      setStudents(res.data || []);
    } catch {
      message.error('Không tải được danh sách học viên');
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await scheduleService.getByClass(Number(id));
      setSchedules(res.data || []);
    } catch {
      setSchedules([]);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await materialService.getByClass(Number(id));
      setMaterials(res.data || []);
    } catch {
      setMaterials([]);
    }
  };

  useEffect(() => {
    fetchClass();
    fetchStudents();
    fetchSchedules();
    fetchMaterials();
  }, [id]);

  if (!classItem) return <div>Không tìm thấy lớp</div>;
  const activeStudentIds = new Set<number>((classItem.classEnrollments || []).filter((item: any) => item.status === 'active').map((item: any) => item.student_id));
  const activeClassRisks = Object.values(classRiskResults).filter(item => item.student_id && activeStudentIds.has(item.student_id));

  const handleEdit = () => {
    const daysArr = parseDbField<number>(classItem.schedule_days);
    const timeArr = parseDbField<string>(classItem.schedule_time);

    form.setFieldsValue({
      name: classItem.name,
      max_students: classItem.max_students,
      schedule_days: daysArr,
      schedule_time:
        timeArr.length === 2
          ? [dayjs(timeArr[0], 'HH:mm'), dayjs(timeArr[1], 'HH:mm')]
          : undefined,
    });

    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();

      await classService.update(classItem.id, {
        name: values.name,
        max_students: values.max_students,
        schedule_days: values.schedule_days as number[],
        schedule_time: values.schedule_time
          ? [
            values.schedule_time[0].format('HH:mm'),
            values.schedule_time[1].format('HH:mm'),
          ]
          : undefined,
      });

      message.success('Cập nhật thành công');
      setEditModalOpen(false);
      fetchClass();
    } catch (err: any) {
      message.error(err.message || 'Lỗi cập nhật');
    }
  };

  const getStatusTag = (status: string) => {
    const map: any = {
      upcoming: { color: 'blue', label: 'Sắp mở' },
      ongoing: { color: 'green', label: 'Đang học' },
      completed: { color: 'default', label: 'Hoàn thành' },
      cancelled: { color: 'red', label: 'Đã huỷ' },
    };

    const s = map[status] || map.upcoming;
    return <Tag color={s.color}>{s.label}</Tag>;
  };

  const handleEnroll = async () => {
    if (!selectedStudentIds.length) {
      message.warning('Chọn ít nhất 1 học viên');
      return;
    }

    try {
      setEnrollLoading(true);
      const res = await classService.enrollStudents(classItem.id, selectedStudentIds);

      const failed = res.data.failed || [];
      const successful = res.data.successful || [];

      if (failed.length === 0) {
        message.success('Ghi danh thành công tất cả học viên');
      } else {
        Modal.info({
          title: 'Kết quả ghi danh',
          width: 700,
          content: (
            <div>
              <Alert
                type="success"
                message={`Thành công: ${successful.length} học viên`}
                className="mb-4"
              />

              <Table
                size="small"
                pagination={false}
                rowKey="student_id"
                dataSource={failed}
                columns={[
                  { title: 'Student ID', dataIndex: 'student_id' },
                  { title: 'Lý do', dataIndex: 'reason' },
                ]}
              />
            </div>
          ),
        });
      }

      setEnrollModalOpen(false);
      setSelectedStudentIds([]);
      fetchClass();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleUnenroll = async (studentId: number) => {
    try {
      await classService.unenrollStudent(classItem.id, studentId);
      message.success('Đã hủy ghi danh học viên khỏi lớp');
      fetchClass();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa học viên');
    }
  };

  const handleUploadMaterial = async () => {
    try {
      const values = await uploadForm.validateFields();

      if (!uploadFile) {
        message.warning('Vui lòng chọn file');
        return;
      }

      await materialService.upload(classItem.id, {
        title: values.title,
        file: uploadFile,
      });

      message.success('Tải tài liệu thành công');
      setUploadModalOpen(false);
      uploadForm.resetFields();
      setUploadFile(null);
      fetchMaterials();
    } catch (err: any) {
      message.error(err.message || 'Tải tài liệu thất bại');
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    try {
      await materialService.remove(materialId);
      message.success('Đã xóa tài liệu');
      fetchMaterials();
    } catch (err: any) {
      message.error(err.message || 'Xóa tài liệu thất bại');
    }
  };

  const handleScoreClassDropoutRisk = async () => {
    try {
      setRiskLoading(true);
      const request = ++riskRequest.current;
      const res = await classService.scoreDropoutRisk(classItem.id);
      if (request !== riskRequest.current) return;
      const scored: typeof classRiskResults = {};
      for (const item of res.data || []) {
        if (item.success && item.data) scored[item.data.student_id] = { ...item.data, limited_data: item.data.snapshot?.limited_data };
        else if (item.student_id) scored[item.student_id] = { class_id: classItem.id, student_id: item.student_id,
          risk_score: null, model_status: item.success ? 'not_eligible' : 'unavailable',
          evaluated_at: new Date().toISOString(), top_reasons: item.reason ? [item.reason] : [] };
      }
      setClassRiskResults(scored);
      message.success(res.message || 'Đã cập nhật dropout risk cho lớp');
      fetchClass();
    } catch (err: any) {
      message.error(err.message || 'Không tính được dropout risk cho lớp');
    } finally {
      setRiskLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={classItem.name}
        actions={
          canEditClass ? (
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              Chỉnh sửa
            </Button>
          ) : null
        }
      />

      <Tabs
        activeKey={classTab(searchParams.get('tab'))}
        onChange={key => setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('tab', key); return next; }, { replace: true, state: navigationState })}
        items={[
          {
            key: 'overview',
            label: 'Tổng quan',
            children: (
              <Card
                loading={loading}

              >
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Tên lớp">{classItem.name}</Descriptions.Item>

                  <Descriptions.Item label="Trạng thái">
                    {getStatusTag(classItem.status)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Khóa học">
                    {classItem.course?.name}
                  </Descriptions.Item>

                  <Descriptions.Item label="Giảng viên">
                    {classItem.teacher?.full_name || 'Chưa phân công'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Phòng học">
                    {classItem.room?.name || 'N/A'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Sĩ số">
                    {classItem._count?.classEnrollments || 0} / {classItem.max_students}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày học">
                    <span className="font-medium">
                      {formatDays(classItem.schedule_days)}
                    </span>
                  </Descriptions.Item>

                  <Descriptions.Item label="Giờ học">
                    <span className="font-medium">
                      {formatTime(classItem.schedule_time)}
                    </span>
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày bắt đầu">
                    {formatDate(classItem.start_date)}
                  </Descriptions.Item>

                  <Descriptions.Item label="Ngày kết thúc">
                    {formatDate(classItem.end_date)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'students',
            label: 'Học viên',
            children: (
              <Card
                title="Học viên"
                extra={<Space wrap>
                  {(isAdmin || isTeacher) && <Button type="primary" icon={<WarningOutlined />}
                    loading={riskLoading} disabled={riskFetching || classItem.status !== 'ongoing'}
                    onClick={handleScoreClassDropoutRisk}>Đánh giá nguy cơ bỏ học</Button>}
                  {isAdmin && <Button onClick={() => setEnrollModalOpen(true)}>Thêm học viên</Button>}
                </Space>}
              >
                <p className="mb-4 text-gray-600">
                  Sĩ số: <strong>{classItem._count?.classEnrollments || 0}</strong> /{' '}
                  {classItem.max_students}
                </p>

                {(isAdmin || isTeacher) && <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <Space size={20} wrap>
                    <span>Cần liên hệ: <strong>{activeClassRisks.filter(item => item.risk_level === 'high').length}</strong></span>
                    <span>Cần theo dõi: <strong>{activeClassRisks.filter(item => item.risk_level === 'medium').length}</strong></span>
                    <span>Chưa có ước tính: <strong>{activeStudentIds.size - activeClassRisks.filter(item => typeof item.risk_score === 'number').length}</strong></span>
                    <span className="text-gray-500">Bấm “Xem đánh giá” để xem căn cứ và hướng xử lý.</span>
                  </Space>
                </div>}

                <Table
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  dataSource={classItem.classEnrollments || []}
                  locale={{ emptyText: 'Chưa có học viên nào trong lớp' }}
                  loading={riskLoading || riskFetching}
                  scroll={{ x: 980 }}
                  columns={[
                    { title: 'Học viên', width: 230, render: (row: any) => <Space direction="vertical" size={0}>
                      <Button type="link" style={{ padding: 0 }} onClick={() => openDetail(`/lms/students/${row.student_id}`)}>{row.student?.full_name || `ID: ${row.student_id}`}</Button>
                      <span className="text-xs text-gray-500">{row.student?.email || '—'}</span>
                    </Space> },
                    { title: 'Điện thoại', width: 125, render: (row: any) => row.student?.phone || '—' },
                    { title: 'Tình trạng', width: 105, render: (row: any) => <Tag color={row.status === 'active' ? 'green' : 'default'}>
                      {row.status === 'active' ? 'Đang học' : row.status === 'dropped' ? 'Đã nghỉ' : row.status === 'completed' ? 'Hoàn thành' : row.status}
                    </Tag> },
                    { title: 'Mức cần hỗ trợ', width: 150, render: (row: any) => <SupportPriority data={classRiskResults[row.student_id]} /> },
                    { title: 'Nguy cơ bỏ học', width: 170, render: (row: any) => <RiskEstimate data={classRiskResults[row.student_id]} showReason={false}
                      onOpen={() => setSelectedRisk({ studentId: row.student_id, name: row.student?.full_name || `ID: ${row.student_id}` })} /> },
                    { title: 'Thao tác', width: 150, render: (row: any) => <Space size={4}>
                      {isAdmin && <Popconfirm title="Xóa học viên khỏi lớp?" onConfirm={() => handleUnenroll(row.student_id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="Xóa học viên khỏi lớp" title="Xóa học viên khỏi lớp" />
                      </Popconfirm>}
                    </Space> },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'sessions',
            label: 'Buổi học',
            children: (
              <Card>
                <Table
                  rowKey="id"
                  dataSource={schedules}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: 'Chưa có buổi học nào' }}
                  columns={[
                    {
                      title: 'Ngày học',
                      dataIndex: 'date',
                      render: (date: string) => (
                        <Space>
                          <CalendarOutlined />
                          {formatDate(date)}
                        </Space>
                      ),
                    },
                    {
                      title: 'Thời gian',
                      render: (row: any) =>
                        `${formatTime(row.start_time || row.startTime)} - ${formatTime(
                          row.end_time || row.endTime
                        )}`,
                    },
                    {
                      title: 'Phòng',
                      render: (row: any) => row.room?.name || row.room_name || '—',
                    },
                    {
                      title: 'Giảng viên',
                      render: (row: any) =>
                        row.teacher?.full_name || classItem.teacher?.full_name || '—',
                    },
                    {
                      title: 'Trạng thái',
                      render: (row: any) =>
                        row.attendances?.length > 0 ? (
                          <Tag color="green">Đã điểm danh</Tag>
                        ) : (
                          <Tag color="blue">Chưa điểm danh</Tag>
                        ),
                    },
                    {
                      title: 'Thao tác',
                      render: (row: any) => (
                        <Space>
                          {isTeacher && (
                            <Button
                              type="primary"
                              size="small"
                              icon={<CheckCircleOutlined />}
                              onClick={() => openDetail(`/lms/sessions/${row.id}`)}
                            >
                              Điểm danh
                            </Button>
                          )}

                          <Button
                            size="small"
                            onClick={() => openDetail(`/lms/sessions/${row.id}`)}
                          >
                            Chi tiết
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'materials',
            label: 'Tài liệu',
            children: (
              <Card
                extra={
                  canUploadMaterial ? (
                    <Button
                      type="primary"
                      icon={<UploadOutlined />}
                      onClick={() => setUploadModalOpen(true)}
                    >
                      Tải tài liệu lên
                    </Button>
                  ) : null
                }
              >
                <Table
                  rowKey="id"
                  dataSource={materials}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: 'Chưa có tài liệu nào' }}
                  columns={[
                    {
                      title: 'Tên tài liệu',
                      dataIndex: 'title',
                      render: (title: string) => (
                        <Space>
                          <FileOutlined />
                          {title}
                        </Space>
                      ),
                    },
                    {
                      title: 'Tên file',
                      dataIndex: 'file_name',
                      render: (fileName: string) => fileName || '—',
                    },
                    {
                      title: 'Ngày tải lên',
                      dataIndex: 'created_at',
                      render: (date: string) => formatDate(date),
                    },
                    {
                      title: 'Thao tác',
                      render: (row: any) => (
                        <Space>
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => window.open(row.file_url, '_blank')}
                          >
                            Tải xuống
                          </Button>

                          {canUploadMaterial && (
                            <Button
                              danger
                              size="small"
                              onClick={() => handleDeleteMaterial(row.id)}
                            >
                              Xóa
                            </Button>
                          )}
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <RiskDetailsDrawer open={!!selectedRisk} onClose={() => setSelectedRisk(null)} name={selectedRisk?.name}
        className={classItem.name} data={selectedRisk ? classRiskResults[selectedRisk.studentId] : undefined}
        loading={riskLoading} onEvaluate={selectedRisk && classItem.status === 'ongoing' ? async () => {
          const classId = classItem.id;
          const studentId = selectedRisk.studentId;
          const request = riskRequest.current;
          try {
            setRiskLoading(true);
            const result = await studentService.scoreDropoutRisk(studentId, classId);
            if (!result.data) throw new Error(result.reason || 'Lớp không còn trong giai đoạn theo dõi');
            if (request === riskRequest.current) setClassRiskResults(previous => ({ ...previous,
              [studentId]: { ...result.data, limited_data: result.data?.snapshot?.limited_data } }));
          } catch (error: any) { message.error(error.message || 'Không đánh giá được học viên'); }
          finally { setRiskLoading(false); }
        } : undefined}
        onProfile={selectedRisk ? () => openDetail(`/lms/students/${selectedRisk.studentId}?tab=classes`) : undefined} />

      <Modal
        title="Chỉnh sửa lớp học"
        open={editModalOpen}
        onOk={handleUpdate}
        onCancel={() => setEditModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên lớp" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="max_students" label="Sĩ số">
            <InputNumber className="w-full" />
          </Form.Item>

          <Form.Item name="schedule_days" label="Ngày học">
            <Select mode="multiple" placeholder="Chọn các ngày học" options={DAY_OPTIONS} />
          </Form.Item>

          <Form.Item name="schedule_time" label="Giờ học">
            <TimePicker.RangePicker className="w-full" format="HH:mm" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm học viên vào lớp"
        open={enrollModalOpen}
        onCancel={() => setEnrollModalOpen(false)}
        onOk={handleEnroll}
        confirmLoading={enrollLoading}
        width={700}
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Chọn học viên"
          value={selectedStudentIds}
          onChange={setSelectedStudentIds}
          optionFilterProp="label"
          showSearch
          options={students.map((s) => ({
            value: s.id,
            label: `${s.full_name} (${s.email})`,
          }))}
        />
      </Modal>

      <Modal
        title="Tải tài liệu lên"
        open={uploadModalOpen}
        onCancel={() => {
          setUploadModalOpen(false);
          setUploadFile(null);
          uploadForm.resetFields();
        }}
        onOk={handleUploadMaterial}
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item name="title" label="Tên tài liệu" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: Bài tập buổi 1" />
          </Form.Item>

          <Form.Item label="File" required>
            <Upload
              beforeUpload={(file) => {
                setUploadFile(file);
                return false;
              }}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Chọn file</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
