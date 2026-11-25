import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Pagination, Select, Spin } from 'antd';
import { useAuth } from '../../shared/contexts/AuthContext';
import { studentService } from '../../services/api/student.service';
import { paginationProps } from '../../shared/utils/pagination';

export interface EnrollmentStudent { id: number; full_name: string; email?: string; phone?: string }
type Conflict = { has_conflict: boolean; is_already_enrolled?: boolean; reason?: string };
interface Props {
  classId: number; active: boolean; value: number[]; disabled?: boolean;
  onChange: (ids: number[], students: EnrollmentStudent[]) => void;
  onCandidates?: (students: EnrollmentStudent[]) => void;
  seedStudents?: EnrollmentStudent[]; conflicts?: Record<number, Conflict>; onlyFree?: boolean;
}

export function EnrollmentStudentSelect(props: Props) {
  const { user, token } = useAuth();
  return <StudentSelect key={JSON.stringify([user?.id, user?.role, token, props.classId])} {...props} />;
}

function StudentSelect({ classId, active, value, onChange, onCandidates, seedStudents = [], disabled,
  conflicts, onlyFree }: Props) {
  const [rows, setRows] = useState<EnrollmentStudent[]>([]), [selected, setSelected] = useState<EnrollmentStudent[]>([]);
  const [draft, setDraft] = useState(''), [search, setSearch] = useState('');
  const [page, setPage] = useState(1), [total, setTotal] = useState(0), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const valueKey = value.join(','), seedKey = seedStudents.map(item => item.id).join(',');
  const notify = useRef(onCandidates); notify.current = onCandidates;
  const known = new Map([...selected, ...seedStudents.filter(item => value.includes(item.id)), ...rows].map(item => [item.id, item]));
  const chosen = value.map(id => known.get(id)).filter((item): item is EnrollmentStudent => !!item);
  useEffect(() => {
    const next = draft.trim().slice(0, 200);
    if (next === search) return;
    const timer = setTimeout(() => { setSearch(next); setPage(1); }, next ? 350 : 0);
    return () => clearTimeout(timer);
  }, [draft, search]);
  useEffect(() => { setSelected(previous => previous.filter(item => value.includes(item.id))); }, [valueKey]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    studentService.getAll({ page, limit: 20, status: 'active', exclude_class_id: classId, search: search || undefined }, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        const count = result.pagination?.total || 0, last = Math.max(1, Math.ceil(count / 20));
        if (page > last) { setPage(last); return; }
        setRows(result.data || []); setTotal(count);
      }).catch(err => {
        if (!controller.signal.aborted) { setRows([]); setTotal(0); setError(err.message || 'Không tìm được học viên.'); }
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [active, classId, page, search, revision]);
  useEffect(() => {
    if (active) notify.current?.([...new Map([...rows, ...chosen].map(item => [item.id, item])).values()]);
  }, [active, rows, selected, valueKey, seedKey]);

  return <>
    {error && <Alert className="mb-2" type="error" showIcon message={error}
      action={<Button size="small" onClick={() => setRevision(n => n + 1)}>Thử lại</Button>} />}
    <Select mode="multiple" className="w-full" aria-label="Tìm học viên để xếp lớp" placeholder="Tên, email hoặc số điện thoại"
      showSearch filterOption={false} searchValue={draft} onSearch={setDraft} autoClearSearchValue={false}
      value={value} disabled={disabled} loading={loading} maxTagCount="responsive"
      onChange={ids => {
        const records = ids.map(id => known.get(id)).filter((item): item is EnrollmentStudent => !!item);
        setSelected(records); onChange(ids, records);
      }}
      labelRender={option => {
        const item = known.get(Number(option.value));
        return item ? `${item.full_name} (${item.email || item.phone || '#' + item.id})` : option.label;
      }}
      options={rows
        .filter(item => !onlyFree || conflicts?.[item.id]?.has_conflict === false && !conflicts[item.id].reason)
        .map(item => {
          const state = conflicts?.[item.id];
          const status = !conflicts ? '' : typeof state?.has_conflict !== 'boolean' ? ' · Chưa kiểm tra'
            : state.reason ? ` · ${state.reason}` : state.has_conflict ? ' · Trùng lịch' : ' · Trống lịch';
          return { value: item.id, label: `${item.full_name} (${item.email || item.phone || '#' + item.id})${status}`,
            disabled: !!state?.is_already_enrolled };
        })}
      notFoundContent={loading ? <Spin size="small" /> : 'Không có học viên phù hợp'}
      popupRender={menu => <>{menu}<div className="p-2 border-t border-gray-100" onMouseDown={event => event.preventDefault()}>
        {onlyFree && <div className="text-xs text-gray-500">Lọc lịch trong trang kết quả hiện tại.</div>}
        <Pagination {...paginationProps('học viên', { current: page, pageSize: 20, total, size: 'small', showSizeChanger: false,
          disabled: loading, onChange: setPage })} />
      </div></>} />
  </>;
}
