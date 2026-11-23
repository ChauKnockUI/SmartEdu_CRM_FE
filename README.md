
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

## Giao diện dùng chung

Tham chiếu bố cục trang quản trị Ant Design Pro (Table List/Analysis): nền trung
tính, khối dữ liệu phẳng, bo góc nhỏ, ưu tiên bảng/bộ lọc/thao tác. Màu xanh dùng
cho thao tác và điều hướng; màu trạng thái dùng cho cảnh báo nghiệp vụ. Không dùng
viền nhiều màu hoặc nền icon trang trí cho thẻ số liệu.

Theme Ant Design nằm trong `src/app/App.tsx`; bố cục và khoảng cách chung ở
`src/styles/crm.css`. `StyleProvider layer` cùng thứ tự CSS layer
`theme, base, antd, components, utilities` giúp các lớp Tailwind như margin,
padding, ẩn/hiện hoạt động đúng với component Ant Design.

Các trang dùng `crm-page` để thống nhất khoảng cách; `PageHeader` dùng chung
tiêu đề, breadcrumb và thao tác. Bộ lọc dùng `crm-filter-controls` để tự xuống
dòng trên màn hình nhỏ. `Disclosure` gom phần giải thích phụ, giữ dữ liệu và
thao tác chính dễ thấy. Thanh tiến độ lớp giữ cách tính hiện tại, hiển thị % và
số buổi còn lại; sidebar chuyển thành menu đóng/mở trên điện thoại.

`InfoHint` đưa cách tính KPI/thống kê vào nút ⓘ có thể mở bằng chuột, bàn phím
hoặc chạm. Các khối phân tích/cảnh báo cùng hàng trên dashboard Admin căn đều
chiều cao. Bộ lọc Lead, lớp, học viên và thu phí dùng chung ba cỡ: ô tìm kiếm
280px, danh sách chọn 220px, trạng thái 180px; trên điện thoại chuyển hết chiều rộng.

Các bảng và danh sách có phân trang dùng `paginationProps` trong
`src/shared/utils/pagination.ts`: cùng kích thước, nhãn “Tổng 53 phòng” nằm cạnh
cụm nút chuyển trang, giữ kiểu viền của Ant Design. Danh sách lớp dùng thẻ gọn,
đặt bộ lọc và phân trang trong cùng khung dữ liệu. Trang tải từ BE giữ
`current/pageSize/onChange`; bảng đã tải đủ
dữ liệu dùng `defaultPageSize` để đổi số dòng tại FE. Không bật đổi số dòng cho
các mục có kích thước trang cố định. Kiểu hiển thị chung ở `.crm-pagination`.

Bố cục theo công việc: Lead/học viên/thu phí dùng bảng để đối chiếu; lớp học dùng
thẻ để nhận biết lớp, lịch và sĩ số; thời khóa biểu dùng lịch; dashboard dùng chỉ
số, biểu đồ và cảnh báo. Giữ cùng màu, phông chữ và khoảng cách giữa các cách trình
bày; không thêm trang trí chỉ để làm các màn hình khác nhau.

Dashboard các vai trò giữ cùng thứ tự: bốn chỉ số, nội dung chính, cột cảnh báo.
Sale theo dõi Lead và hoạt động; giáo viên xem lịch dạy/học viên cần hỗ trợ; học
viên xem lịch/tiến độ và học phí. Chi tiết điểm danh nằm trong nút ⓘ của tỷ lệ
tham gia. Lịch dạy gom buổi hôm nay và sắp tới theo ID để tránh lặp; phân trang
danh sách dùng dữ liệu đã tải. Cảnh báo vẫn tải độc lập khi tổng quan gặp lỗi.

## Tài liệu lớp và buổi học

`MaterialPanel` dùng chung tại tab Tài liệu của lớp và trang chi tiết buổi học.
Trang lớp mặc định xem tất cả; trang buổi mặc định xem tài liệu của buổi, có thể
lọc sang tài liệu chung. Tìm kiếm và phân trang dùng danh sách đã tải, không gọi
lại API khi chuyển trang. Nút Tải lại lấy dữ liệu mới khi cần.

Hộp tải lên mặc định đúng phạm vi trang đang xem. Có thể sửa tên, đổi phạm vi,
thay file hoặc xóa có xác nhận. Hai trang đọc cùng bản ghi; thay đổi ở một nơi
được phản ánh khi mở/tải lại nơi còn lại, các panel đang mở trong cùng trang
nhận sự kiện `crm:materials-changed`. Nút tải về luôn xin link mới từ BE.
Học viên chỉ có nút tải về; quyền quản lý dựa vào phản hồi BE. Sale ẩn mục tài liệu.

Cần triển khai BE và migration `20261122120000_materials_by_session` trước FE.
FE không giữ khóa Supabase hoặc lưu signed URL vào DB/localStorage.

## 📄 License

MIT License

