import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Table, Space, Statistic, Row, Col, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined, TeamOutlined, BookOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { courseService } from '@/services/api/course.service';

export function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [course, setCourse] = useState<any>(null);


  const fetchCourse = async () => {
    try {
      const courseId = Number(id);
      const res = await courseService.getById(courseId);
      setCourse(res.data);

    } catch (err) {
      console.error(err);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);

      const res = await courseService.getClasses(Number(id));

      setCourseClasses(res.data || []);
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoadingClasses(false);
    }
  };

  const [courseClasses, setCourseClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourse();
      fetchClasses();
    }
  }, [id]);

  if (!course) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold">Không tìm thấy khóa học</h2>
        <Button type="primary" onClick={() => navigate('/lms/courses')} className="mt-4">
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const handleViewClass = (classId: string) => {
    navigate(`/lms/classes/${classId}`);
  };
  const totalStudents = 0;

  const activeClasses = courseClasses.filter(
    c => c.status === 'ongoing' || c.status === 'upcoming'
  ).length;

  const classColumns: ColumnsType<any> = [
    {
      title: 'Mã lớp',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => <span className="font-semibold text-blue-600">{code}</span>,
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
            {new Date(record.start_date).toLocaleDateString('vi-VN')}
          </div>

          <div className="text-gray-500">
            đến {
              record.end_date
                ? new Date(record.end_date).toLocaleDateString('vi-VN')
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
        return `${record._count?.classEnrollments || 0}/${record.max_students || 0}`;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        const colorMap = {
          upcoming: 'blue',
          ongoing: 'green',
          completed: 'default',
        };
        const labelMap = {
          upcoming: 'Sắp mở',
          ongoing: 'Đang học',
          completed: 'Hoàn thành',
        };
        return <Tag color={colorMap[status as keyof typeof colorMap]}>{labelMap[status as keyof typeof labelMap]}</Tag>;
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
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/lms/courses')}
            >
              Quay lại
            </Button>

            {can('courses', 'write') && (
              <Button icon={<EditOutlined />}>
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
                value={courseClasses.length}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Lớp đang hoạt động"
                value={activeClasses}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Tổng học viên"
                value={totalStudents}
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
              {course.duration_weeks} tuần
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
          title={`Danh sách lớp học (${courseClasses.length})`}
          extra={
            can('courses', 'write') ? (
              <Button type="primary">Tạo lớp mới</Button>
            ) : undefined
          }
        >
          <Table
            columns={classColumns}
            dataSource={courseClasses}
            loading={loadingClasses}
            rowKey="id"
            pagination={false}
          />
        </Card>
      </div>
    </div>
  );
}
