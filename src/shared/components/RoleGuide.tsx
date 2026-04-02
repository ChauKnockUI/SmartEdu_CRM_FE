import React from 'react';
import { Modal, Typography, List, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { UserRole } from '../contexts/AuthContext';

const { Title, Paragraph } = Typography;

interface RoleGuideProps {
  visible: boolean;
  onClose: () => void;
  role: UserRole;
}

const roleGuides: Record<UserRole, { title: string; description: string; features: string[] }> = {
  admin: {
    title: 'Quản trị viên (Admin)',
    description: 'Bạn có toàn quyền quản lý hệ thống',
    features: [
      '✅ Xem tất cả thông tin Leads, Students, Classes, Payments',
      '✅ Phân công Leads cho Sale, chuyển lớp, quản lý enrollments',
      '✅ Xem Dashboard tổng quan: KPIs, doanh thu, cảnh báo hệ thống',
      '✅ Xem Audit logs và lịch sử thay đổi',
      '✅ Quản lý users, settings, automation rules',
      '✅ Export dữ liệu, báo cáo chi tiết',
    ],
  },
  sale: {
    title: 'Nhân viên Sale',
    description: 'Chuyên chăm sóc Leads và thu học phí',
    features: [
      '✅ Quản lý Leads: thêm tương tác, gọi điện, chuyển đổi thành học viên',
      '✅ Xem AI Lead Score và gợi ý hành động',
      '✅ Theo dõi học phí: thu tiền, nhắc nợ, quản lý công nợ',
      '✅ CSKH sau bán: upsell, gia hạn khóa học',
      '✅ Dashboard Sale: leads ưu tiên, follow-up hôm nay, công nợ cần thu',
      '✅ Kịch bản sale, checklist chốt đơn, lý do lost',
    ],
  },
  teacher: {
    title: 'Giảng viên (Teacher)',
    description: 'Quản lý giảng dạy và điểm danh',
    features: [
      '✅ Xem Leads học thử: thông tin chuẩn bị, ghi nhận đánh giá',
      '✅ Xem lịch dạy, danh sách lớp, thông tin học viên',
      '✅ Điểm danh nhanh: Present/Absent/Late + ghi chú',
      '✅ Ghi nhận tiến bộ học viên, đánh giá buổi học',
      '✅ Xem AI Risk: học viên cần can thiệp',
      '✅ Dashboard Teacher: lịch dạy hôm nay, học viên cần chú ý',
    ],
  },
  student: {
    title: 'Học viên (Student)',
    description: 'Xem thông tin học tập của bản thân',
    features: [
      '✅ Xem lịch học, calendar các buổi học sắp tới',
      '✅ Xem điểm danh của mình (Present/Absent/Late)',
      '✅ Xem học phí: lịch đóng, trạng thái thanh toán',
      '✅ Tải tài liệu học tập, nộp bài tập',
      '✅ Nhận thông báo: nhắc lịch học, thay đổi giờ, bài tập',
      '✅ Dashboard Student: lịch học tuần, tiến độ, học phí',
    ],
  },
};

export function RoleGuide({ visible, onClose, role }: RoleGuideProps) {
  const guide = roleGuides[role];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <UserOutlined />
          <span>Hướng dẫn sử dụng - {guide.title}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div className="space-y-4">
        <Paragraph className="text-gray-600">
          {guide.description}
        </Paragraph>

        <div>
          <Title level={5}>Các chức năng chính:</Title>
          <List
            dataSource={guide.features}
            renderItem={(feature) => (
              <List.Item>
                <Typography.Text>{feature}</Typography.Text>
              </List.Item>
            )}
          />
        </div>

        <div className="bg-blue-50 p-4 rounded">
          <strong>💡 Mẹo:</strong> Sử dụng dropdown "Role Switcher" ở góc trên bên phải để chuyển đổi giữa các role và trải nghiệm giao diện khác nhau!
        </div>
      </div>
    </Modal>
  );
}
