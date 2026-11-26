export function getStudentPermissions(role?: string) {
  return {
    manageProfile: role === 'admin',
    assignClass: role === 'admin',
    viewFinance: role === 'admin' || role === 'sale' || role === 'student',
    evaluateRisk: role === 'admin' || role === 'teacher',
    exportStudents: ['admin', 'teacher', 'sale'].includes(role || ''),
  };
}
