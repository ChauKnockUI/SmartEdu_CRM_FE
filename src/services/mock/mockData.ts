// Mock data for the application
// Aligned with database schema defined in entities.ts

import type {
  User,
  Notification,
  Lead,
  LeadInteraction,
  Student,
  Teacher,
  Class,
  Session,
  Enrollment,
  Attendance,
  Payment,
  AIPrediction,
  AIModel,
  Role,
  UserInteraction,
} from '../../shared/types/entities';

// ============= ROLES =============
export const mockRoles: Role[] = [
  {
    id: 'role-admin',
    name: 'admin',
    description: 'Quản trị viên hệ thống',
    permissions: ['*'],
    createdAt: new Date(2026, 0, 1),
  },
  {
    id: 'role-teacher',
    name: 'teacher',
    description: 'Giáo viên',
    permissions: ['view:classes', 'manage:sessions', 'view:students'],
    createdAt: new Date(2026, 0, 1),
  },
  {
    id: 'role-student',
    name: 'student',
    description: 'Học viên',
    permissions: ['view:own_courses', 'view:own_attendance'],
    createdAt: new Date(2026, 0, 1),
  },
];

// ============= USERS =============
export const mockUsers: User[] = [
  {
    id: 'user-admin',
    email: 'admin@example.com',
    password_hash: 'hashed_password_123', // Never use plain passwords in real app
    status: 'active',
    role_id: 'role-admin',
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
  },
  {
    id: 'user-teacher-1',
    email: 'teacherj@example.com',
    password_hash: 'hashed_password_456',
    status: 'active',
    role_id: 'role-teacher',
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
  },
  {
    id: 'user-student-1',
    email: 'nguyenvang@example.com',
    password_hash: 'hashed_password_789',
    status: 'active',
    role_id: 'role-student',
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
  },
];

// ============= TEACHERS =============
export const mockTeachers: Teacher[] = [
  {
    id: 'teacher-1',
    user_id: 'user-teacher-1',
    full_name: 'Th.S Nguyễn Văn J',
    email: 'teacherj@example.com',
    phone: '0932109876',
    status: 'active',
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    name: 'Th.S Nguyễn Văn J',
    subjects: ['IELTS', 'Reading'],
  } as any,
  {
    id: 'teacher-2',
    user_id: 'user-teacher-2',
    full_name: 'Th.S Trần Thị K',
    email: 'teacherk@example.com',
    phone: '0921098765',
    status: 'active',
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    name: 'Th.S Trần Thị K',
    subjects: ['TOEIC', 'Listening'],
  } as any,
];

// ============= TEACHER SCHEDULES =============
export const teacherSchedules: Record<string, any[]> = {
  'teacher-1': [
    { date: new Date(2026, 2, 29), time: '09:00', className: 'IELTS 6.5' },
    { date: new Date(2026, 3, 1), time: '14:00', className: 'IELTS 6.5' },
    { date: new Date(2026, 3, 2), time: '09:00', className: 'IELTS 6.5' },
  ],
  'teacher-2': [
    { date: new Date(2026, 2, 29), time: '18:00', className: 'TOEIC 750+' },
    { date: new Date(2026, 3, 3), time: '18:00', className: 'TOEIC 750+' },
  ],
};

// ============= STUDENTS =============
export const mockStudents: Student[] = [
  {
    id: 'student-1',
    user_id: 'user-student-1',
    full_name: 'Nguyễn Văn G',
    phone: '0965432109',
    email: 'nguyenvang@example.com',
    status: 'active',
    chum_score_current: 8.5,
    createdAt: new Date(2026, 1, 1),
    updatedAt: new Date(2026, 2, 29),
    enrolledAt: new Date(2026, 2, 1),
    totalDebt: 0,
  } as any,
  {
    id: 'student-2',
    user_id: 'user-student-2',
    full_name: 'Trần Thị H',
    phone: '0954321098',
    email: 'tranthih@example.com',
    status: 'active',
    chum_score_current: 7.2,
    createdAt: new Date(2026, 1, 15),
    updatedAt: new Date(2026, 2, 25),
    enrolledAt: new Date(2026, 2, 1),
    totalDebt: 2500000,
  } as any,
  {
    id: 'student-3',
    user_id: 'user-student-3',
    full_name: 'Lê Văn I',
    phone: '0943210987',
    email: 'levani@example.com',
    status: 'active',
    chum_score_current: 9.0,
    createdAt: new Date(2026, 0, 10),
    updatedAt: new Date(2026, 2, 28),
    enrolledAt: new Date(2026, 2, 5),
    totalDebt: 0,
  } as any,
];

// ============= CLASSES =============
export const mockClasses: Class[] = [
  {
    id: 'class-1',
    name: 'IELTS 6.5 - Morning',
    teacher_id: 'teacher-1',
    status: 'active',
    start_date: new Date(2026, 2, 1),
    end_date: new Date(2026, 4, 31),
    createdAt: new Date(2026, 1, 1),
    updatedAt: new Date(2026, 2, 29),
    teacherName: 'Lê Văn Thắng',
    studentCount: 2,
    schedule: 'Thứ 2 - 4 - 6: 09:00-11:00',
    startDate: new Date(2026, 2, 1),
  } as any,
  {
    id: 'class-2',
    name: 'TOEIC 750+ - Evening',
    teacher_id: 'teacher-1',
    status: 'active',
    start_date: new Date(2026, 2, 5),
    end_date: new Date(2026, 5, 5),
    createdAt: new Date(2026, 1, 5),
    updatedAt: new Date(2026, 2, 29),
    teacherName: 'Lê Văn Thắng',
    studentCount: 2,
    schedule: 'Thứ 3 - 5 - 7: 18:00-20:00',
    startDate: new Date(2026, 2, 5),
  } as any,
  {
    id: 'class-3',
    name: 'IELTS 7.0 - Weekend',
    teacher_id: 'teacher-2',
    status: 'upcoming',
    start_date: new Date(2026, 3, 1),
    end_date: new Date(2026, 5, 30),
    createdAt: new Date(2026, 2, 1),
    updatedAt: new Date(2026, 2, 29),
    teacherName: 'Trần Văn Anh',
    studentCount: 0,
    schedule: 'Thứ 7 - 8: 13:00-15:00',
    startDate: new Date(2026, 3, 1),
  } as any,
];

// ============= SESSIONS =============
export const mockSessions: Session[] = [
  {
    id: 'session-1',
    class_id: 'class-1',
    date: new Date(2026, 2, 29),
    start_time: '09:00',
    end_time: '11:00',
    topic: 'Reading comprehension - Academic Module',
    status: 'scheduled',
    createdAt: new Date(2026, 2, 28),
    updatedAt: new Date(2026, 2, 28),
  },
  {
    id: 'session-2',
    class_id: 'class-2',
    date: new Date(2026, 2, 29),
    start_time: '18:00',
    end_time: '20:00',
    topic: 'Reading and Listening sections',
    status: 'scheduled',
    createdAt: new Date(2026, 2, 28),
    updatedAt: new Date(2026, 2, 28),
  },
  {
    id: 'session-3',
    class_id: 'class-1',
    date: new Date(2026, 3, 2),
    start_time: '09:00',
    end_time: '11:00',
    topic: 'Writing Task 1 & 2',
    status: 'scheduled',
    createdAt: new Date(2026, 2, 28),
    updatedAt: new Date(2026, 2, 28),
  },
];

// ============= ENROLLMENTS =============
export const mockEnrollments: Enrollment[] = [
  {
    id: 'enrollment-1',
    student_id: 'student-1',
    class_id: 'class-1',
    status: 'active',
    enrolledAt: new Date(2026, 2, 1),
  },
  {
    id: 'enrollment-2',
    student_id: 'student-2',
    class_id: 'class-1',
    status: 'active',
    enrolledAt: new Date(2026, 2, 1),
  },
  {
    id: 'enrollment-3',
    student_id: 'student-3',
    class_id: 'class-2',
    status: 'active',
    enrolledAt: new Date(2026, 2, 5),
  },
  {
    id: 'enrollment-4',
    student_id: 'student-1',
    class_id: 'class-2',
    status: 'active',
    enrolledAt: new Date(2026, 2, 5),
  },
];

// ============= ATTENDANCE =============
export const mockAttendance: Attendance[] = [
  {
    id: 'attendance-1',
    session_id: 'session-1',
    student_id: 'student-1',
    attendance_status: 'present',
    recordedAt: new Date(2026, 2, 29, 11, 30),
  },
  {
    id: 'attendance-2',
    session_id: 'session-1',
    student_id: 'student-2',
    attendance_status: 'absent',
    recordedAt: new Date(2026, 2, 29, 11, 30),
  },
  {
    id: 'attendance-3',
    session_id: 'session-2',
    student_id: 'student-3',
    attendance_status: 'late',
    recordedAt: new Date(2026, 2, 29, 20, 30),
  },
];

// ============= PAYMENTS =============
export const mockPayments: Payment[] = [
  {
    id: 'payment-1',
    student_id: 'student-2',
    amount: 2500000,
    payment_date: new Date(2026, 2, 25),
    payment_status: 'overdue',
    note: 'Học phí tháng 3',
    createdAt: new Date(2026, 2, 20),
    updatedAt: new Date(2026, 2, 25),
    dueDate: new Date(2026, 2, 25),
    paidDate: undefined,
    studentName: mockStudents.find(s => s.id === 'student-2')?.full_name || 'Unknown',
    type: 'tuition',
    status: 'overdue',
  },
  {
    id: 'payment-2',
    student_id: 'student-1',
    amount: 5000000,
    payment_date: new Date(2026, 2, 28),
    payment_status: 'paid',
    note: 'Học phí tháng 3',
    createdAt: new Date(2026, 2, 1),
    updatedAt: new Date(2026, 2, 28),
    dueDate: new Date(2026, 2, 28),
    paidDate: new Date(2026, 2, 28),
    studentName: mockStudents.find(s => s.id === 'student-1')?.full_name || 'Unknown',
    type: 'tuition',
    status: 'paid',
  },
  {
    id: 'payment-3',
    student_id: 'student-3',
    amount: 4500000,
    payment_date: new Date(2026, 3, 10),
    payment_status: 'pending',
    note: 'Học phí tháng 4',
    createdAt: new Date(2026, 2, 15),
    updatedAt: new Date(2026, 2, 15),
    dueDate: new Date(2026, 3, 10),
    paidDate: undefined,
    studentName: mockStudents.find(s => s.id === 'student-3')?.full_name || 'Unknown',
    type: 'tuition',
    status: 'pending',
  },
];

// ============= NOTIFICATIONS =============
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    user_id: 'user-admin',
    title: 'Lead mới từ Facebook',
    content: 'Nguyễn Thị B vừa đăng ký tư vấn khóa học IELTS',
    type: 'info',
    is_read: false,
    interaction_time: new Date(2026, 2, 29, 10, 30),
    link: '/crm/leads/lead-5',
  },
  {
    id: 'notif-2',
    user_id: 'user-admin',
    title: 'Cảnh báo học phí',
    content: '5 học viên có học phí quá hạn cần thu',
    type: 'warning',
    is_read: false,
    interaction_time: new Date(2026, 2, 29, 9, 0),
    link: '/finance/payments',
  },
  {
    id: 'notif-3',
    user_id: 'user-teacher-1',
    title: 'Buổi học sắp bắt đầu',
    content: 'Lớp IELTS 6.5 - Buổi 15 bắt đầu lúc 14:00',
    type: 'info',
    is_read: true,
    interaction_time: new Date(2026, 2, 29, 8, 0),
    link: '/lms/classes/class-1',
  },
];

// ============= LEADS & LEAD INTERACTIONS (CRM) =============
export const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Trần Văn C',
    phone: '0912345678',
    email: 'tranvanc@example.com',
    source: 'Facebook Ads',
    status: 'new',
    score: 85,
    assigned_to: 'user-admin',
    createdAt: new Date(2026, 2, 29),
    updatedAt: new Date(2026, 2, 29),
  },
  {
    id: 'lead-2',
    name: 'Lê Thị D',
    phone: '0987654321',
    email: 'lethid@example.com',
    source: 'Website',
    status: 'contacted',
    score: 72,
    assigned_to: 'user-admin',
    lastContactedAt: new Date(2026, 2, 28),
    createdAt: new Date(2026, 2, 27),
    updatedAt: new Date(2026, 2, 28),
  },
  {
    id: 'lead-3',
    name: 'Phạm Văn E',
    phone: '0901234567',
    email: 'phamvane@example.com',
    source: 'Google Ads',
    status: 'qualified',
    score: 90,
    assigned_to: 'user-admin',
    lastContactedAt: new Date(2026, 2, 29),
    createdAt: new Date(2026, 2, 25),
    updatedAt: new Date(2026, 2, 29),
  },
  {
    id: 'lead-4',
    name: 'Hoàng Thị F',
    phone: '0976543210',
    email: 'hoangthif@example.com',
    source: 'Referral',
    status: 'converted',
    score: 95,
    assigned_to: 'user-admin',
    lastContactedAt: new Date(2026, 2, 28),
    createdAt: new Date(2026, 2, 20),
    updatedAt: new Date(2026, 2, 28),
  },
];

export const mockLeadInteractions: LeadInteraction[] = [
  {
    id: 'interaction-1',
    lead_id: 'lead-1',
    type: 'call',
    content: 'Cuộc gọi tư vấn về khóa IELTS 6.5',
    created_by: 'user-admin',
    createdAt: new Date(2026, 2, 29, 10, 0),
  },
  {
    id: 'interaction-2',
    lead_id: 'lead-2',
    type: 'email',
    content: 'Gửi tài liệu giới thiệu khóa học',
    created_by: 'user-admin',
    createdAt: new Date(2026, 2, 28, 15, 30),
  },
  {
    id: 'interaction-3',
    lead_id: 'lead-3',
    type: 'meeting',
    content: 'Gặp trực tiếp tại văn phòng',
    created_by: 'user-admin',
    createdAt: new Date(2026, 2, 29, 14, 0),
  },
];

// ============= AI PREDICTIONS =============
export const mockAIPredictions: AIPrediction[] = [
  {
    id: 'pred-1',
    model_id: 'model-lead-scoring',
    entity_id: 'lead-1',
    entity_type: 'lead',
    score_vital: 85,
    prediction_type: 'lead_scoring',
    confidence: 0.87,
    createdAt: new Date(2026, 2, 29),
  },
  {
    id: 'pred-2',
    model_id: 'model-churn',
    entity_id: 'student-2',
    entity_type: 'student',
    score_vital: 65,
    prediction_type: 'churn_prediction',
    confidence: 0.82,
    createdAt: new Date(2026, 2, 29),
  },
  {
    id: 'pred-3',
    model_id: 'model-lead-scoring',
    entity_id: 'lead-3',
    entity_type: 'lead',
    score_vital: 90,
    prediction_type: 'lead_scoring',
    confidence: 0.91,
    createdAt: new Date(2026, 2, 29),
  },
];

// ============= AI MODELS =============
export const mockAIModels: AIModel[] = [
  {
    id: 'model-lead-scoring',
    name: 'Lead Scoring Model v2',
    type: 'lead_scoring',
    version: '2.1.0',
    accuracy: 0.92,
    status: 'active',
    lastTrainedAt: new Date(2026, 2, 28),
    description: 'Model dùng để đánh giá chất lượng lead',
  },
  {
    id: 'model-churn',
    name: 'Churn Prediction Model v1',
    type: 'churn_prediction',
    version: '1.5.0',
    accuracy: 0.88,
    status: 'active',
    lastTrainedAt: new Date(2026, 2, 27),
    description: 'Model dùng để dự đoán rủi ro churn của học viên',
  },
  {
    id: 'model-lead-scoring-v1',
    name: 'Lead Scoring Model v1',
    type: 'lead_scoring',
    version: '1.0.0',
    accuracy: 0.85,
    status: 'inactive',
    lastTrainedAt: new Date(2026, 2, 15),
    description: 'Model phiên bản cũ - không còn sử dụng',
  },
];

// ============= USER INTERACTIONS =============
export const mockUserInteractions: UserInteraction[] = [
  {
    id: 'user-interaction-1',
    user_id: 'user-admin',
    content: 'Viewed lead list',
    interaction_time: new Date(2026, 2, 29, 10, 0),
  },
  {
    id: 'user-interaction-2',
    user_id: 'user-teacher-1',
    content: 'Recorded attendance for session-1',
    interaction_time: new Date(2026, 2, 29, 11, 30),
  },
];

// ============= HELPER FUNCTIONS =============
/**
 * Lấy tên lớp từ class_id
 */
export function getClassNameById(classId: string): string {
  const classItem = mockClasses.find(c => c.id === classId);
  return classItem?.name || 'Unknown Class';
}

export function getSessionsWithClassName(): (Session & { class_name: string })[] {
  return mockSessions.map(session => ({
    ...session,
    class_name: getClassNameById(session.class_id),
  }));
}
