
# EduCRM - Education CRM System

Hệ thống quản lý giáo dục EduCRM với kiến trúc microservices và giao diện React.

## 📁 Cấu trúc dự án

```
├── src/                    # Frontend React Application
│   ├── app/               # React Router setup
│   ├── features/          # Feature modules (LMS, CRM, Finance, AI)
│   ├── services/          # API services & repositories
│   ├── shared/            # Shared components & utilities
│   └── styles/            # Global styles & themes
├── microservices/         # Backend Microservices (Node.js)
│   ├── api-gateway/       # API Gateway (Port: 3000)
│   ├── auth-service/      # Authentication Service (Port: 3001)
│   ├── lms-service/       # Learning Management (Port: 3002)
│   ├── crm-service/       # CRM Service (Port: 3003)
│   ├── finance-service/   # Finance Service (Port: 3004)
│   ├── ai-service/        # AI Service (Port: 3005)
│   ├── notification-service/ # Notification Service (Port: 3006)
│   └── shared-libs/       # Shared Libraries
├── archive/               # Archived documentation
└── docs/                  # Project documentation
```

## 🚀 Khởi chạy

### Quick Setup (Khuyến nghị)
```bash
# Chạy script setup tự động
chmod +x setup.sh
./setup.sh
```

### Manual Setup

#### Frontend (Development)
```bash
npm install
npm run dev
```

#### Backend Microservices
```bash
cd microservices
docker-compose up -d
```

### Development với tất cả services
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: API Gateway
cd microservices/api-gateway && npm install && npm run dev

# Terminal 3: Auth Service
cd microservices/auth-service && npm install && npm run dev

# Và tương tự cho các service khác...
```

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18** với TypeScript
- **Vite** - Build tool
- **Ant Design** - UI Components
- **React Router** - Routing
- **Tailwind CSS** - Styling

### Backend
- **Node.js** với Express.js
- **PostgreSQL** - Database
- **Redis** - Caching
- **JWT** - Authentication
- **Docker** - Containerization

## 📊 Microservices

| Service | Port | Chức năng |
|---------|------|-----------|
| API Gateway | 3000 | Điểm vào duy nhất |
| Auth Service | 3001 | Xác thực & phân quyền |
| LMS Service | 3002 | Quản lý học tập |
| CRM Service | 3003 | Quản lý khách hàng |
| Finance Service | 3004 | Quản lý tài chính |
| AI Service | 3005 | Phân tích & dự đoán |
| Notification | 3006 | Thông báo |

## 🔧 Development Tools

- **pgAdmin**: http://localhost:5050
- **Redis Commander**: http://localhost:8081

## 📚 Documentation

- [Microservices Guide](./microservices/README.md)
- [Database Schema](./DB_INTEGRATION_GUIDE.md)
- [RBAC Guide](./RBAC-GUIDE.md)
- [Archived Docs](./archive/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open a Pull Request

## Chi tiết học phí và in phiếu thu

Nút Chi tiết ở Khoản phải thu, Thu học phí, Công nợ và tab Học phí của hồ sơ học
viên dùng chung một ngăn chi tiết: phí/giảm giá, số dư, giao dịch và phiếu thu.
Sau khi ghi nhận tiền, mở chi tiết để kiểm tra phiếu vừa lập. Bấm **In phiếu**
mở hộp thoại in của trình duyệt; có thể chọn lưu PDF. Số tiền in là của giao dịch
gắn với phiếu. Học viên chỉ xem của mình; giáo viên không có phần tài chính.

Admin có nút **Hủy khoản phải thu** khi khoản chưa có giao dịch/phiếu thu. Phải
nhập lý do; BE kiểm tra lại trước khi lưu, giữ lịch sử và cập nhật công nợ. Sale
không có quyền hủy. Tạo theo lớp hiển thị số tiền sau giảm giá cho mỗi học viên
và lý do cụ thể nếu có học viên không tạo được khoản thu. Không thêm thư viện.

## Khóa học và lịch lớp

Danh sách khóa học tìm kiếm/lọc trạng thái/phân trang tại BE, có thể chỉnh sửa
từ danh sách hoặc chi tiết và mở tạo lớp theo khóa đang chọn. Chi tiết hiển thị
sĩ số đang ghi danh, thống kê học viên thực tế và lỗi tải dữ liệu riêng.

Trong **Tạo lớp học**, chọn khóa có số buổi, ngày bắt đầu và các thứ học để tự
tính ngày kết thúc. Số buổi/tuần tự đếm từ các thứ đã chọn. Hiện buổi đầu/cuối trước khi lưu; số buổi
tính theo lịch hằng tuần, chưa trừ ngày nghỉ lễ. Khóa cũ chưa có số buổi giữ cách
nhập ngày kết thúc. Không tự đổi lịch lớp cũ khi sửa số buổi của khóa học.

Admin/giáo viên phụ trách mở chi tiết buổi học để **Báo nghỉ buổi học**, nhập lý
do, sau đó **Xếp lịch học bù**. Giữ nguyên số buổi/ID; lưu lịch sử nghỉ và đổi ngày
giờ, kiểm tra trùng giáo viên/phòng/học viên/cùng lớp tại BE. Ngày kết thúc lớp
được kéo dài nếu buổi bù muộn hơn. Lịch học có nhãn và bộ lọc **Chờ xếp học bù**;
Sale/học viên chỉ xem. Buổi đã điểm danh không chuyển lịch.

## Chuông thông báo

Giữ popup hiện tại, có trạng thái tải/lỗi/thử lại và cập nhật số chưa đọc từ BE.
Bấm mục đã đọc không trừ số lần nữa; lỗi đánh dấu đọc vẫn cho mở liên kết nội bộ
hợp lệ. Yêu cầu được tuần tự theo tài khoản/token, bỏ kết quả cũ khi đổi tài khoản.
Làm mới khi mở chuông, quay lại cửa sổ, sau nghỉ/học bù/điểm danh và mỗi 30 giây;
tài khoản khác nhận cập nhật ở lượt làm mới của họ. Không cần WebSocket/thư viện.

Nhắc điểm danh tính theo giờ Việt Nam giống BE, ẩn nút khi buổi chưa bắt đầu.
Thông báo nghỉ/học bù xuất hiện trong chuông của người liên quan và mở đúng buổi;
thông báo không còn hiệu lực được đánh dấu đã đọc, hiển thị lý do và bỏ liên kết.

## 📄 License

MIT License

