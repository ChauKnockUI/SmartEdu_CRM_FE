
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

Các thay đổi UX áp dụng theo luồng nghiệp vụ cho Admin, Sale, giảng viên và học
viên; dùng chung cách trình bày, còn dữ liệu/thao tác theo quyền hiện có.

Thanh đầu trang chỉ giữ thao tác hoạt động: mở menu, hướng dẫn, thông báo và tài
khoản. Tìm kiếm dùng tại từng danh sách; ô tìm kiếm tổng chưa có xử lý được gỡ
khỏi header. Menu tài khoản có thông tin tên/email/vai trò từ phiên đăng nhập,
không gọi thêm API; học viên có lối vào Hồ sơ của tôi. Các nút header dùng được
bằng bàn phím và có nhãn truy cập.

Người dùng, Models và Demo Insights hiện dùng dữ liệu mẫu nên được ẩn khỏi menu
và không còn được render qua router. Liên kết cũ hiển thị trạng thái chưa cung
cấp, giữ nguyên kiểm tra quyền và nút Về tổng quan. Mã màn hình mẫu được giữ để
triển khai riêng sau này; cảnh báo bỏ học đang hoạt động không thay đổi. Hướng
dẫn bốn vai trò chỉ mô tả thao tác hiện có, không giới thiệu đổi vai trò, tự động
hóa hay chức năng chưa triển khai.

`SummaryCard` dùng chung ở dashboard, khóa học và lịch cá nhân; cùng tiêu đề theo
công việc, ngày Việt Nam, kích thước thẻ và bố cục hai cột chỉ số trên điện thoại.
Mỗi vai trò giữ nội dung công việc
phù hợp, không sao chép một dashboard cho tất cả.

`detailDescriptions` trong `src/shared/utils/detailLayout.ts` thống nhất thông
tin Lead, học viên, lớp, buổi, khóa học, phòng và khoản thu: một cột trên màn
hình nhỏ, hai cột trên desktop; ghi chú/mô tả dùng `span="filled"`.
`PageState` dùng chung trạng thái đang tải/lỗi, nút Thử lại/Quay lại. Đọc lỗi
không hiển thị thành không có dữ liệu; trang không được phép truy cập giải thích
rõ thay vì tự chuyển về dashboard. Lịch cá nhân dùng trạng thái lớp từ BE và
cùng nhãn buổi nghỉ/học bù với các màn hình quản lý.

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

Tìm kiếm Lead, học viên, lớp, khóa học, phòng và giảng viên dùng `useSearchInput`:
chờ 350 ms sau khi ngừng gõ, Enter tìm ngay, xóa từ khóa bỏ lọc ngay. Chỉ đặt lại
trang khi từ khóa được áp dụng; giữ danh sách trước trong lúc chờ phản hồi mới
và bỏ phản hồi cũ. Các danh sách nhỏ đã tải đủ (tài liệu, bộ chọn, dữ liệu tài
chính hiện tại) vẫn lọc tại trình duyệt.

`services/api/listCache.ts` lưu tạm tối đa 40 kết quả danh sách trong RAM, mỗi
kết quả 30 giây, phân biệt URL/bộ lọc/trang và header tài khoản. Đổi trang đã xem
hoặc tìm lại cùng điều kiện trong thời gian này không gọi lại API. Không lưu dữ
liệu vào localStorage; đăng nhập/đăng xuất, thao tác ghi thành công qua các service
liên quan và nút Tải lại xóa cache. Phản hồi đang chạy trước khi xóa cache không
được ghi lại vào cache. Chi tiết, tải file, kiểm tra quyền và các API ngoài danh
sách cho phép vẫn gọi trực tiếp. Thay đổi của người dùng khác xuất hiện ở lần
truy vấn sau khi hết hạn hoặc bấm Tải lại, không phải cập nhật thời gian thực.
Danh sách giảng viên dùng tổng số và phân trang của BE để không bỏ sót trang sau.

Form phòng, giảng viên, khóa học và lớp dùng `shared/utils/formChanges.ts` để
so sánh giá trị hiện tại với lúc mở và xác nhận Bỏ thay đổi/Tiếp tục sửa. Giá trị
rỗng được thống nhất; lựa chọn nhiều mục so sánh theo tập giá trị, ngày/giờ của
lớp so sánh theo định dạng được lưu. Sửa rồi hoàn tác không hỏi xác nhận. Form
khóa học dùng chung ở danh sách và chi tiết; tài liệu dùng cùng thông báo xác
nhận, file mới vẫn được tính là thay đổi.

Khóa gửi được đặt trước khi kiểm tra form để chặn bấm Lưu liên tiếp. Trong lúc
lưu, khóa dữ liệu, Hủy, dấu X, Escape và đóng bằng nền. Lỗi nhập liệu hiển thị tại
trường; lỗi API giữ nguyên form và thông báo từ BE. Chỉ thành công mới đóng và
làm mới dữ liệu. Không thay đổi quyền, API hay DB; không thêm cơ chế chặn chuyển
trang hoặc khung biểu mẫu riêng.

Phòng, khóa học, giảng viên và ba màn tài chính dùng `useListLocation` để giữ
`search`, `status`, `page`, `page_size` trên URL; phòng giữ thêm `min_capacity`,
thu học phí giữ `tab` và không làm mất `invoice_id` của liên kết chi tiết. Đổi
bộ lọc về trang đầu; Back/quay lại từ chi tiết hoặc tải lại trang giữ trạng thái.
Tài chính lọc trên danh sách đã tải, không gọi API khi gõ hoặc chuyển trang.

`EnrollmentStudentSelect` dùng chung ở chi tiết lớp và Xếp lớp: chỉ tìm khi mở
hộp ghi danh, 20 học viên mỗi trang, chờ 350 ms sau khi gõ, giữ tên và ID đã chọn
khi tìm/chuyển trang. `exclude_class_id` loại ghi danh đang học/hoàn thành tại BE
trước khi tính tổng; học viên đã nghỉ và hồ sơ còn hoạt động vẫn có thể ghi danh
lại. Xếp lớp tìm lớp qua API 20 lớp/trang, giữ lớp đang chọn; kiểm tra trùng lịch
chỉ cho nhóm kết quả và học viên đã chọn, không tải toàn bộ học viên lên FE.

Chi tiết buổi học có thông tin tóm tắt và ba tab: điểm danh/nội dung, tài liệu,
nghỉ/học bù. Học viên ưu tiên tài liệu; các liên kết có `material_scope` vẫn mở
đúng tab/phạm vi. Bộ lọc điểm danh thay bảng vắng/muộn bị lặp; thống kê không đổi.
Khi đang sửa điểm danh hoặc thay lịch, khóa chuyển tab để giữ thao tác đang làm.

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

Dashboard giảng viên có bốn chỉ số, lịch dạy lọc Hôm nay/7 ngày, một khối Cảnh báo
và hàng tài liệu gần đây. Học viên cần hỗ trợ nằm trong Cảnh báo, bấm Xem mở
Drawer từ dữ liệu tổng quan đã tải, có liên kết xem toàn bộ trường hợp. Đổi bộ
lọc/phân trang lịch không gọi thêm API. Tài liệu có tên lớp, phạm vi và nút tải trực tiếp;
liên kết mở đúng lớp/buổi và bộ lọc `material_scope`. Tải file dùng link mới,
kiểm tra phản hồi rồi tải bằng Blob để lỗi không điều hướng người dùng khỏi CRM.
Bảng tài liệu trên điện thoại gộp phạm vi dưới tên file; menu ⋮ chứa chỉnh sửa/xóa.
Đóng hộp tài liệu có thay đổi chưa lưu sẽ hỏi xác nhận. Không thêm migration.

## Nhóm chăm sóc và phân công Lead

Nhóm chăm sóc Lead dùng tham số URL `care=unassigned|never_contacted|follow_up`;
liên kết `needs_care=true` cũ vẫn hoạt động. Các nhóm chỉ tính Lead đang mở;
`follow_up` là đã liên hệ nhưng quá 3 ngày chưa liên hệ lại. Bảng, phễu và báo cáo
dùng cùng bộ lọc. Thời gian hiển thị dựa trên ngày tạo hoặc lần liên hệ gần nhất.

Admin có thể chọn tối đa 50 Lead đang mở trên trang danh sách để phân công.
Phân công đơn và hàng loạt dùng chung hộp thoại, gọi API cập nhật hiện có theo
nhóm tối đa 5 yêu cầu; giữ riêng Lead lỗi để thử lại. Đổi bộ lọc/trang hoặc tải lại
sẽ bỏ lựa chọn. Sale không có thao tác phân công. Không thêm migration.

## 📄 License

MIT License

