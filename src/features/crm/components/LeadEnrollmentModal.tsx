import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Descriptions, Modal, Radio, Select, Space, message } from 'antd';
import dayjs from 'dayjs';
import { classService } from '@/services/api/class.service';
import { financeService } from '@/services/api/finance.service';
import { leadService } from '@/services/api/lead.service';
import { leadConvertBlockReason } from '../leadAssignment';
import { LEAD_ACTIONS, LEAD_MESSAGES } from '../leadStatus';
import { useAuth } from '@/shared/contexts/AuthContext';
import { getStudentPermissions } from '../../lms/studentPermissions';

type Enrollment = { class_id: number; status: string };

export function enrollmentClassOptions(classes: any[], courseId: number, enrollments: Enrollment[] = []) {
  return classes.filter(item => item.course_id === courseId && ['upcoming', 'ongoing'].includes(item.status)
    && !enrollments.some(enrollment => enrollment.class_id === item.id && enrollment.status !== 'dropped')).map(item => {
    const count = item._count?.classEnrollments || 0;
    return { value: item.id, label: `${item.name} · ${item.status === 'upcoming' ? 'Sắp mở' : 'Đang học'} · ${count}${item.max_students ? `/${item.max_students}` : ''} học viên`,
      disabled: !!item.max_students && count >= item.max_students };
  });
}

export function enrollmentSchedule(record: any) {
  const list = (value: unknown): any[] => {
    if (Array.isArray(value)) return value;
    try { const parsed = JSON.parse(String(value)); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };
  const labels = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const days = list(record.schedule_days).map(value => labels[Number(value)]).filter(Boolean).join(', ');
  const times = list(record.schedule_time).map(value => String(value).match(/(?:^|T)(\d{2}:\d{2})/)?.[1]).filter(Boolean).join(' – ');
  return [days, times].filter(Boolean).join(' · ') || 'Chưa có lịch học';
}

// The same class choice is used when converting a Lead and assigning their class later.
export function LeadEnrollmentModal({ open, lead, studentId, enrollments = [], onCancel, onSuccess }: {
  open: boolean; lead: any; studentId?: number; enrollments?: Enrollment[]; onCancel: () => void; onSuccess: (studentId: number) => void;
}) {
  const { user } = useAuth();
  const { assignClass } = getStudentPermissions(user?.role);
  const [mode, setMode] = useState('now');
  const [classId, setClassId] = useState<number>();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [fee, setFee] = useState<number>();
  const [loadError, setLoadError] = useState('');
  const [feeError, setFeeError] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const returning = !!studentId && enrollments.some(item => item.class_id === classId && item.status === 'dropped');

  useEffect(() => {
    if (!open) return;
    setMode(assignClass && lead?.course_id ? 'now' : 'later');
    setClassId(undefined); setError('');
  }, [open, lead?.id, studentId, assignClass]);

  useEffect(() => {
    let current = true;
    setClasses([]); setLoadError('');
    if (!open || !assignClass || !lead?.course_id) return;
    setLoading(true);
    (async () => {
      const first = await classService.getAll({ course_id: lead.course_id, page: 1, limit: 100 });
      let items = first.data || [];
      for (let page = 2; page <= Math.ceil((first.pagination?.total || 0) / 100); page++) {
        const next = await classService.getAll({ course_id: lead.course_id, page, limit: 100 });
        items = items.concat(next.data || []);
      }
      if (current) setClasses(items);
    })().catch(err => { if (current) setLoadError(err.message || 'Không tải được danh sách lớp'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [open, lead?.course_id, revision, assignClass]);

  useEffect(() => {
    let current = true;
    setFee(undefined); setFeeError(''); setFeeLoading(false);
    if (!open || !assignClass || mode !== 'now' || !classId || returning) return;
    setFeeLoading(true);
    financeService.getClassFeeTemplate(classId).then(res => { if (current) setFee(res.data.total_amount); })
      .catch(err => { if (current) setFeeError(err.message || 'Không tải được học phí của lớp'); })
      .finally(() => { if (current) setFeeLoading(false); });
    return () => { current = false; };
  }, [open, mode, classId, revision, assignClass, returning]);

  const options = enrollmentClassOptions(classes, lead?.course_id, studentId ? enrollments : []);
  const feeBlocked = !returning && (feeLoading || fee === undefined || !!feeError);
  const selectedClass = classes.find(item => item.id === classId);
  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (studentId && !assignClass) { setError('Chỉ Admin được xếp lớp cho học viên.'); return; }
    if (!studentId) {
      const reason = leadConvertBlockReason(lead);
      if (reason) { setError(reason); return; }
    }
    if (studentId && mode !== 'now') return;
    if (assignClass && mode === 'now' && (!classId || !options.some(item => item.value === classId && !item.disabled))) {
      setError('Vui lòng chọn lớp còn chỗ thuộc khóa quan tâm.'); return;
    }
    if (assignClass && mode === 'now' && (loading || loadError || feeBlocked)) return;
    submittingRef.current = true; setSubmitting(true); setError('');
    try {
      let id = studentId;
      if (studentId) {
        const response = await classService.enrollStudents(classId!, [studentId]);
        if (!response.data.successful?.includes(studentId)) throw new Error(response.data.failed?.[0]?.reason || 'Không xếp được lớp');
      } else {
        const response = await leadService.convert(lead.id, assignClass && mode === 'now' ? { class_id: classId } : {});
        id = response.data.id;
      }
      message.success(studentId ? 'Đã xếp lớp cho học viên' : LEAD_MESSAGES.converted);
      onSuccess(id!);
    } catch (err: any) { setError(err.message || LEAD_MESSAGES.convertFailed); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  return <Modal title={studentId ? 'Xếp lớp học viên' : LEAD_ACTIONS.convert} open={open}
    onCancel={() => { if (!submittingRef.current) onCancel(); }} cancelText="Hủy"
    okText={studentId ? 'Xếp lớp' : LEAD_ACTIONS.convert} onOk={handleSubmit} confirmLoading={submitting}
    cancelButtonProps={{ disabled: submitting }} closable={!submitting} maskClosable={!submitting}
    okButtonProps={{ disabled: (!!studentId && !assignClass) || (assignClass && mode === 'now' && (loading || feeBlocked || !!loadError || !classId)) }}>
    <Space direction="vertical" size={16} className="w-full">
      <Descriptions size="small" column={1} items={[
        { key: 'name', label: 'Họ tên', children: lead?.full_name },
        { key: 'course', label: 'Khóa quan tâm', children: lead?.course?.name || 'Chưa chọn khóa học' },
      ]} />
      {!studentId && assignClass && <Radio.Group value={mode} disabled={submitting} onChange={event => { setMode(event.target.value); setError(''); }}>
        <Radio value="now" disabled={!lead?.course_id}>Xếp lớp ngay</Radio><Radio value="later">Xếp lớp sau</Radio>
      </Radio.Group>}
      {assignClass && mode === 'now' ? <>
        <Select aria-label="Lớp học" className="w-full" placeholder="Chọn lớp thuộc khóa quan tâm" showSearch optionFilterProp="label"
          value={classId} options={options} loading={loading} disabled={submitting || loading}
          onChange={value => { setClassId(value); setFee(undefined); setFeeError(''); setError(''); }}
          notFoundContent={loading ? 'Đang tải…' : 'Chưa có lớp sắp mở hoặc đang học phù hợp để ghi danh'} />
        {selectedClass && <div className="text-sm text-gray-600">
          <div>Khai giảng: {selectedClass.start_date ? dayjs(selectedClass.start_date).format('DD/MM/YYYY') : 'Chưa có ngày khai giảng'}</div>
          <div>Lịch học: {enrollmentSchedule(selectedClass)}</div>
          {returning ? <div>Ghi danh lại: giữ nguyên học phí cũ, không tạo khoản thu mới.</div>
            : <div>Tổng phí theo bảng phí lớp: {feeLoading ? 'Đang tải…' : fee === undefined ? 'Chưa tải được' : `${Number(fee).toLocaleString('vi-VN')} đ`}</div>}
          {studentId && <div>Ghi danh lại lớp đã nghỉ sẽ giữ nguyên học phí cũ, không tự tạo khoản thu mới. Khi xếp lớp mới, khoản học phí từ Lead cho cùng khóa sẽ được giữ nguyên và liên kết với lớp.</div>}
        </div>}
        {(loadError || (!returning && feeError)) && <Alert type="error" showIcon message={loadError || feeError}
          action={<Button size="small" disabled={submitting} onClick={() => setRevision(value => value + 1)}>Thử lại</Button>} />}
      </> : <Alert type="info" showIcon message={assignClass
        ? 'Tạo hồ sơ học viên, chưa xếp lớp và chưa tạo khoản phải thu. Bạn có thể xếp lớp từ hồ sơ học viên sau.'
        : 'Chuyển Lead thành học viên để chờ Admin xếp lớp. Bước này chưa tạo khoản phải thu.'} />}
      {assignClass && !lead?.course_id && <Alert type="info" showIcon message="Lead chưa có khóa quan tâm. Bổ sung khóa học trước khi xếp lớp." />}
      {error && <Alert type="error" showIcon message={error} />}
    </Space>
  </Modal>;
}
