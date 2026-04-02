import { useAuth, UserRole } from '../contexts/AuthContext';

type Resource = 
  | 'leads' 
  | 'students' 
  | 'teachers'
  | 'classes' 
  | 'sessions'
  | 'payments' 
  | 'ai_models'
  | 'notifications'
  | 'settings';

type Action = 'read' | 'write' | 'delete';

// Permission matrix
const permissions: Record<Resource, Record<Action, UserRole[]>> = {
  leads: {
    read: ['admin', 'sale', 'teacher'],
    write: ['admin', 'sale'],
    delete: ['admin'],
  },
  students: {
    read: ['admin', 'sale', 'teacher', 'student'],
    write: ['admin', 'sale'],
    delete: ['admin'],
  },
  teachers: {
    read: ['admin', 'sale', 'teacher'],
    write: ['admin'],
    delete: ['admin'],
  },
  classes: {
    read: ['admin', 'sale', 'teacher', 'student'],
    write: ['admin', 'teacher'],
    delete: ['admin'],
  },
  sessions: {
    read: ['admin', 'sale', 'teacher', 'student'],
    write: ['admin', 'teacher'],
    delete: ['admin'],
  },
  payments: {
    read: ['admin', 'sale', 'student'],
    write: ['admin', 'sale'],
    delete: ['admin'],
  },
  ai_models: {
    read: ['admin', 'sale'],
    write: ['admin'],
    delete: ['admin'],
  },
  notifications: {
    read: ['admin', 'sale', 'teacher', 'student'],
    write: ['admin'],
    delete: ['admin'],
  },
  settings: {
    read: ['admin', 'sale', 'teacher'],
    write: ['admin'],
    delete: ['admin'],
  },
};

// Specific feature permissions
export interface FeaturePermissions {
  canViewLeadScore: boolean;
  canEditLeadStatus: boolean;
  canAssignLeadOwner: boolean;
  canViewLeadTimeline: boolean;
  canAddLeadInteraction: boolean;
  canViewTrialSession: boolean;
  
  canViewStudentProfile: boolean;
  canEditStudentProfile: boolean;
  canViewStudentPayments: boolean;
  canEditStudentPayments: boolean;
  canViewStudentAttendance: boolean;
  canEditAttendance: boolean;
  canViewStudentRisk: boolean;
  canChangeStudentClass: boolean;
  
  canViewClassDetails: boolean;
  canEditClassDetails: boolean;
  canManageEnrollments: boolean;
  canCreateSessions: boolean;
  canViewClassDashboard: boolean;
  
  canTakeAttendance: boolean;
  canEditSessionContent: boolean;
  canViewSessionNotes: boolean;
  
  canViewPaymentDetails: boolean;
  canEditPaymentDetails: boolean;
  canCreatePayment: boolean;
  canExportReceipt: boolean;
  
  canManageNotifications: boolean;
  canBroadcastNotifications: boolean;
}

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || 'student';

  const can = (resource: Resource, action: Action): boolean => {
    return permissions[resource][action].includes(role);
  };

  const getFeaturePermissions = (): FeaturePermissions => {
    return {
      // Lead permissions
      canViewLeadScore: ['admin', 'sale'].includes(role),
      canEditLeadStatus: ['admin', 'sale'].includes(role),
      canAssignLeadOwner: role === 'admin',
      canViewLeadTimeline: ['admin', 'sale', 'teacher'].includes(role),
      canAddLeadInteraction: ['admin', 'sale'].includes(role),
      canViewTrialSession: ['admin', 'sale', 'teacher'].includes(role),
      
      // Student permissions
      canViewStudentProfile: true, // All roles can view based on context
      canEditStudentProfile: ['admin', 'sale'].includes(role),
      canViewStudentPayments: ['admin', 'sale', 'student'].includes(role),
      canEditStudentPayments: ['admin', 'sale'].includes(role),
      canViewStudentAttendance: ['admin', 'sale', 'teacher', 'student'].includes(role),
      canEditAttendance: ['admin', 'teacher'].includes(role),
      canViewStudentRisk: ['admin', 'sale', 'teacher'].includes(role),
      canChangeStudentClass: ['admin'].includes(role),
      
      // Class permissions
      canViewClassDetails: true,
      canEditClassDetails: ['admin', 'teacher'].includes(role),
      canManageEnrollments: ['admin'].includes(role),
      canCreateSessions: ['admin'].includes(role),
      canViewClassDashboard: ['admin'].includes(role),
      
      // Session permissions
      canTakeAttendance: ['admin', 'teacher'].includes(role),
      canEditSessionContent: ['admin', 'teacher'].includes(role),
      canViewSessionNotes: true,
      
      // Payment permissions
      canViewPaymentDetails: ['admin', 'sale', 'student'].includes(role),
      canEditPaymentDetails: ['admin', 'sale'].includes(role),
      canCreatePayment: ['admin', 'sale'].includes(role),
      canExportReceipt: ['admin', 'sale'].includes(role),
      
      // Notification permissions
      canManageNotifications: ['admin'].includes(role),
      canBroadcastNotifications: ['admin'].includes(role),
    };
  };

  return {
    role,
    can,
    ...getFeaturePermissions(),
  };
}
