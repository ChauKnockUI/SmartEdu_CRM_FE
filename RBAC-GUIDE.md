# EduCRM System - Hệ thống quản lý giáo dục tích hợp

## 🎯 Tính năng chính

Hệ thống quản lý giáo dục tích hợp **CRM + LMS + AI dự đoán + RBAC** với 4 role:

### 🔴 Admin - Quản trị viên
- Dashboard tổng quan: KPIs, doanh thu, biểu đồ, cảnh báo hệ thống
- Quản lý toàn bộ: Leads, Students, Classes, Payments
- Phân công Leads cho Sale, chuyển lớp học viên, audit logs
- Xem AI insights, automation rules, export dữ liệu

### 🔵 Sale - Nhân viên kinh doanh
- Dashboard Sale: Leads ưu tiên, follow-up hôm nay, công nợ cần thu
- Quản lý Leads: AI Score, timeline chăm sóc, kịch bản gọi điện
- Thu học phí: nhắc nợ, quản lý công nợ, xuất biên lai
- CSKH sau bán: upsell, gia hạn khóa học, tư vấn

### 🟢 Teacher - Giảng viên
- Dashboard Teacher: Lịch dạy hôm nay, học viên cần chú ý
- Xem Leads học thử: thông tin chuẩn bị, đánh giá buổi học thử
- Điểm danh nhanh: Present/Absent/Late + ghi chú
- Ghi nhận tiến bộ học viên, AI Risk (churn prediction)

### 🟣 Student - Học viên
- Dashboard Student: Lịch học tuần, tiến độ, học phí
- Xem lịch học, calendar các buổi học sắp tới
- Xem điểm danh của mình, tải tài liệu, nộp bài tập
- Xem học phí: lịch đóng, trạng thái thanh toán

## 🎨 Cấu trúc trang Detail

### 📋 Lead Detail (`/crm/leads/:id`)
**4 role views:**
- **Admin:** Toàn bộ thông tin + Audit log + Phân công + Analytics
- **Sale:** CTA mạnh (Gọi/Email/Đặt lịch) + AI Score + Kịch bản + Checklist
- **Teacher:** Thông tin học thử + Đánh giá buổi học thử
- **Student:** Không có quyền xem

### 👨‍🎓 Student Detail (`/lms/students/:id`)
**Tabs:** Overview | Schedule | Attendance | Payments | Notes | AI Risk
- **Admin:** Sửa profile + Chuyển lớp + Xem công nợ + Audit
- **Sale:** Học phí + Upsell + CSKH
- **Teacher:** Lịch dạy + Attendance chi tiết + Progress notes
- **Student:** Chỉ thấy thông tin của mình

### 🏫 Class Detail (`/lms/classes/:id`)
**Tabs:** Overview | Students | Sessions | Attendance | Materials
- **Admin:** Dashboard lớp + Manage enrollments + Tạo sessions hàng loạt
- **Teacher:** Điểm danh nhanh + Ghi chú buổi học + Materials
- **Sale:** Xem học viên + Trạng thái học phí
- **Student:** Lịch học + Materials + Thông báo

### 📅 Session Detail (`/lms/sessions/:id`)
**4 role views:**
- **Admin:** Sửa lịch + Export attendance
- **Teacher:** Điểm danh nhanh + Ghi chú bài giảng
- **Sale:** Chỉ xem (không sửa)
- **Student:** Xem thời gian + Link + Tài liệu + Trạng thái điểm danh của mình

## 🔧 Cách sử dụng

### Role Switcher (Demo)
1. Nhìn lên góc trên bên phải màn hình
2. Tìm dropdown "Role Switcher" (icon 🔄)
3. Chọn role bạn muốn: Admin / Sale / Teacher / Student
4. Giao diện và quyền truy cập sẽ thay đổi theo role

### Nút Help (?)
- Click vào icon ❓ ở góc trên bên phải
- Xem hướng dẫn chi tiết cho từng role

## 📦 Tech Stack

- **React** + **TypeScript**
- **React Router** (Data mode pattern)
- **Ant Design** (UI Components)
- **Recharts** (Charts & Graphs)
- **Tailwind CSS v4**
- **Context API** (Auth & Permissions)

## 🎯 RBAC (Role-Based Access Control)

Permission matrix được quản lý bởi `usePermissions` hook:

```typescript
// Ví dụ permissions
{
  canViewLeadScore: ['admin', 'sale'],
  canEditLeadStatus: ['admin', 'sale'],
  canTakeAttendance: ['admin', 'teacher'],
  canViewStudentPayments: ['admin', 'sale', 'student'],
  ...
}
```

## 🚀 Next Steps

Để tích hợp Supabase:
1. Connect Supabase project
2. Tạo database schema cho: leads, students, classes, sessions, payments, users
3. Replace mock data với Supabase queries
4. Implement real-time subscriptions cho notifications

---

Được xây dựng với ❤️ bởi EduCRM Team
