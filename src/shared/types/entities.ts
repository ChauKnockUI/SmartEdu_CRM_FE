// Database entities - aligned with ERD schema

// ============= AUTH & USERS =============
export interface Role {
  id: string;
  name: 'admin' | 'teacher' | 'student' | 'manager' | 'sales';
  description: string;
  permissions: string[];
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  status: 'active' | 'inactive' | 'suspended';
  role_id: string;
  role?: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInteraction {
  id: string;
  user_id: string;
  content: string;
  interaction_time: Date;
}

// ============= TEACHER MANAGEMENT =============
export interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  user?: User;
  createdAt: Date;
  updatedAt: Date;
}

// ============= STUDENT MANAGEMENT =============
export interface Student {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'graduated';
  chum_score_current: number; // Điểm chuyên cần hiện tại
  user?: User;
  enrollments?: Enrollment[];
  attendance?: Attendance[];
  payments?: Payment[];
  createdAt: Date;
  updatedAt: Date;
}

// ============= CLASS MANAGEMENT =============
export interface Class {
  id: string;
  name: string;
  course_id: string;
  teacher_id: string;
  status: 'active' | 'completed' | 'upcoming';
  start_date: Date;
  end_date?: Date;
  teacher?: Teacher;
  course?: Course;
  sessions?: Session[];
  enrollments?: Enrollment[];
  createdAt: Date;
  updatedAt: Date;
}

// ============= SESSION MANAGEMENT =============
export interface Session {
  id: string;
  class_id: string;
  date: Date;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  topic: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  class?: Class;
  attendance?: Attendance[];
  createdAt: Date;
  updatedAt: Date;
}

// ============= ENROLLMENT =============
export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  status: 'active' | 'dropped' | 'completed';
  student?: Student;
  class?: Class;
  enrolledAt: Date;
  completedAt?: Date;
}

// ============= ATTENDANCE =============
export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  attendance_status: 'present' | 'absent' | 'late' | 'excused';
  session?: Session;
  student?: Student;
  recordedAt: Date;
}

// ============= PAYMENT =============
export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  payment_date: Date;
  payment_status: 'pending' | 'paid' | 'overdue';
  note?: string;
  student?: Student;
  createdAt: Date;
  updatedAt: Date;
  // UI-specific properties
  studentName: string;
  type: 'tuition' | 'registration' | 'material';
  dueDate: Date;
  paidDate?: Date;
  status: 'pending' | 'paid' | 'overdue';
}

// ============= CRM - LEADS =============
export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string; // 'website', 'referral', 'social', etc
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  score: number;
  assigned_to: string; // user_id
  lastContactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  interactions?: LeadInteraction[];
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  content: string;
  created_by: string; // user_id
  createdAt: Date;
}

// ============= NOTIFICATIONS =============
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  interaction_time: Date; // created or read time
  link?: string;
}

// ============= AI =============
export interface AIPrediction {
  id: string;
  model_id: string;
  entity_id: string;
  entity_type: 'lead' | 'student' | 'class';
  score_vital: number; // 0-100
  prediction_type: string; // 'churn', 'lead_scoring', etc
  confidence: number; // 0-1
  createdAt: Date;
}

export interface AIModel {
  id: string;
  name: string;
  type: 'lead_scoring' | 'churn_prediction';
  version: string;
  accuracy: number; // 0-1
  status: 'active' | 'inactive';
  lastTrainedAt: Date;
  description?: string;
}

// ============= DTO Types (For API responses) =============
export interface StudentDTO extends Omit<Student, 'password_hash'> {
  enrollmentCount?: number;
  totalDebt?: number;
  attendanceRate?: number;
}

export interface ClassDTO extends Class {
  studentCount?: number;
  sessionCount?: number;
}

export interface LeadDTO extends Lead {
  assignedToName?: string;
  interactionCount?: number;
}

// ============= Paginated Response =============
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============= API Error Response =============
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  total_sessions: number;
  duration_weeks: number;
  fee: number;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;

  // relation
  classes?: Class[];
}

export interface CourseDTO extends Course {
  classCount?: number;
}
