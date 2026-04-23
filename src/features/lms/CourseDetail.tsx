import { useState } from 'react';
import { Card, Descriptions, Tag, Button, Table, Space, Statistic, Row, Col } from 'antd';
import { ArrowLeftOutlined, EditOutlined, TeamOutlined, BookOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../shared/components/PageHeader';
import { usePermissions } from '../../shared/hooks/usePermissions';

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const course = db.courses.findById(id || '');
  const classes = mockClasses.filter(c => c.course_id === id);

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

  const totalStudents = classes.reduce((sum, cls) => {
    const enrollments = db.enrollments.findByClass(cls.id);
    return sum + enrollments.length;
  }, 0);

  const activeClasses = classes.filter(c => c.status === 'ongoing' || c.status === 'upcoming').length;

  const classColumns: ColumnsType<Class> = [
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
      dataIndex: 'teacher_id',
      key: 'teacher',
      width: 180,
      render: (teacherId: string) => {
        const teacher = db.teachers.getWithUser(teacherId);
        return teacher?.user?.name || 'N/A';
      },
    },
    {
      title: 'Thời gian',
      key: 'duration',
      width: 200,
      render: (_, record) => (
        <div className="text-sm">
          <div>{new Date(record.start_date).toLocaleDateString('vi-VN')}</div>
          <div className="text-gray-500">đến {new Date(record.end_date).toLocaleDateString('vi-VN')}</div>
        </div>
      ),
    },
    {
      title: 'Sĩ số',
      key: 'students',
      width: 100,
      render: (_, record) => {
        const enrollments = db.enrollments.findByClass(record.id);
        return `${enrollments.length}/${record.max_students}`;
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
        onBack={() => navigate('/lms/courses')}
        extra={
          can('update', 'course') ? (
            <Button icon={<EditOutlined />}>Chỉnh sửa</Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {/* Overview Statistics */}
        <Card>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Tổng số lớp"
                value={classes.length}
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
                value={course.price}
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
              <span className="font-semibold">{course.code}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={course.status === 'active' ? 'green' : 'default'}>
                {course.status === 'active' ? 'Đang mở' : 'Tạm dừng'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Thời lượng">
              {course.duration_weeks} tuần
            </Descriptions.Item>
            <Descriptions.Item label="Học phí">
              <span className="font-semibold text-green-600">
                {course.price.toLocaleString('vi-VN')} đ
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {new Date(course.created_at).toLocaleDateString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Cập nhật lần cuối">
              {new Date(course.updated_at).toLocaleDateString('vi-VN')}
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
          title={`Danh sách lớp học (${classes.length})`}
          extra={
            can('create', 'class') ? (
              <Button type="primary">Tạo lớp mới</Button>
            ) : undefined
          }
        >
          <Table
            columns={classColumns}
            dataSource={classes}
            rowKey="id"
            pagination={false}
          />
        </Card>
      </div>
    </div>
  );
}
