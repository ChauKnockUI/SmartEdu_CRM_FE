export const CLASS_STATUSES = [
  { value: 'upcoming', label: 'Sắp mở', color: 'blue' },
  { value: 'ongoing', label: 'Đang học', color: 'green' },
  { value: 'completed', label: 'Hoàn thành', color: 'default' },
  { value: 'cancelled', label: 'Đã hủy', color: 'red' },
] as const;
export const getClassStatus = (status: string) => CLASS_STATUSES.find(item => item.value === status)
  || { value: 'unknown', label: 'Chưa xác định', color: 'default' };
export const classPageSizes = [12, 24, 48, 96];
const positiveId = (value: string | null) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : undefined;
};

export function readClassLocation(params: URLSearchParams) {
  const unassignedTeacher = params.get('unassigned_teacher') === 'true';
  const status = params.get('status') || '';
  return {
    search: (params.get('search') || '').trim().slice(0, 200),
    status: CLASS_STATUSES.some(item => item.value === status) ? status : undefined,
    courseId: positiveId(params.get('course_id')),
    teacherId: unassignedTeacher ? undefined : positiveId(params.get('teacher_id')),
    unassignedTeacher,
    page: positiveId(params.get('page')) || 1,
    pageSize: classPageSizes.includes(Number(params.get('page_size'))) ? Number(params.get('page_size')) : 12,
  };
}
export type ClassListView = ReturnType<typeof readClassLocation>;

export function writeClassLocation(view: ClassListView) {
  const params = new URLSearchParams();
  if (view.search.trim()) params.set('search', view.search.trim());
  if (view.status) params.set('status', view.status);
  if (view.courseId) params.set('course_id', String(view.courseId));
  if (view.unassignedTeacher) params.set('unassigned_teacher', 'true');
  else if (view.teacherId) params.set('teacher_id', String(view.teacherId));
  if (view.page > 1) params.set('page', String(view.page));
  if (view.pageSize !== 12) params.set('page_size', String(view.pageSize));
  return params;
}
export function classQueryParams(view: ClassListView) {
  return { page: view.page, limit: view.pageSize, search: view.search || undefined,
    status: view.status, course_id: view.courseId,
    teacher_id: view.unassignedTeacher ? undefined : view.teacherId,
    unassigned_teacher: view.unassignedTeacher || undefined };
}
