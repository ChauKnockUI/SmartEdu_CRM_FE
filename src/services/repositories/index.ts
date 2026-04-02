// Repository exports - use these in your components
// This file enables easy switching between mock and real implementations

export { 
  MockRepositoryFactory,
  getRepositoryFactory,
  repositories,
} from './mock';

export type {
  IRepository,
  IPaginatedRepository,
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
