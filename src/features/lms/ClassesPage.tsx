import React from 'react';
import { Card, Row, Col, Tag, Button, Space, Statistic } from 'antd';
import { PlusOutlined, TeamOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { PageHeader } from '../../shared/components/PageHeader';
import { mockClasses } from '../../services/mock/mockData';
import { useNavigate } from 'react-router';

const statusColors = {
  active: 'green',
  completed: 'default',
  upcoming: 'blue',
};

const statusLabels = {
  active: 'Đang học',
  completed: 'Đã kết thúc',
  upcoming: 'Sắp khai giảng',
};

export function ClassesPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Quản lý Lớp học"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'LMS' },
          { title: 'Lớp học' },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />}>
            Tạo lớp học
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        {mockClasses.map(classItem => (
          <Col xs={24} md={12} lg={8} key={classItem.id}>
            <Card
              hoverable
              onClick={() => navigate(`/lms/classes/${classItem.id}`)}
              title={
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{classItem.name}</span>
                  <Tag color={statusColors[classItem.status]}>
                    {statusLabels[classItem.status]}
                  </Tag>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <UserOutlined className="mr-2" />
                  <span>GV: {classItem.teacherName}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <TeamOutlined className="mr-2" />
                  <span>{classItem.studentCount} học viên</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <CalendarOutlined className="mr-2" />
                  <span>{classItem.schedule}</span>
                </div>
                <div className="text-sm text-gray-500">
                  Khai giảng: {classItem.startDate.toLocaleDateString('vi-VN')}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t">
                <Space>
                  <Button key="detail" size="small" type="link">Chi tiết</Button>
                  <Button key="attendance" size="small" type="link">Điểm danh</Button>
                  <Button key="students" size="small" type="link">Danh sách HV</Button>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}