// Repository Pattern - abstracts data access layer
// Allows switching between mock, API, and database implementations easily

import type {
  Student,
  StudentDTO,
  Teacher,
  Class,
  ClassDTO,
  Session,
  Enrollment,
  Attendance,
  Payment,
  Lead,
  LeadDTO,
  LeadInteraction,
  Notification,
  AIPrediction,
  User,
  Role,
  UserInteraction,
  PaginatedResponse,
  ApiError,
} from '../../shared/types/entities';

// ============= BASE REPOSITORY INTERFACE =============
export interface IRepository<T> {
  getAll(filters?: Record<string, any>): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

export interface IPaginatedRepository<T> extends IRepository<T> {
  getAllPaginated(
    page: number,
    limit: number,
    filters?: Record<string, any>
  ): Promise<PaginatedResponse<T>>;
}

// ============= STUDENT REPOSITORY =============
export interface IStudentRepository extends IPaginatedRepository<Student> {
  getStudentsByClass(classId: string): Promise<Student[]>;
  getStudentWithEnrollments(id: string): Promise<Student | null>;
  updateScore(studentId: string, score: number): Promise<Student>;
  getStudentDebt(studentId: string): Promise<number>;
  searchByName(name: string): Promise<Student[]>;
}

// ============= TEACHER REPOSITORY =============
export interface ITeacherRepository extends IPaginatedRepository<Teacher> {
  getTeacherClasses(teacherId: string): Promise<Class[]>;
  searchByName(name: string): Promise<Teacher[]>;
  getTeacherWithDetails(id: string): Promise<Teacher | null>;
}

// ============= CLASS REPOSITORY =============
export interface IClassRepository extends IPaginatedRepository<Class> {
  getClassesByTeacher(teacherId: string): Promise<Class[]>;
  getClassWithStudents(id: string): Promise<ClassDTO | null>;
  getClassWithSessions(id: string): Promise<(Class & { sessions: Session[] }) | null>;
  getUpcomingClasses(days?: number): Promise<Class[]>;
}

// ============= SESSION REPOSITORY =============
export interface ISessionRepository extends IPaginatedRepository<Session> {
  getSessionsByClass(classId: string): Promise<Session[]>;
  getSessionsByDate(date: Date): Promise<Session[]>;
  getSessionWithAttendance(
    id: string
  ): Promise<(Session & { attendance: Attendance[] }) | null>;
  updateSessionStatus(
    sessionId: string,
    status: 'completed' | 'cancelled'
  ): Promise<Session>;
}

// ============= ENROLLMENT REPOSITORY =============
export interface IEnrollmentRepository extends IRepository<Enrollment> {
  getStudentEnrollments(studentId: string): Promise<Enrollment[]>;
  getClassEnrollments(classId: string): Promise<Enrollment[]>;
  enrollStudent(studentId: string, classId: string): Promise<Enrollment>;
  dropStudent(enrollmentId: string): Promise<boolean>;
}

// ============= ATTENDANCE REPOSITORY =============
export interface IAttendanceRepository extends IRepository<Attendance> {
  getSessionAttendance(sessionId: string): Promise<Attendance[]>;
  getStudentAttendance(studentId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  recordAttendance(sessionId: string, studentId: string, status: string): Promise<Attendance>;
  getAttendanceRate(studentId: string, classId?: string): Promise<number>;
}

// ============= PAYMENT REPOSITORY =============
export interface IPaymentRepository extends IPaginatedRepository<Payment> {
  getStudentPayments(studentId: string): Promise<Payment[]>;
  getOverduePayments(): Promise<Payment[]>;
  recordPayment(studentId: string, amount: number, note?: string): Promise<Payment>;
  updatePaymentStatus(paymentId: string, status: string): Promise<Payment>;
  getStudentTotalDebt(studentId: string): Promise<number>;
}

// ============= LEAD REPOSITORY =============
export interface ILeadRepository extends IPaginatedRepository<Lead> {
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsAssignedTo(userId: string): Promise<Lead[]>;
  getLeadWithInteractions(id: string): Promise<LeadDTO | null>;
  searchLeads(query: string): Promise<Lead[]>;
  updateLeadStatus(leadId: string, status: string): Promise<Lead>;
  addInteraction(leadId: string, interaction: Omit<LeadInteraction, 'id' | 'createdAt'>): Promise<LeadInteraction>;
}

// ============= NOTIFICATION REPOSITORY =============
export interface INotificationRepository extends IRepository<Notification> {
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<Notification>;
  markAllAsRead(userId: string): Promise<boolean>;
  sendNotification(
    userId: string,
    data: Omit<Notification, 'id' | 'is_read' | 'interaction_time'>
  ): Promise<Notification>;
  deleteNotification(notificationId: string): Promise<boolean>;
}

// ============= AI REPOSITORY =============
export interface IAIPredictionRepository extends IPaginatedRepository<AIPrediction> {
  getPredictionsByEntity(
    entityId: string,
    entityType: string
  ): Promise<AIPrediction[]>;
  getLatestPrediction(entityId: string, entityType: string): Promise<AIPrediction | null>;
  createPrediction(data: Omit<AIPrediction, 'id' | 'createdAt'>): Promise<AIPrediction>;
}

// ============= USER REPOSITORY =============
export interface IUserRepository extends IRepository<User> {
  getUserByEmail(email: string): Promise<User | null>;
  getUserWithRole(id: string): Promise<(User & { role: Role }) | null>;
  changePassword(userId: string, newPassword: string): Promise<boolean>;
  updateUserRole(userId: string, roleId: string): Promise<User>;
  recordInteraction(userId: string, content: string): Promise<UserInteraction>;
}

// ============= SERVICE FACTORY =============
export interface IRepositoryFactory {
  student: IStudentRepository;
  teacher: ITeacherRepository;
  class: IClassRepository;
  session: ISessionRepository;
  enrollment: IEnrollmentRepository;
  attendance: IAttendanceRepository;
  payment: IPaymentRepository;
  lead: ILeadRepository;
  notification: INotificationRepository;
  aiPrediction: IAIPredictionRepository;
  user: IUserRepository;
}
