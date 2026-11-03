import { useEffect, useMemo, useRef, useState } from 'react';
import { Table, Button, Space, Select, Input, message } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { RiskEstimate, SupportPriority, RiskDetailsDrawer, riskTime } from '../../shared/components/DropoutRisk';
import { supportLevels, supportOrder, type DropoutRiskView } from '../../shared/utils/dropoutRisk';
import { classService } from '@/services/api/class.service';
import { studentService } from '@/services/api/student.service';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { useAuth } from '../../shared/contexts/AuthContext';

type ClassOption = { id: number; name: string; status: string };
type StudentRow = { id: number; full_name: string; email?: string; risk?: DropoutRiskView };

export function AIPredictionsPage() {
  const { openDetail, navigationState } = useDetailNavigation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const request = useRef(0);
  const [revision, setRevision] = useState(0);
  const classId = Number(params.get('class_id')) || undefined;
  const selectedClass = classes.find(item => item.id === classId);
  const selected = students.find(item => item.id === selectedId);

  useEffect(() => {
    let current = true;
    if (!user) return;
    const loadClasses = async () => {
      try {
        const response = user.role === 'teacher' ? await classService.getMyClasses()
          : await classService.getAll({ status: 'ongoing', page: 1, limit: 100 });
        let items: ClassOption[] = response.data || [];
        // Fetch remaining pages rather than silently omitting larger centers.
        if (user.role !== 'teacher') for (let page = 2; page <= Math.ceil((response.pagination?.total || 0) / 100); page++) {
          const next = await classService.getAll({ status: 'ongoing', page, limit: 100 });
          items = items.concat(next.data || []);
        }
        if (current) setClasses(items.filter(item => item.status === 'ongoing'));
      } catch { if (current) message.error('Không tải được danh sách lớp'); }
    };
    loadClasses();
    return () => { current = false; };
  }, [user?.id, user?.role]);

  useEffect(() => {
    const token = ++request.current;
    setSelectedId(null);
    setStudents([]);
    setLoading(false);
    if (!selectedClass) return;
    setLoading(true);
    Promise.all([classService.getById(selectedClass.id), classService.getDropoutRisk(selectedClass.id)])
      .then(([details, snapshots]) => {
        if (token !== request.current) return;
        const risks = new Map<number, DropoutRiskView>((snapshots.data || []).map((item: DropoutRiskView) => [item.student_id!, item]));
        setStudents((details.data?.classEnrollments || []).filter((item: any) => item.status === 'active')
          .map((item: any) => ({ id: item.student_id, full_name: item.student?.full_name || 'Học viên', email: item.student?.email,
            risk: risks.get(item.student_id) })));
      }).catch(error => { if (token === request.current) message.error(error.message || 'Không tải được đánh giá'); })
      .finally(() => { if (token === request.current) setLoading(false); });
    return () => { request.current++; };
  }, [selectedClass?.id, revision]);

  const evaluate = async (studentId?: number) => {
    if (!selectedClass) return;
    const token = request.current;
    try {
      setScoring(true);
      if (studentId) {
        const result = await studentService.scoreDropoutRisk(studentId, selectedClass.id);
        if (!result.data) throw new Error(result.reason || 'Lớp không còn trong giai đoạn theo dõi');
        if (token === request.current) setStudents(previous => previous.map(item => item.id === studentId
          ? { ...item, risk: { ...result.data, limited_data: result.data?.snapshot?.limited_data } } : item));
      } else {
        const response = await classService.scoreDropoutRisk(selectedClass.id);
        const failed = (response.data || []).filter((item: any) => !item.success).length;
        if (failed) message.warning(`${failed} học viên chưa đánh giá được. Vui lòng thử lại.`);
        if (token === request.current) setRevision(value => value + 1);
      }
    } catch (error: any) { message.error(error.message || 'Không đánh giá được'); }
    finally { setScoring(false); }
  };

  const data = useMemo(() => students
    .filter(student => !riskFilter || (riskFilter === 'pending' ? !student.risk?.risk_level : student.risk?.risk_level === riskFilter))
    .filter(student => `${student.full_name} ${student.email || ''}`.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')))
    .sort((a, b) => supportOrder(b.risk) - supportOrder(a.risk) || (b.risk?.risk_score ?? -1) - (a.risk?.risk_score ?? -1)),
  [students, riskFilter, search]);
  const columns: ColumnsType<StudentRow> = [
    { title: 'Học viên', key: 'student', render: (_, row) => <Space direction="vertical" size={0}>
      <Button type="link" style={{ padding: 0 }} onClick={() => openDetail(`/lms/students/${row.id}?tab=classes`)}>{row.full_name}</Button>
      <span className="text-xs text-gray-500">{row.email || '—'}</span>
    </Space> },
    { title: 'Nguy cơ bỏ học', key: 'score', width: 190, render: (_, row) => <RiskEstimate data={row.risk} showReason={false} onOpen={() => setSelectedId(row.id)} /> },
    { title: 'Mức cần hỗ trợ', key: 'priority', width: 180, render: (_, row) => <SupportPriority data={row.risk} /> },
    { title: 'Cập nhật', key: 'updated', width: 180, render: (_, row) => <span className="text-gray-500">{riskTime(row.risk?.evaluated_at)}</span> },
  ];
  return <div>
    <PageHeader title="Cảnh báo bỏ học" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'AI & Insights' }, { title: 'Cảnh báo bỏ học' }]}
      actions={<Button icon={<ReloadOutlined />} onClick={() => setRevision(value => value + 1)} disabled={!selectedClass || scoring} loading={loading}>Làm mới</Button>} />
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select placeholder="Chọn lớp học" aria-label="Lớp cần đánh giá" showSearch optionFilterProp="label" style={{ minWidth: 280 }} value={classId}
          onChange={value => setParams(previous => { const next = new URLSearchParams(previous); next.set('class_id', String(value)); return next; }, { replace: true, state: navigationState })}
          options={classes.map(item => ({ value: item.id, label: item.name }))} />
        <Button type="primary" disabled={!selectedClass || loading} loading={scoring} onClick={() => evaluate()}>Đánh giá lớp</Button>
      </div>
      {selectedClass && <div className="mb-4 flex flex-wrap gap-3">
        <Input prefix={<SearchOutlined />} placeholder="Tìm tên hoặc email học viên" allowClear value={search} onChange={event => setSearch(event.target.value)} style={{ width: 300 }} />
        <Select placeholder="Tất cả mức hỗ trợ" style={{ width: 220 }} allowClear value={riskFilter} onChange={setRiskFilter}
          options={[...Object.entries(supportLevels).map(([value, item]) => ({ value, label: item.label })), { value: 'pending', label: 'Chưa đánh giá / chưa đủ dữ liệu' }]} />
      </div>}
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 760 }}
        locale={{ emptyText: selectedClass ? 'Không có học viên phù hợp' : 'Chọn lớp để xem cảnh báo của học viên trong lớp đó' }}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: total => `${total} học viên` }} />
    </div>
    <RiskDetailsDrawer open={!!selected} onClose={() => setSelectedId(null)} name={selected?.full_name} className={selectedClass?.name}
      data={selected?.risk} loading={scoring} onEvaluate={selected ? () => evaluate(selected.id) : undefined}
      onProfile={selected ? () => openDetail(`/lms/students/${selected.id}?tab=classes`) : undefined} />
  </div>;
}
