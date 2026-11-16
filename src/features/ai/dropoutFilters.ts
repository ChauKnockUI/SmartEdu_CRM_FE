import { supportOrder, type DropoutRiskView } from '../../shared/utils/dropoutRisk';

export interface DropoutRow extends DropoutRiskView {
  student_id: number; class_id: number; full_name: string; email?: string; class_name: string;
}
const id = (value: string | null) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 2147483647 ? number : undefined;
};
export const dropoutPageSizes = [10, 25, 50, 100];
export function readDropoutLocation(params: URLSearchParams) {
  const level = params.get('risk_level') || '';
  return {
    classId: id(params.get('class_id')),
    riskLevel: ['high', 'medium', 'low', 'pending', 'attention'].includes(level) ? level : undefined,
    search: params.get('search') || '', page: id(params.get('page')) || 1,
    pageSize: dropoutPageSizes.includes(Number(params.get('page_size'))) ? Number(params.get('page_size')) : 10,
    riskClassId: id(params.get('risk_class')), riskStudentId: id(params.get('risk_student')),
  };
}
export function writeDropoutLocation(view: ReturnType<typeof readDropoutLocation>) {
  const params = new URLSearchParams();
  if (view.classId) params.set('class_id', String(view.classId));
  if (view.riskLevel) params.set('risk_level', view.riskLevel);
  if (view.search) params.set('search', view.search);
  if (view.page > 1) params.set('page', String(view.page));
  if (view.pageSize !== 10) params.set('page_size', String(view.pageSize));
  if (view.riskClassId && view.riskStudentId) {
    params.set('risk_class', String(view.riskClassId)); params.set('risk_student', String(view.riskStudentId));
  }
  return params;
}
export function filterDropoutRows(rows: DropoutRow[], level?: string, search = '') {
  return rows.filter(row => !level || (level === 'pending' ? !row.risk_level
    : level === 'attention' ? row.risk_level === 'high' || row.risk_level === 'medium' : row.risk_level === level))
    .filter(row => `${row.full_name} ${row.email || ''} ${row.class_name}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')))
    .sort((a, b) => supportOrder(b) - supportOrder(a) || (b.risk_score ?? -1) - (a.risk_score ?? -1)
      || a.class_id - b.class_id || a.student_id - b.student_id);
}
