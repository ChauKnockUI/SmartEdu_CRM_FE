// Re-export all types from entities.ts
// This file serves as the main entry point for type imports

export type {
  // Auth & Users
  Role,
  User,
  UserInteraction,
  
  // People Management
  Teacher,
  Student,
  
  // Class Management
  Class,
  Session,
  
  // Learning Tracking
  Enrollment,
  Attendance,
  
  // Finance
  Payment,
  
  // CRM
  Lead,
  LeadInteraction,
  
  // Communication
  Notification,
  
  // AI/Analytics
  AIPrediction,
  AIModel,
  
  // DTOs
  StudentDTO,
  ClassDTO,
  LeadDTO,
  
  // Generic types
  PaginatedResponse,
  ApiError,
} from './entities';
