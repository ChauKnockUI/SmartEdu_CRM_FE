export const ROLE_REDIRECT: Record<string, string> = {
  admin: '/dashboard',
  sale: '/crm/leads',
  teacher: '/lms/myschedule',
  student: '/lms/myschedule',
};

export const getRedirectPath = (role?: string) => {
  return ROLE_REDIRECT[role || ''] || '/';
};