import { useState, useEffect } from 'react';
import { Alert, Card, Descriptions, Tag, Button, Table, Statistic, Row, Col, Spin } from 'antd';
import { EditOutlined, TeamOutlined, BookOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router';
import type { ColumnsType } from 'antd/es/table';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { PageHeader } from '../../shared/components/PageHeader';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { courseService, type Course, type CourseClass } from '@/services/api/course.service';
import { CourseFormModal } from './CoursesPage';
import { getClassStatus } from './classFilters';
import { useAuth } from '../../shared/contexts/AuthContext';

export function CourseDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { openDetail, goBack } = useDetailNavigation();
  const { can } = usePermissions();
  const [course, setCourse] = useState<Course | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [courseError, setCourseError] = useState('');
  const [courseReload, setCourseReload] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [courseClasses, setCourseClasses] = useState<CourseClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState('');
  const [classesReload, setClassesReload] = useState(0);
  const [totalStudents, setTotalStudents] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setCourse(null);
    setIsEditing(false);
    setCourseError('');
    setLoadingCourse(true);
    const courseId = Number(id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      setCourseError('ID khóa học không hợp lệ');
      setLoadingCourse(false);
      return;
    }
    courseService.getById(courseId, controller.signal)
      .then(res => { if (current) setCourse(res.data); })
      .catch(err => {
        if (current) setCourseError(err instanceof Error ? err.message : 'Lỗi tải khóa học');
      })
      .finally(() => { if (current) setLoadingCourse(false); });
    return () => { current = false; controller.abort(); };
  }, [id, courseReload, user?.id, user?.role]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setCourseClasses([]);
    setTotalStudents(null);
    setClassesError('');
    setLoadingClasses(true);
    const courseId = Number(id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      setLoadingClasses(false);
      return;
    }
    courseService.getClasses(courseId, controller.signal)
      .then(res => {
        if (!current) return;
        setCourseClasses(res.data);
        const count = res.summary?.total_students;
        if (typeof count === 'number' && Number.isInteger(count) && count >= 0) setTotalStudents(count);
      })
      .catch(err => {
        if (current) setClassesError(err instanceof Error ? err.message : 'Lỗi tải danh sách lớp');
      })
      .finally(() => { if (current) setLoadingClasses(false); });
    return () => { current = false; controller.abort(); };
  }, [id, classesReload, user?.id, user?.role]);

  if (loadingCourse || (course && course.id !== Number(id))) {
    return <div className="text-center p-8"><Spin size="large" /></div>;
  }

  if (!course) {
    return (
      <div className="text-center p-8">
        <Alert
          type="error"
          showIcon
          title={courseError || 'Không tìm thấy khóa học'}
          action={<Button onClick={() => setCourseReload(value => value + 1)}>Thử lại</Button>}
        />
        <Button type="primary" onClick={() => goBack()} className="mt-4">
          Quay lại
        </Button>
      </div>
    );
  }

  const handleViewClass = (classId: number) => {
    openDetail(`/lms/classes/${classId}`);
  };
  const hasClassStats = !loadingClasses && !classesError;

  const activeClasses = courseClasses.filter(
    c => c.status === 'ongoing' || c.status === 'upcoming'
  ).length;

  const classColumns: ColumnsType<CourseClass> = [
    {
      title: 'Mã lớp',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      render: (id: number) => <span className="font-semibold text-blue-600">#{id}</span>,
    },
    {
      title: 'Tên lớp',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Giảng viên',
      key: 'teacher',
      width: 180,
      render: (_, record) => (
        record.teacher?.full_name || '-'
      ),
    },
    {
      title: 'Thời gian',
      key: 'duration',
      width: 200,
      render: (_, record) => (
        <div className="text-sm">
          <div>
            {record.start_date ? new Date(record.start_date).toLocaleDateString('vi-VN', { timeZone: 'UTC' }) : '—'}
          </div>

          <div className="text-gray-500">
            đến {
              record.end_date
                ? new Date(record.end_date).toLocaleDateString('vi-VN', { timeZone: 'UTC' })
                : '—'
            }
          </div>
        </div>
      ),
    },
    {
      title: 'Sĩ số',
      key: 'students',
      width: 100,
      render: (_, record) => {
        return `${record._count?.classEnrollments ?? '—'}/${record.max_students ?? '—'}`;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        const meta = getClassStatus(status);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => handleViewClass(record.id)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={course.name}
        actions={
          <>
            {can('courses', 'write') && (
              <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                Chỉnh sửa
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
        {/* Overview Statistics */}
        <Card>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Tổng số lớp"
                value={hasClassStats ? courseClasses.length : '—'}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Lớp đang hoạt động"
                value={hasClassStats ? activeClasses : '—'}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={user?.role === 'admin' ? 'Học viên đang ghi danh' : 'Học viên trong phạm vi'}
                value={hasClassStats ? totalStudents ?? '—' : '—'}
                prefix={<TeamOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Học phí"
                value={Number(course.fee || 0)}
                prefix={<DollarOutlined />}
                suffix="đ"
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Course Information */}
        <Card title="Thông tin khóa học">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Mã khóa học">
              <span className="font-semibold">{course.id}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={course.is_active ? 'green' : 'default'}>
                {course.is_active ? 'Đang mở' : 'Tạm dừng'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Thời lượng">
              {course.duration_weeks ? `${course.duration_weeks} tuần` : 'Chưa có'}
            </Descriptions.Item>
            <Descriptions.Item label="Số buổi">
              {course.total_sessions ?? 'Chưa có'}
            </Descriptions.Item>
            <Descriptions.Item label="Học phí">
              <span className="font-semibold text-green-600">
                {Number(course.fee || 0).toLocaleString('vi-VN')}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {course.createdAt && new Date(course.createdAt).toLocaleDateString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật lần cuối">
              {course.updatedAt && new Date(course.updatedAt).toLocaleDateString('vi-VN')}
            </Descriptions.Item>
            {course.description && (
              <Descriptions.Item label="Mô tả" span={2}>
                {course.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Classes List */}
        <Card
          title={`Danh sách lớp học (${hasClassStats ? courseClasses.length : '—'})`}
          extra={
            user?.role === 'admin' && course.is_active ? (
              <Button
                type="primary"
                onClick={() => navigate(`/lms/classes?course_id=${course.id}&create=1`)}
              >Tạo lớp mới</Button>
            ) : undefined
          }
        >
          {classesError && (
            <Alert
              type="error"
              showIcon
              title={classesError}
              className="mb-4"
              action={<Button onClick={() => setClassesReload(value => value + 1)}>Thử lại</Button>}
            />
          )}
          {hasClassStats && totalStudents === null && (
            <Alert
              type="warning"
              showIcon
              title="Chưa tải được tổng học viên của khóa học"
              className="mb-4"
              action={<Button onClick={() => setClassesReload(value => value + 1)}>Thử lại</Button>}
            />
          )}
          <Table
            columns={classColumns}
            dataSource={courseClasses}
            loading={loadingClasses}
            rowKey="id"
            pagination={false}
          />
        </Card>
      </div>
      {isEditing && can('courses', 'write') && (
        <CourseFormModal
          key={course.id}
          course={course}
          onCancel={() => setIsEditing(false)}
          onSaved={(updated) => {
            setCourse(updated);
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );
}
