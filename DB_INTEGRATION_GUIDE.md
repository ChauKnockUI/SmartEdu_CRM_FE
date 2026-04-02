## 📋 DATABASE INTEGRATION GUIDE

Cấu trúc project đã được tổ chức để dễ dàng integrate với database thực. Dưới đây là hướng dẫn chi tiết.

---

## 🏗️ KIẾN TRÚC HIỆN TẠI

```
src/
├── services/
│   ├── api/
│   │   └── client.ts          ← API Client singleton
│   ├── database/
│   │   ├── config.ts          ← Database configuration (TODO)
│   │   └── migrations/        ← Database migrations (TODO)
│   ├── repositories/
│   │   ├── types.ts           ← Repository interfaces
│   │   ├── mock.ts            ← Mock implementations
│   │   └── index.ts           ← Exports
│   └── mock/
│       └── mockData.ts        ← Mock data aligned with DB schema
├── shared/
│   └── types/
│       └── entities.ts        ← Database entity types
```

---

## 🚀 CÁCH SỬ DỤNG TRONG COMPONENTS

### **1. Import repositories**

```typescript
// ✅ ĐỀN XUẤT REPOSITORIES - simplest way
import { repositories } from '@services/repositories';

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    // Gọi API
    repositories.student.getAll().then(setStudents);
  }, []);

  return (
    <table>
      {students.map((student) => (
        <tr key={student.id}>
          <td>{student.full_name}</td>
          <td>{student.email}</td>
        </tr>
      ))}
    </table>
  );
}
```

### **2. Sử dụng cả Paginated và Filtered queries**

```typescript
// Lấy dữ liệu có phân trang
const response = await repositories.student.getAllPaginated(
  1,              // page
  10,             // limit
  { status: 'active' }  // filters
);

console.log(response.total);      // tổng số records
console.log(response.totalPages); // tổng số trang
console.log(response.data);       // dữ liệu hiện tại
```

### **3. Các repository methods có sẵn**

#### **Student Repository**
```typescript
// Lấy tất cả học viên
await repositories.student.getAll();

// Lấy học viên theo ID
await repositories.student.getById('student-1');

// Lấy có phân trang
await repositories.student.getAllPaginated(page, limit, filters);

// Tạo học viên
await repositories.student.create({
  user_id: 'user-123',
  full_name: 'Nguyễn Văn A',
  email: 'email@example.com',
  // ...
});

// Cập nhật học viên
await repositories.student.update('student-1', {
  chum_score_current: 8.5,
  status: 'active'
});

// Xóa học viên
await repositories.student.delete('student-1');

// Methods riêng cho Student
await repositories.student.getStudentsByClass('class-1');
await repositories.student.getStudentDebt('student-1');
await repositories.student.searchByName('Nguyễn');
await repositories.student.updateScore('student-1', 9.0);
```

#### **Class Repository**
```typescript
await repositories.class.getClassesByTeacher('teacher-1');
await repositories.class.getClassWithStudents('class-1'); // Trả về DTO với studentCount
await repositories.class.getClassWithSessions('class-1'); // Trả về class + sessions
await repositories.class.getUpcomingClasses(7); // Lớp sắp tới trong 7 ngày
```

#### **Lead Repository**
```typescript
await repositories.lead.getLeadsByStatus('qualified');
await repositories.lead.getLeadsAssignedTo('user-123');
await repositories.lead.getLeadWithInteractions('lead-1'); // Trả về DTO + interactions
await repositories.lead.searchLeads('nguyễn');
await repositories.lead.addInteraction('lead-1', {
  type: 'call',
  content: 'Gọi tư vấn',
  created_by: 'user-123'
});
```

---

## 🔄 CHUYỂN ĐỔI TỪ MOCK ĐẾN API/DATABASE

### **Bước 1: Implement API Repository**

Tạo file `src/services/repositories/api.ts`:

```typescript
import { ApiClient, getApiClient } from '../api/client';
import type { IStudentRepository, ... } from './types';
import type { Student, StudentDTO, PaginatedResponse } from '@shared/types/entities';

class ApiStudentRepository implements IStudentRepository {
  private api: ApiClient;

  constructor() {
    this.api = getApiClient();
  }

  async getAll(): Promise<Student[]> {
    const response = await this.api.get<Student[]>('/students');
    if (response.error) throw new Error(response.error.message);
    return response.data || [];
  }

  async getById(id: string): Promise<Student | null> {
    const response = await this.api.get<Student>(`/students/${id}`);
    if (response.error) return null;
    return response.data || null;
  }

  async getAllPaginated(
    page: number,
    limit: number,
    filters?: Record<string, any>
  ): Promise<PaginatedResponse<Student>> {
    const response = await this.api.get<PaginatedResponse<Student>>(
      '/students',
      {
        params: { page, limit, ...filters }
      }
    );
    if (response.error) throw new Error(response.error.message);
    return response.data!;
  }

  async create(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    const response = await this.api.post<Student>('/students', data);
    if (response.error) throw new Error(response.error.message);
    return response.data!;
  }

  async update(id: string, data: Partial<Student>): Promise<Student> {
    const response = await this.api.put<Student>(`/students/${id}`, data);
    if (response.error) throw new Error(response.error.message);
    return response.data!;
  }

  async delete(id: string): Promise<boolean> {
    const response = await this.api.delete(`/students/${id}`);
    return response.status === 200;
  }

  // Implement other methods similarly...
  async getStudentsByClass(classId: string): Promise<Student[]> {
    const response = await this.api.get<Student[]>(`/classes/${classId}/students`);
    if (response.error) return [];
    return response.data || [];
  }

  // ... other methods
}

export class ApiRepositoryFactory implements IRepositoryFactory {
  student = new ApiStudentRepository();
  teacher = new ApiTeacherRepository();
  // ... other repositories
}
```

### **Bước 2: Environment Configuration**

Tạo `.env.local`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_KEY=your-api-key-here
VITE_ENV_MODE=development
```

### **Bước 3: Switch Implementation**

Chỉnh sửa `src/services/repositories/index.ts`:

```typescript
import type { IRepositoryFactory } from './types';
import { MockRepositoryFactory } from './mock';
import { ApiRepositoryFactory } from './api'; // Import when ready

// Constructor function to choose implementation
function createRepositoryFactory(): IRepositoryFactory {
  const env = import.meta.env.MODE;
  
  // Use mock for development, API for production
  if (env === 'development' && !import.meta.env.VITE_USE_API) {
    console.log('📦 Using Mock repositories');
    return new MockRepositoryFactory();
  }
  
  console.log('🌐 Using API repositories');
  return new ApiRepositoryFactory();
}

let repositoryFactory: IRepositoryFactory | null = null;

export const getRepositoryFactory = (): IRepositoryFactory => {
  if (!repositoryFactory) {
    repositoryFactory = createRepositoryFactory();
  }
  return repositoryFactory;
};

export const repositories = {
  get student() { return getRepositoryFactory().student; },
  get teacher() { return getRepositoryFactory().teacher; },
  // ...
};
```

---

## 💾 SETUP DATABASE CONNECTION

### **Bước 1: Install Database Driver**

```bash
# Nếu dùng MongoDB
npm install mongodb mongoose

# Nếu dùng PostgreSQL
npm install pg

# Nếu dùng MySQL
npm install mysql2
```

### **Bước 2: Tạo Database Config**

File `src/services/database/config.ts`:

```typescript
// Example cho PostgreSQL
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

export async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
```

### **Bước 3: Backend API Structure** (Tùy chọn - nếu xây dựng Node/Express backend)

```
backend/
├── src/
│   ├── routes/
│   │   ├── students.ts
│   │   ├── teachers.ts
│   │   ├── classes.ts
│   │   └── ...
│   ├── controllers/
│   │   ├── StudentController.ts
│   │   ├── TeacherController.ts
│   │   └── ...
│   ├── services/
│   │   ├── StudentService.ts
│   │   ├── TeacherService.ts
│   │   └── ...
│   ├── models/
│   │   ├── Student.ts
│   │   ├── Teacher.ts
│   │   └── ...
│   ├── database/
│   │   ├── config.ts
│   │   └── migrations/
│   └── app.ts
```

---

## 🧪 TESTING

### **Unit Test Example**

```typescript
import { describe, it, expect } from 'vitest';
import { repositories } from '@services/repositories';

describe('StudentRepository', () => {
  it('should fetch all students', async () => {
    const students = await repositories.student.getAll();
    expect(students).toBeInstanceOf(Array);
    expect(students.length).toBeGreaterThan(0);
  });

  it('should fetch student by ID', async () => {
    const student = await repositories.student.getById('student-1');
    expect(student).toBeDefined();
    expect(student?.id).toBe('student-1');
  });

  it('should create a student', async () => {
    const newStudent = await repositories.student.create({
      user_id: 'user-123',
      full_name: 'Test Student',
      email: 'test@example.com',
      phone: '0123456789',
      status: 'active',
      chum_score_current: 8.0,
    });

    expect(newStudent.id).toBeDefined();
    expect(newStudent.full_name).toBe('Test Student');
  });
});
```

---

## 📝 MIGRATION CHECKLIST

- [ ] Tạo API repository implementations
- [ ] Setup database connection
- [ ] Implement backend API endpoints
- [ ] Update `.env` with database credentials
- [ ] Test API endpoints
- [ ] Switch `getRepositoryFactory()` to use API in production
- [ ] Update components to use new repository methods
- [ ] Write unit tests
- [ ] Performance testing with real data

---

## 📚 THAM KHẢO

- **ERD Database**: Xem hình ảnh ERD diagram đã được cung cấp
- **Entity Types**: `src/shared/types/entities.ts`
- **Repository Interfaces**: `src/services/repositories/types.ts`
- **Mock Implementation**: `src/services/repositories/mock.ts`
- **API Client**: `src/services/api/client.ts`

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Không hard-code API URLs**: Luôn dùng env variables
2. **Error Handling**: Implement proper error handling trong API repositories
3. **Authentication**: Thêm JWT/Auth headers vào API requests
4. **Caching**: Xem xét implement caching layer (React Query, SWR)
5. **Rate Limiting**: Backend nên implement rate limiting
6. **Validation**: Validate dữ liệu trước khi gửi API
7. **Database Transactions**: Dùng transactions cho operations liên quan

---

**Good to go! 🎉 Cấu trúc đã sẵn sàng cho database integration.**
