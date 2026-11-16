import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Table, Button, Space, Select, Input, message } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router';
import { PageHeader } from '../../shared/components/PageHeader';
import { RiskEstimate, SupportPriority, RiskDetailsDrawer, riskTime } from '../../shared/components/DropoutRisk';
import { supportLevels, studentRiskLink } from '../../shared/utils/dropoutRisk';
import { classService } from '@/services/api/class.service';
import { studentService } from '@/services/api/student.service';
import { useDetailNavigation } from '../../shared/hooks/useDetailNavigation';
import { useAuth } from '../../shared/contexts/AuthContext';
import { readDropoutLocation, writeDropoutLocation, filterDropoutRows, dropoutPageSizes, type DropoutRow } from './dropoutFilters';

type ClassOption = { id: number; name: string; status: string };

export function AIPredictionsPage() {
  const { openDetail, navigationState } = useDetailNavigation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => readDropoutLocation(params), [params]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [rows, setRows] = useState<DropoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [scoring, setScoring] = useState(false);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const scoringRef = useRef(false);
  const selectedClass = classes.find(item => item.id === view.classId);
  const selected = rows.find(item => item.class_id === view.riskClassId && item.student_id === view.riskStudentId);
  const updateView = (changes: Partial<typeof view>) => setParams(writeDropoutLocation({ ...view, ...changes }), { replace: true, state: navigationState });
  const openRisk = (row: DropoutRow) => updateView({ riskClassId: row.class_id, riskStudentId: row.student_id });
  const closeRisk = () => updateView({ riskClassId: undefined, riskStudentId: undefined });

  useEffect(() => {
    let current = true;
    setClasses([]);
    if (!user) return;
    const loadClasses = async () => {
      const response = user.role === 'teacher' ? await classService.getMyClasses()
        : await classService.getAll({ status: 'ongoing', page: 1, limit: 100 });
      let items: ClassOption[] = response.data || [];
      if (user.role !== 'teacher') for (let page = 2; page <= Math.ceil((response.pagination?.total || 0) / 100); page++) {
        const next = await classService.getAll({ status: 'ongoing', page, limit: 100 });
        items = items.concat(next.data || []);
      }
      if (current) setClasses(items.filter(item => item.status === 'ongoing'));
    };
    loadClasses().catch(() => { if (current) message.error('Không tải được danh sách lớp'); });
    return () => { current = false; };
  }, [user?.id, user?.role, revision]);

  useEffect(() => {
    const token = ++request.current;
    setLoading(true); setLoadError(''); setRows([]);
    classService.getDropoutAlerts(view.classId).then(response => {
      if (token === request.current) setRows(response.data || []);
    }).catch(error => { if (token === request.current) setLoadError(error.message || 'Không tải được cảnh báo bỏ học'); })
      .finally(() => { if (token === request.current) setLoading(false); });
    return () => { request.current++; };
  }, [view.classId, revision, user?.id, user?.role]);

  const evaluate = async (row?: DropoutRow) => {
    const classId = row?.class_id || selectedClass?.id;
    if (!classId || scoringRef.current) return;
    const token = request.current;
    scoringRef.current = true; setScoring(true);
    try {
      if (row) {
        const response = await studentService.scoreDropoutRisk(row.student_id, classId);
        if (!response.data) throw new Error(response.reason || 'Lớp không còn trong giai đoạn theo dõi');
      } else {
        const response = await classService.scoreDropoutRisk(classId);
        const failed = (response.data || []).filter((item: any) => !item.success).length;
        if (failed) message.warning(`${failed} học viên chưa đánh giá được. Vui lòng thử lại.`);
      }
      if (token === request.current) setRevision(value => value + 1);
    } catch (error: any) { message.error(error.message || 'Không đánh giá được'); }
    finally { scoringRef.current = false; setScoring(false); }
  };

  const data = useMemo(() => filterDropoutRows(rows, view.riskLevel, view.search), [rows, view.riskLevel, view.search]);
  const page = Math.min(view.page, Math.max(1, Math.ceil(data.length / view.pageSize)));
  const columns: ColumnsType<DropoutRow> = [
    { title: 'Học viên', key: 'student', render: (_, row) => <Space direction="vertical" size={0}>
      <Button type="link" style={{ padding: 0 }} onClick={() => openDetail(studentRiskLink(row.student_id, row.class_id))}>{row.full_name}</Button>
      <span className="text-xs text-gray-500">{row.email || '—'}</span>
    </Space> },
    { title: 'Lớp học', key: 'class', render: (_, row) => <Button type="link" style={{ padding: 0 }}
      onClick={() => openDetail(`/lms/classes/${row.class_id}?tab=students`)}>{row.class_name}</Button> },
    { title: 'Nguy cơ bỏ học', key: 'score', width: 190, render: (_, row) => <RiskEstimate data={row} showReason={false} onOpen={() => openRisk(row)} /> },
    { title: 'Mức cần hỗ trợ', key: 'priority', width: 180, render: (_, row) => <SupportPriority data={row} /> },
    { title: 'Cập nhật', key: 'updated', width: 180, render: (_, row) => <span className="text-gray-500">{riskTime(row.evaluated_at)}</span> },
  ];
  return <div>
    <PageHeader title="Cảnh báo bỏ học" breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'AI & Insights' }, { title: 'Cảnh báo bỏ học' }]}
      actions={<Button icon={<ReloadOutlined />} onClick={() => setRevision(value => value + 1)} disabled={scoring} loading={loading}>Làm mới</Button>} />
    <div className="bg-white p-6 rounded-lg shadow-sm">
      {loadError && <Alert className="mb-4" type="error" showIcon message={loadError}
        action={<Button size="small" onClick={() => setRevision(value => value + 1)}>Thử lại</Button>} />}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select placeholder="Tất cả lớp đang học" aria-label="Lớp cần theo dõi" allowClear showSearch optionFilterProp="label"
          style={{ minWidth: 280 }} value={view.classId} disabled={scoring}
          onChange={classId => updateView({ classId, page: 1, riskClassId: undefined, riskStudentId: undefined })}
          options={classes.map(item => ({ value: item.id, label: item.name }))} />
        <Button type="primary" disabled={!selectedClass || loading} loading={scoring} onClick={() => evaluate()}>Đánh giá lớp</Button>
        <Input prefix={<SearchOutlined />} placeholder="Tìm tên, email học viên hoặc lớp" allowClear value={view.search}
          onChange={event => updateView({ search: event.target.value, page: 1 })} style={{ width: 300 }} />
        <Select placeholder="Tất cả mức hỗ trợ" style={{ width: 240 }} allowClear value={view.riskLevel}
          onChange={riskLevel => updateView({ riskLevel, page: 1 })}
          options={[{ value: 'attention', label: 'Cần liên hệ hoặc theo dõi' }, ...Object.entries(supportLevels).map(([value, item]) => ({ value, label: item.label })),
            { value: 'pending', label: 'Chưa đánh giá / chưa đủ dữ liệu' }]} />
      </div>
      <div className="mb-3 text-xs text-gray-500">Mỗi dòng là một học viên trong một lớp đang học; học viên học nhiều lớp có thể xuất hiện nhiều lần.</div>
      <Table columns={columns} dataSource={data} rowKey={row => `${row.class_id}:${row.student_id}`} loading={loading} scroll={{ x: 960 }}
        locale={{ emptyText: loadError ? 'Chưa tải được cảnh báo' : 'Không có học viên phù hợp trong các lớp được theo dõi' }}
        pagination={{ current: page, pageSize: view.pageSize, pageSizeOptions: dropoutPageSizes, showSizeChanger: true,
          showTotal: total => `${total} trường hợp theo lớp`, onChange: (nextPage, pageSize) => updateView({ page: pageSize === view.pageSize ? nextPage : 1, pageSize }) }} />
    </div>
    <RiskDetailsDrawer open={!!selected} onClose={closeRisk} name={selected?.full_name} className={selected?.class_name}
      data={selected} loading={scoring} onEvaluate={selected ? () => evaluate(selected) : undefined}
      onProfile={selected ? () => openDetail(studentRiskLink(selected.student_id, selected.class_id)) : undefined} />
  </div>;
}
