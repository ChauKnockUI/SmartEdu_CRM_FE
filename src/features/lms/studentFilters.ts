export const STUDENT_STATUSES = [
  { value: 'active', label: 'Đang học', color: 'green' },
  { value: 'inactive', label: 'Tạm ngưng', color: 'default' },
  { value: 'graduated', label: 'Đã tốt nghiệp', color: 'blue' },
  { value: 'dropped', label: 'Nghỉ học', color: 'red' },
] as const;
export const studentStatusLabels: Record<string, string> = Object.fromEntries(STUDENT_STATUSES.map(item => [item.value, item.label]));
export const studentStatusColors: Record<string, string> = Object.fromEntries(STUDENT_STATUSES.map(item => [item.value, item.color]));
export const studentPageSizes = [10, 25, 50, 100];
const positiveId = (value: string | null) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : undefined;
};

export function readStudentLocation(params: URLSearchParams, viewFinance: boolean) {
  const status = params.get('status') || '';
  const debt = params.get('has_debt');
  return { search: (params.get('search') || '').trim().slice(0, 200),
    status: STUDENT_STATUSES.some(item => item.value === status) ? status : undefined,
    classId: positiveId(params.get('class_id')),
    hasDebt: viewFinance && (debt === 'true' || debt === 'false') ? debt === 'true' : undefined,
    page: positiveId(params.get('page')) || 1,
    pageSize: studentPageSizes.includes(Number(params.get('page_size'))) ? Number(params.get('page_size')) : 10 };
}
export type StudentListView = ReturnType<typeof readStudentLocation>;
export function writeStudentLocation(view: StudentListView) {
  const params = new URLSearchParams();
  if (view.search.trim()) params.set('search', view.search.trim());
  if (view.status) params.set('status', view.status);
  if (view.classId) params.set('class_id', String(view.classId));
  if (view.hasDebt !== undefined) params.set('has_debt', String(view.hasDebt));
  if (view.page > 1) params.set('page', String(view.page));
  if (view.pageSize !== 10) params.set('page_size', String(view.pageSize));
  return params;
}
export const studentQueryParams = (view: StudentListView, viewFinance: boolean) => ({
  page: view.page, limit: view.pageSize, search: view.search || undefined, status: view.status,
  class_id: view.classId, has_debt: viewFinance ? view.hasDebt : undefined,
});
export function studentExportParams(view: StudentListView, viewFinance: boolean) {
  const { page, limit, ...filters } = studentQueryParams(view, viewFinance);
  return filters;
}
export function studentClassLabel(enrollment: any) {
  const suffix = enrollment.status === 'dropped' ? 'Đã nghỉ' : enrollment.status === 'completed' ? 'Hoàn thành' : '';
  return `${enrollment.class?.name || 'Lớp chưa có tên'}${suffix ? ` (${suffix})` : ''}`;
}
