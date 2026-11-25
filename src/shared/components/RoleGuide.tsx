import { Modal, Typography, List } from 'antd';
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
    title: 'Quản trị viên',
    description: 'Quản lý hoạt động tuyển sinh, đào tạo và thu học phí của trung tâm.',
    features: [
      'Lead: phân công Sale, theo dõi chăm sóc và chuyển thành học viên.',
      'Học viên: quản lý hồ sơ, ghi danh vào lớp và theo dõi học phí.',
      'Đào tạo: quản lý khóa học, lớp, giảng viên, phòng và lịch học.',
      'Buổi học: kiểm tra điểm danh, lịch nghỉ, học bù và tài liệu.',
      'Tài chính: theo dõi khoản phải thu, thanh toán và công nợ.',
      'Tổng quan: mở từng nhóm cảnh báo để xem và xử lý công việc.',
    ],
  },
  sale: {
    title: 'Nhân viên Sale',
    description: 'Chăm sóc Lead và theo dõi học viên trong phạm vi được phân công.',
    features: [
      'Lead: tìm kiếm, ghi nhận kết quả chăm sóc và cập nhật giai đoạn khi đủ điều kiện.',
      'Đã đăng ký: chuyển Lead thành học viên và kiểm tra việc xếp lớp.',
      'Học viên phụ trách: xem hồ sơ và tình trạng học tập, học phí.',
      'Tài chính: ghi nhận thanh toán và theo dõi công nợ trong phạm vi được xem.',
      'Tổng quan: kiểm tra Lead cần chăm sóc và các cảnh báo cần xử lý.',
    ],
  },
  teacher: {
    title: 'Giảng viên',
    description: 'Theo dõi lịch dạy và chăm sóc học viên trong các lớp được phân công.',
    features: [
      'Lịch dạy: mở buổi học để xem giờ, phòng và các thay đổi lịch.',
      'Điểm danh: ghi trạng thái, ghi chú và nội dung buổi học khi được phép.',
      'Lớp học: xem danh sách học viên và các buổi trong lớp phụ trách.',
      'Tài liệu: tải lên, tải về và quản lý tài liệu chung hoặc theo buổi được phân công.',
      'Cảnh báo: kiểm tra buổi thiếu điểm danh và học viên cần hỗ trợ.',
    ],
  },
  student: {
    title: 'Học viên',
    description: 'Theo dõi lịch học, tiến độ và học phí của bản thân.',
    features: [
      'Lịch học của tôi: xem buổi sắp tới, phòng học và lịch nghỉ hoặc học bù.',
      'Lớp học của tôi: xem thông tin lớp và tải tài liệu chung hoặc theo buổi.',
      'Hồ sơ của tôi: xem thông tin cá nhân, lớp đang học, điểm danh và học phí.',
      'Tổng quan: theo dõi tiến độ lớp, tỷ lệ tham gia và khoản học phí còn lại.',
      'Thông báo: bấm chuông để xem thay đổi và mở thông tin liên quan.',
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
        <Paragraph type="secondary">
          {guide.description}
        </Paragraph>

        <div>
          <Title level={5}>Các chức năng chính:</Title>
          <List
            size="small" dataSource={guide.features}
            rowKey={feature => feature}
            renderItem={(feature) => (
              <List.Item>
                <Typography.Text>{feature}</Typography.Text>
              </List.Item>
            )}
          />
        </div>

        <Paragraph type="secondary" className="mb-0 text-xs">
          Dùng ô tìm kiếm và bộ lọc trong từng danh sách. Mở chi tiết để xem thông tin
          và các thao tác được cấp quyền cho tài khoản của bạn.
        </Paragraph>
      </div>
    </Modal>
  );
}
