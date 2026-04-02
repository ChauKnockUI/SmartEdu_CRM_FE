
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

## 📄 License

MIT License
  