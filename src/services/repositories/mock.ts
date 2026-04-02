// Mock Repository Implementations
// These implement the repository interfaces using mock data
// Can be easily swapped with real API implementations later

import type {
  IStudentRepository,
  ITeacherRepository,
  IClassRepository,
  ISessionRepository,
  IEnrollmentRepository,
  IAttendanceRepository,
  IPaymentRepository,
  ILeadRepository,
  INotificationRepository,
  IAIPredictionRepository,
  IUserRepository,
  IRepositoryFactory,
} from './types';
import type {
  Student,
  Teacher,
  Class,
  Session,
  Enrollment,
  Attendance,
  Payment,
  Lead,
  LeadInteraction,
  Notification,
  AIPrediction,
  User,
  ClassDTO,
  LeadDTO,
  PaginatedResponse,
} from '../../shared/types/entities';
import * as mockData from '../mock/mockData';

// ============= HELPER FUNCTION =============
function paginate<T>(
  items: T[],
  page: number,
  limit: number
): PaginatedResponse<T> {
  const total = items.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = items.slice(start, end);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ============= MOCK STUDENT REPOSITORY =============
class MockStudentRepository implements IStudentRepository {
  private students = [...mockData.mockStudents];

  async getAll() {
    return this.students;
  }

  async getById(id: string) {
    return this.students.find((s) => s.id === id) || null;
  }

  async getAllPaginated(page: number, limit: number, filters?: Record<string, any>) {
    let filtered = this.students;

    if (filters?.status) {
      filtered = filtered.filter((s) => s.status === filters.status);
    }
    if (filters?.name) {
      filtered = filtered.filter((s) =>
        s.full_name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    return paginate(filtered, page, limit);
  }

  async create(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) {
    const student: Student = {
      ...data,
      id: `student_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.students.push(student);
    return student;
  }

  async update(id: string, data: Partial<Student>) {
    const index = this.students.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Student not found');

    const updated = { ...this.students[index], ...data, updatedAt: new Date() };
    this.students[index] = updated;
    return updated;
  }

  async delete(id: string) {
    const index = this.students.findIndex((s) => s.id === id);
    if (index === -1) return false;

    this.students.splice(index, 1);
    return true;
  }

  async getStudentsByClass(classId: string) {
    // Mock: return students filtered by enrollments
    return this.students.filter((s) =>
      mockData.mockEnrollments.some(
        (e) => e.student_id === s.id && e.class_id === classId && e.status === 'active'
      )
    );
  }

  async getStudentWithEnrollments(id: string) {
    return this.getById(id);
  }

  async updateScore(studentId: string, score: number) {
    const student = this.students.find((s) => s.id === studentId);
    if (!student) throw new Error('Student not found');

    student.chum_score_current = score;
    student.updatedAt = new Date();
    return student;
  }

  async getStudentDebt(studentId: string) {
    const payments = mockData.mockPayments.filter(
      (p) => p.student_id === studentId && p.payment_status !== 'paid'
    );
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }

  async searchByName(name: string) {
    return this.students.filter((s) =>
      s.full_name.toLowerCase().includes(name.toLowerCase())
    );
  }
}

// ============= MOCK TEACHER REPOSITORY =============
class MockTeacherRepository implements ITeacherRepository {
  private teachers = [...mockData.mockTeachers];

  async getAll() {
    return this.teachers;
  }

  async getById(id: string) {
    return this.teachers.find((t) => t.id === id) || null;
  }

  async getAllPaginated(page: number, limit: number, filters?: Record<string, any>) {
    let filtered = this.teachers;

    if (filters?.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }
    if (filters?.name) {
      filtered = filtered.filter((t) =>
        t.full_name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    return paginate(filtered, page, limit);
  }

  async create(data: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>) {
    const teacher: Teacher = {
      ...data,
      id: `teacher_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.teachers.push(teacher);
    return teacher;
  }

  async update(id: string, data: Partial<Teacher>) {
    const index = this.teachers.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Teacher not found');

    const updated = { ...this.teachers[index], ...data, updatedAt: new Date() };
    this.teachers[index] = updated;
    return updated;
  }

  async delete(id: string) {
    const index = this.teachers.findIndex((t) => t.id === id);
    if (index === -1) return false;

    this.teachers.splice(index, 1);
    return true;
  }

  async getTeacherClasses(teacherId: string) {
    return mockData.mockClasses.filter((c) => c.teacher_id === teacherId);
  }

  async searchByName(name: string) {
    return this.teachers.filter((t) =>
      t.full_name.toLowerCase().includes(name.toLowerCase())
    );
  }

  async getTeacherWithDetails(id: string) {
    return this.getById(id);
  }
}

// ============= MOCK CLASS REPOSITORY =============
class MockClassRepository implements IClassRepository {
  private classes = [...mockData.mockClasses];

  async getAll() {
    return this.classes;
  }

  async getById(id: string) {
    return this.classes.find((c) => c.id === id) || null;
  }

  async getAllPaginated(page: number, limit: number, filters?: Record<string, any>) {
    let filtered = this.classes;

    if (filters?.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }
    if (filters?.teacherId) {
      filtered = filtered.filter((c) => c.teacher_id === filters.teacherId);
    }

    return paginate(filtered, page, limit);
  }

  async create(data: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>) {
    const classItem: Class = {
      ...data,
      id: `class_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.classes.push(classItem);
    return classItem;
  }

  async update(id: string, data: Partial<Class>) {
    const index = this.classes.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Class not found');

    const updated = { ...this.classes[index], ...data, updatedAt: new Date() };
    this.classes[index] = updated;
    return updated;
  }

  async delete(id: string) {
    const index = this.classes.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.classes.splice(index, 1);
    return true;
  }

  async getClassesByTeacher(teacherId: string) {
    return this.classes.filter((c) => c.teacher_id === teacherId);
  }

  async getClassWithStudents(id: string): Promise<ClassDTO | null> {
    const classItem = await this.getById(id);
    if (!classItem) return null;

    const enrollments = mockData.mockEnrollments.filter(
      (e) => e.class_id === id && e.status === 'active'
    );

    return {
      ...classItem,
      studentCount: enrollments.length,
    };
  }

  async getClassWithSessions(id: string) {
    const classItem = await this.getById(id);
    if (!classItem) return null;

    const sessions = mockData.mockSessions.filter((s) => s.class_id === id);

    return {
      ...classItem,
      sessions,
    };
  }

  async getUpcomingClasses(days = 7) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.classes.filter(
      (c) => c.start_date >= now && c.start_date <= futureDate && c.status !== 'completed'
    );
  }
}

// ============= MOCK SESSION REPOSITORY =============
class MockSessionRepository implements ISessionRepository {
  private sessions = [...mockData.mockSessions];

  async getAll() {
    return this.sessions;
  }

  async getById(id: string) {
    return this.sessions.find((s) => s.id === id) || null;
  }

  async getAllPaginated(page: number, limit: number, filters?: Record<string, any>) {
    let filtered = this.sessions;

    if (filters?.classId) {
      filtered = filtered.filter((s) => s.class_id === filters.classId);
    }
    if (filters?.status) {
      filtered = filtered.filter((s) => s.status === filters.status);
    }

    return paginate(filtered, page, limit);
  }

  async create(data: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) {
    const session: Session = {
      ...data,
      id: `session_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.push(session);
    return session;
  }

  async update(id: string, data: Partial<Session>) {
    const index = this.sessions.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Session not found');

    const updated = { ...this.sessions[index], ...data, updatedAt: new Date() };
    this.sessions[index] = updated;
    return updated;
  }

  async delete(id: string) {
    const index = this.sessions.findIndex((s) => s.id === id);
    if (index === -1) return false;

    this.sessions.splice(index, 1);
    return true;
  }

  async getSessionsByClass(classId: string) {
    return this.sessions.filter((s) => s.class_id === classId);
  }

  async getSessionsByDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    return this.sessions.filter((s) => s.date.toISOString().split('T')[0] === dateStr);
  }

  async getSessionWithAttendance(id: string) {
    const session = await this.getById(id);
    if (!session) return null;

    const attendance = mockData.mockAttendance.filter((a) => a.session_id === id);

    return {
      ...session,
      attendance,
    };
  }

  async updateSessionStatus(sessionId: string, status: 'completed' | 'cancelled') {
    return this.update(sessionId, { status });
  }
}

// ============= MOCK PAYMENT REPOSITORY =============
class MockPaymentRepository implements IPaymentRepository {
  private payments = [...mockData.mockPayments];

  async getAll() {
    return this.payments;
  }

  async getById(id: string) {
    return this.payments.find((p) => p.id === id) || null;
  }

  async getAllPaginated(page: number, limit: number, filters?: Record<string, any>) {
    let filtered = this.payments;

    if (filters?.status) {
      filtered = filtered.filter((p) => p.payment_status === filters.status);
    }
    if (filters?.studentId) {
      filtered = filtered.filter((p) => p.student_id === filters.studentId);
    }

    return paginate(filtered, page, limit);
  }

  async create(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) {
    const payment: Payment = {
      ...data,
      id: `payment_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.payments.push(payment);
    return payment;
  }

  async update(id: string, data: Partial<Payment>) {
    const index = this.payments.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Payment not found');

    const updated = { ...this.payments[index], ...data, updatedAt: new Date() };
    this.payments[index] = updated;
    return updated;
  }

  async delete(id: string) {
    const index = this.payments.findIndex((p) => p.id === id);
    if (index === -1) return false;

    this.payments.splice(index, 1);
    return true;
  }

  async getStudentPayments(studentId: string) {
    return this.payments.filter((p) => p.student_id === studentId);
  }

  async getOverduePayments() {
    return this.payments.filter((p) => p.payment_status === 'overdue');
  }

  async recordPayment(studentId: string, amount: number, note?: string) {
    return this.create({
      student_id: studentId,
      amount,
      payment_date: new Date(),
      payment_status: 'pending',
      note,
      studentName: 'Unknown', // Mock value
      type: 'tuition',
      dueDate: new Date(),
      status: 'pending',
    });
  }

  async updatePaymentStatus(paymentId: string, status: string) {
    return this.update(paymentId, { payment_status: status as any });
  }

  async getStudentTotalDebt(studentId: string) {
    const studentPayments = this.payments.filter(
      (p) => p.student_id === studentId && p.payment_status !== 'paid'
    );
    return studentPayments.reduce((sum, p) => sum + p.amount, 0);
  }
}

// ============= MOCK LEAD REPOSITORY =============
class MockLeadRepository implements ILeadRepository {
  private leads = [...mockData.mockLeads];
  private interactions = [...mockData.mockLeadInteractions];

  async getAll() {
    return this.leads;
  }

  async getById(id: string) {
    return this.leads.find((l) => l.id === id) || null;
  }

  async getAllPaginated(page: number, limit: number, filters?: Record<string, any>) {
    let filtered = this.leads;

    if (filters?.status) {
      filtered = filtered.filter((l) => l.status === filters.status);
    }
    if (filters?.assignedTo) {
      filtered = filtered.filter((l) => l.assigned_to === filters.assignedTo);
    }

    return paginate(filtered, page, limit);
  }

  async create(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) {
    const lead: Lead = {
      ...data,
      id: `lead_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.leads.push(lead);
    return lead;
  }

  async update(id: string, data: Partial<Lead>) {
    const index = this.leads.findIndex((l) => l.id === id);
    if (index === -1) throw new Error('Lead not found');

    const updated = { ...this.leads[index], ...data, updatedAt: new Date() };
    this.leads[index] = updated;
    return updated;
  }

  async delete(id: string) {
    const index = this.leads.findIndex((l) => l.id === id);
    if (index === -1) return false;

    this.leads.splice(index, 1);
    return true;
  }

  async getLeadsByStatus(status: string) {
    return this.leads.filter((l) => l.status === status);
  }

  async getLeadsAssignedTo(userId: string) {
    return this.leads.filter((l) => l.assigned_to === userId);
  }

  async getLeadWithInteractions(id: string): Promise<LeadDTO | null> {
    const lead = await this.getById(id);
    if (!lead) return null;

    const interactions = this.interactions.filter((i) => i.lead_id === id);

    return {
      ...lead,
      interactions: interactions as LeadInteraction[],
      interactionCount: interactions.length,
    };
  }

  async searchLeads(query: string) {
    const lowerQuery = query.toLowerCase();
    return this.leads.filter(
      (l) =>
        l.name.toLowerCase().includes(lowerQuery) ||
        l.email.toLowerCase().includes(lowerQuery) ||
        l.phone.includes(query)
    );
  }

  async updateLeadStatus(leadId: string, status: string) {
    return this.update(leadId, { status: status as any });
  }

  async addInteraction(_leadId: string, interaction: Omit<LeadInteraction, 'id' | 'createdAt'>) {
    const newInteraction: LeadInteraction = {
      ...interaction,
      id: `interaction_${Date.now()}`,
      createdAt: new Date(),
    };
    this.interactions.push(newInteraction);
    return newInteraction;
  }
}

// ============= REMAINING MOCK REPOSITORIES (STUBS) =============

class MockEnrollmentRepository implements IEnrollmentRepository {
  private enrollments = [...mockData.mockEnrollments];

  async getAll() {
    return this.enrollments;
  }

  async getById(id: string) {
    return this.enrollments.find((e) => e.id === id) || null;
  }

  async create(data: Omit<Enrollment, 'id'>) {
    const enrollment: Enrollment = {
      ...data,
      id: `enrollment_${Date.now()}`,
    };
    this.enrollments.push(enrollment);
    return enrollment;
  }

  async update(id: string, data: Partial<Enrollment>) {
    const index = this.enrollments.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Enrollment not found');

    this.enrollments[index] = { ...this.enrollments[index], ...data };
    return this.enrollments[index];
  }

  async delete(id: string) {
    const index = this.enrollments.findIndex((e) => e.id === id);
    return index !== -1 && this.enrollments.splice(index, 1).length > 0;
  }

  async getStudentEnrollments(studentId: string) {
    return this.enrollments.filter((e) => e.student_id === studentId);
  }

  async getClassEnrollments(classId: string) {
    return this.enrollments.filter((e) => e.class_id === classId);
  }

  async enrollStudent(studentId: string, classId: string) {
    return this.create({ student_id: studentId, class_id: classId, status: 'active', enrolledAt: new Date() });
  }

  async dropStudent(enrollmentId: string) {
    return this.delete(enrollmentId);
  }
}

class MockAttendanceRepository implements IAttendanceRepository {
  private attendance = [...mockData.mockAttendance];

  async getAll() {
    return this.attendance;
  }

  async getById(id: string) {
    return this.attendance.find((a) => a.id === id) || null;
  }

  async create(data: Omit<Attendance, 'id' | 'recordedAt'>) {
    const newAttendance: Attendance = {
      ...data,
      id: `attendance_${Date.now()}`,
      recordedAt: new Date(),
    };
    this.attendance.push(newAttendance);
    return newAttendance;
  }

  async update(id: string, data: Partial<Attendance>) {
    const index = this.attendance.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Attendance not found');

    this.attendance[index] = { ...this.attendance[index], ...data };
    return this.attendance[index];
  }

  async delete(id: string) {
    const index = this.attendance.findIndex((a) => a.id === id);
    return index !== -1 && this.attendance.splice(index, 1).length > 0;
  }

  async getSessionAttendance(sessionId: string) {
    return this.attendance.filter((a) => a.session_id === sessionId);
  }

  async getStudentAttendance(studentId: string) {
    return this.attendance.filter((a) => a.student_id === studentId);
  }

  async recordAttendance(sessionId: string, studentId: string, status: string) {
    return this.create({
      session_id: sessionId,
      student_id: studentId,
      attendance_status: status as any,
    });
  }

  async getAttendanceRate(studentId: string) {
    const studentAttendance = this.attendance.filter((a) => a.student_id === studentId);
    const present = studentAttendance.filter(
      (a) => a.attendance_status === 'present'
    ).length;
    return studentAttendance.length > 0 ? (present / studentAttendance.length) * 100 : 0;
  }
}

class MockNotificationRepository implements INotificationRepository {
  private notifications = [...mockData.mockNotifications];

  async getAll() {
    return this.notifications;
  }

  async getById(id: string) {
    return this.notifications.find((n) => n.id === id) || null;
  }

  async create(data: Omit<Notification, 'id' | 'is_read' | 'interaction_time'>) {
    const notification: Notification = {
      ...data,
      id: `notification_${Date.now()}`,
      is_read: false,
      interaction_time: new Date(),
    };
    this.notifications.push(notification);
    return notification;
  }

  async update(id: string, data: Partial<Notification>) {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index === -1) throw new Error('Notification not found');

    this.notifications[index] = { ...this.notifications[index], ...data };
    return this.notifications[index];
  }

  async delete(id: string) {
    const index = this.notifications.findIndex((n) => n.id === id);
    return index !== -1 && this.notifications.splice(index, 1).length > 0;
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    let filtered = this.notifications.filter((n) => n.user_id === userId);
    if (unreadOnly) {
      filtered = filtered.filter((n) => !n.is_read);
    }
    return filtered;
  }

  async markAsRead(notificationId: string) {
    return this.update(notificationId, { is_read: true });
  }

  async markAllAsRead(userId: string) {
    this.notifications.forEach((n) => {
      if (n.user_id === userId) {
        n.is_read = true;
      }
    });
    return true;
  }

  async sendNotification(userId: string, data: Omit<Notification, 'id' | 'is_read' | 'interaction_time'>) {
    return this.create({ ...data, user_id: userId });
  }

  async deleteNotification(notificationId: string) {
    return this.delete(notificationId);
  }
}

class MockAIPredictionRepository implements IAIPredictionRepository {
  private predictions = [...mockData.mockAIPredictions];

  async getAll() {
    return this.predictions;
  }

  async getById(id: string) {
    return this.predictions.find((p) => p.id === id) || null;
  }

  async getAllPaginated(page: number, limit: number) {
    return paginate(this.predictions, page, limit);
  }

  async create(data: Omit<AIPrediction, 'id' | 'createdAt'>) {
    const prediction: AIPrediction = {
      ...data,
      id: `prediction_${Date.now()}`,
      createdAt: new Date(),
    };
    this.predictions.push(prediction);
    return prediction;
  }

  async update(id: string, data: Partial<AIPrediction>) {
    const index = this.predictions.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Prediction not found');

    this.predictions[index] = { ...this.predictions[index], ...data };
    return this.predictions[index];
  }

  async delete(id: string) {
    const index = this.predictions.findIndex((p) => p.id === id);
    return index !== -1 && this.predictions.splice(index, 1).length > 0;
  }

  async getPredictionsByEntity(entityId: string, entityType: string) {
    return this.predictions.filter((p) => p.entity_id === entityId && p.entity_type === entityType);
  }

  async getLatestPrediction(entityId: string, entityType: string) {
    const predictions = await this.getPredictionsByEntity(entityId, entityType);
    return predictions.length > 0
      ? predictions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      : null;
  }

  async createPrediction(data: Omit<AIPrediction, 'id' | 'createdAt'>) {
    return this.create(data);
  }
}

class MockUserRepository implements IUserRepository {
  async getAll() {
    return [];
  }

  async getById(_id: string) {
    return null;
  }

  async create(_data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    return {} as User;
  }

  async update(_id: string, _data: Partial<User>) {
    return {} as User;
  }

  async delete(_id: string) {
    return false;
  }

  async getUserByEmail(_email: string) {
    return null;
  }

  async getUserWithRole(_id: string) {
    return null;
  }

  async changePassword(_userId: string, _newPassword: string) {
    return false;
  }

  async updateUserRole(_userId: string, _roleId: string) {
    return {} as User;
  }

  async recordInteraction(_userId: string, _content: string) {
    return {} as any;
  }
}

// ============= REPOSITORY FACTORY =============
export class MockRepositoryFactory implements IRepositoryFactory {
  student = new MockStudentRepository();
  teacher = new MockTeacherRepository();
  class = new MockClassRepository();
  session = new MockSessionRepository();
  enrollment = new MockEnrollmentRepository();
  attendance = new MockAttendanceRepository();
  payment = new MockPaymentRepository();
  lead = new MockLeadRepository();
  notification = new MockNotificationRepository();
  aiPrediction = new MockAIPredictionRepository();
  user = new MockUserRepository();
}

// ============= SINGLETON FACTORY INSTANCE =============
let repositoryFactory: IRepositoryFactory | null = null;

export const getRepositoryFactory = (): IRepositoryFactory => {
  if (!repositoryFactory) {
    repositoryFactory = new MockRepositoryFactory();
  }
  return repositoryFactory;
};

// By entity access (shorthand)
export const repositories = {
  get student() {
    return getRepositoryFactory().student;
  },
  get teacher() {
    return getRepositoryFactory().teacher;
  },
  get class() {
    return getRepositoryFactory().class;
  },
  get session() {
    return getRepositoryFactory().session;
  },
  get enrollment() {
    return getRepositoryFactory().enrollment;
  },
  get attendance() {
    return getRepositoryFactory().attendance;
  },
  get payment() {
    return getRepositoryFactory().payment;
  },
  get lead() {
    return getRepositoryFactory().lead;
  },
  get notification() {
    return getRepositoryFactory().notification;
  },
  get aiPrediction() {
    return getRepositoryFactory().aiPrediction;
  },
  get user() {
    return getRepositoryFactory().user;
  },
};
